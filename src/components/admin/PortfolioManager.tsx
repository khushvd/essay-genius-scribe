import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, Upload, Edit, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { BulkUploadDialog } from "./BulkUploadDialog";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const PortfolioManager = () => {
  const [successfulEssays, setSuccessfulEssays] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParsedData, setAiParsedData] = useState<any>(null);
  const [essayFile, setEssayFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [questionnaireFile, setQuestionnaireFile] = useState<File | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const [formData, setFormData] = useState({
    college_id: "",
    programme_id: "",
    essay_title: "",
    essay_content: "",
    writer_resume: "",
    writer_questionnaire: "",
    performance_score: 85,
    key_strategies: "",
    degree_level: "bachelors"
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [essaysRes, collegesRes] = await Promise.all([
        supabase.from('successful_essays').select('*, colleges(name), programmes(name)').order('created_at', { ascending: false }),
        supabase.from('colleges').select('*').order('name')
      ]);

      if (essaysRes.error) throw essaysRes.error;
      if (collegesRes.error) throw collegesRes.error;

      setSuccessfulEssays(essaysRes.data || []);
      setColleges(collegesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to load data");
    }
  };

  const fetchProgrammes = async (collegeId: string) => {
    try {
      const { data, error } = await supabase
        .from('programmes')
        .select('*')
        .eq('college_id', collegeId)
        .order('name');

      if (error) throw error;
      setProgrammes(data || []);
    } catch (error) {
      console.error('Error fetching programmes:', error);
    }
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    try {
      let text = "";
      
      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (file.type === "text/plain") {
        text = await file.text();
      }

      return text;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  };

  const handleAiParse = async () => {
    if (!essayFile) {
      toast.error("Please upload an essay file");
      return;
    }

    setAiParsing(true);
    try {
      const essayContent = await handleFileUpload(essayFile);
      const resumeContent = resumeFile ? await handleFileUpload(resumeFile) : null;
      const questionnaireContent = questionnaireFile ? await handleFileUpload(questionnaireFile) : null;

      const { data, error } = await supabase.functions.invoke('parse-portfolio-essay', {
        body: { essayContent, resumeContent, questionnaireContent }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAiParsedData(data);
      
      // Pre-fill form with AI parsed data
      setFormData({
        college_id: data.college_id || '',
        programme_id: data.programme_id || '',
        essay_title: data.essay_title || '',
        essay_content: data.essay_content || '',
        writer_resume: data.writer_resume || '',
        writer_questionnaire: JSON.stringify(data.writer_questionnaire || {}, null, 2),
        performance_score: data.suggested_score || 85,
        key_strategies: data.key_strategies?.join('\n') || '',
        degree_level: data.degree_level || 'bachelors'
      });

      // Fetch programmes if college was matched
      if (data.college_id) {
        fetchProgrammes(data.college_id);
      }

      // Show verification status
      let message = "Parsing complete! Review and edit the data below.";
      if (data.search_used) {
        message += " (Verified names via web search)";
      }
      if (data.college_id && data.programme_id) {
        message = "Parsing complete! College and programme auto-matched in database.";
      } else if (data.college_id) {
        message = "Parsing complete! College auto-matched. Programme not found in database.";
      }
      
      toast.success(message);
    } catch (error: any) {
      console.error('Error parsing:', error);
      toast.error(error.message || "Failed to parse");
    } finally {
      setAiParsing(false);
    }
  };

  const handleManualFileUpload = async (file: File, field: 'essay_content' | 'writer_resume') => {
    try {
      const text = await handleFileUpload(file);
      setFormData(prev => ({ ...prev, [field]: text }));
      toast.success(`${field === 'essay_content' ? 'Essay' : 'Resume'} uploaded successfully`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Failed to upload file");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const strategiesArray = formData.key_strategies
        .split('\n')
        .filter(s => s.trim())
        .map(s => s.trim());

      let questionnaireData = null;
      if (formData.writer_questionnaire) {
        try {
          questionnaireData = JSON.parse(formData.writer_questionnaire);
        } catch {
          toast.error("Invalid questionnaire JSON format");
          setLoading(false);
          return;
        }
      }

      const essayData = {
        college_id: formData.college_id || null,
        programme_id: formData.programme_id || null,
        essay_title: formData.essay_title,
        essay_content: formData.essay_content,
        writer_resume: formData.writer_resume || null,
        writer_questionnaire: questionnaireData,
        performance_score: formData.performance_score,
        key_strategies: strategiesArray,
        degree_level: formData.degree_level
      };

      let error;
      
      if (isEditing && editingId) {
        const result = await supabase
          .from('successful_essays')
          .update(essayData)
          .eq('id', editingId);
        error = result.error;
        
        if (!error) {
          toast.success("Essay updated successfully");
        }
      } else {
        const result = await supabase
          .from('successful_essays')
          .insert(essayData);
        error = result.error;
        
        if (!error) {
          toast.success("Successful essay added to portfolio");
        }
      }

      if (error) throw error;

      handleCancelEdit();
      fetchData();
    } catch (error) {
      console.error('Error saving essay:', error);
      toast.error(isEditing ? "Failed to update essay" : "Failed to add essay");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (essay: any) => {
    setEditingId(essay.id);
    setIsEditing(true);
    setFormData({
      college_id: essay.college_id || "",
      programme_id: essay.programme_id || "",
      essay_title: essay.essay_title || "",
      essay_content: essay.essay_content || "",
      writer_resume: essay.writer_resume || "",
      writer_questionnaire: essay.writer_questionnaire ? JSON.stringify(essay.writer_questionnaire, null, 2) : "",
      performance_score: essay.performance_score || 85,
      key_strategies: Array.isArray(essay.key_strategies) ? essay.key_strategies.join('\n') : "",
      degree_level: essay.degree_level || "bachelors"
    });
    
    if (essay.college_id) {
      fetchProgrammes(essay.college_id);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsEditing(false);
    setFormData({
      college_id: "",
      programme_id: "",
      essay_title: "",
      essay_content: "",
      writer_resume: "",
      writer_questionnaire: "",
      performance_score: 85,
      key_strategies: "",
      degree_level: "bachelors"
    });
    setAiParsedData(null);
    setEssayFile(null);
    setResumeFile(null);
    setQuestionnaireFile(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this essay?")) return;

    try {
      const { error } = await supabase.from('successful_essays').delete().eq('id', id);
      if (error) throw error;
      
      toast.success("Essay deleted");
      fetchData();
    } catch (error) {
      console.error('Error deleting essay:', error);
      toast.error("Failed to delete essay");
    }
  };

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif">Portfolio Management</h2>
        <Button onClick={() => setBulkUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {isEditing ? "Edit Essay" : "Add Winning Essay"}
          </h3>
          {aiParsedData && !isEditing && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Auto-parsed
            </Badge>
          )}
        </div>

        {/* Auto-Parse Upload Section */}
        <div className="bg-gradient-subtle rounded-lg p-6 mb-6 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Auto-Parse (Recommended)</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Upload documents and automatically extract all the data
          </p>

          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <div className="space-y-2">
              <Label htmlFor="essay-file">Essay Document *</Label>
              <Input
                id="essay-file"
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setEssayFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resume-file">Resume/CV (Optional)</Label>
              <Input
                id="resume-file"
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="questionnaire-file">Questionnaire (Optional)</Label>
              <Input
                id="questionnaire-file"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setQuestionnaireFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={handleAiParse}
            disabled={!essayFile || aiParsing}
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {aiParsing ? "Auto-parsing..." : "Auto-parse"}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="essay-title">Essay Title *</Label>
            <Input
              id="essay-title"
              value={formData.essay_title}
              onChange={(e) => setFormData(prev => ({ ...prev, essay_title: e.target.value }))}
              required
            />
            {aiParsedData && (
              <p className="text-xs text-muted-foreground">
                Suggested: {aiParsedData.college_name} - {aiParsedData.programme_name}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="college">College (Optional)</Label>
              <Select
                value={formData.college_id}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, college_id: value }));
                  fetchProgrammes(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((college) => (
                    <SelectItem key={college.id} value={college.id}>
                      {college.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="programme">Programme (Optional)</Label>
              <Select
                value={formData.programme_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, programme_id: value }))}
                disabled={!formData.college_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select programme" />
                </SelectTrigger>
                <SelectContent>
                  {programmes.map((programme) => (
                    <SelectItem key={programme.id} value={programme.id}>
                      {programme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="degree-level">Degree Level</Label>
              <Select
                value={formData.degree_level}
                onValueChange={(value) => setFormData(prev => ({ ...prev, degree_level: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bachelors">Bachelors</SelectItem>
                  <SelectItem value="masters">Masters</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Essay Content</Label>
            <Input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => e.target.files?.[0] && handleManualFileUpload(e.target.files[0], 'essay_content')}
              className="mb-2"
            />
            <Textarea
              value={formData.essay_content}
              onChange={(e) => setFormData({ ...formData, essay_content: e.target.value })}
              rows={6}
              placeholder="Paste essay content or upload file above"
              required
            />
          </div>

          <div>
            <Label>Writer's Resume/CV (Optional)</Label>
            <Input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => e.target.files?.[0] && handleManualFileUpload(e.target.files[0], 'writer_resume')}
              className="mb-2"
            />
            <Textarea
              value={formData.writer_resume}
              onChange={(e) => setFormData({ ...formData, writer_resume: e.target.value })}
              rows={4}
              placeholder="Paste resume content or upload file above"
            />
          </div>

          <div>
            <Label>Writer's Questionnaire (Optional, JSON format)</Label>
            <Textarea
              value={formData.writer_questionnaire}
              onChange={(e) => setFormData({ ...formData, writer_questionnaire: e.target.value })}
              rows={3}
              placeholder='{"academicInterests": "...", "extracurriculars": "...", "careerGoals": "..."}'
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Performance Score (0-100)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.performance_score}
                onChange={(e) => setFormData({ ...formData, performance_score: parseInt(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label>Key Strategies (one per line)</Label>
              <Textarea
                value={formData.key_strategies}
                onChange={(e) => setFormData({ ...formData, key_strategies: e.target.value })}
                rows={3}
                placeholder="Strategy 1&#10;Strategy 2&#10;Strategy 3"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !formData.essay_content || !formData.essay_title}>
              {isEditing ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {loading ? "Updating..." : "Update Essay"}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {loading ? "Adding..." : (aiParsedData ? "Add Parsed Essay to Portfolio" : "Add to Portfolio")}
                </>
              )}
            </Button>
            
            {isEditing && (
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                Cancel Edit
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Portfolio Essays ({successfulEssays.length})</h3>
        <div className="space-y-3">
          {successfulEssays.map((essay) => (
            <div key={essay.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex-1">
                <p className="font-medium">{essay.essay_title || "Untitled"}</p>
                <p className="text-sm text-muted-foreground">
                  {essay.colleges?.name} - {essay.programmes?.name} (Score: {essay.performance_score})
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(essay)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(essay.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
    
    <BulkUploadDialog
      open={bulkUploadOpen}
      onOpenChange={setBulkUploadOpen}
      onSuccess={fetchData}
    />
    </>
  );
};
