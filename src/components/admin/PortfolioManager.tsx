import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const PortfolioManager = () => {
  const [successfulEssays, setSuccessfulEssays] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleFileUpload = async (file: File, field: 'essay_content' | 'writer_resume') => {
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
      }

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
      const { error } = await supabase.from('successful_essays').insert({
        college_id: formData.college_id,
        programme_id: formData.programme_id,
        essay_title: formData.essay_title,
        essay_content: formData.essay_content,
        writer_resume: formData.writer_resume || null,
        writer_questionnaire: formData.writer_questionnaire ? JSON.parse(formData.writer_questionnaire) : null,
        performance_score: formData.performance_score,
        key_strategies: formData.key_strategies ? JSON.parse(formData.key_strategies) : null,
        degree_level: formData.degree_level
      });

      if (error) throw error;

      toast.success("Successful essay added to portfolio");
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
      fetchData();
    } catch (error) {
      console.error('Error adding essay:', error);
      toast.error("Failed to add essay");
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-serif">Portfolio Management</h2>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Add Winning Essay</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>College</Label>
              <Select
                value={formData.college_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, college_id: value });
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

            <div>
              <Label>Programme</Label>
              <Select
                value={formData.programme_id}
                onValueChange={(value) => setFormData({ ...formData, programme_id: value })}
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
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Essay Title</Label>
              <Input
                value={formData.essay_title}
                onChange={(e) => setFormData({ ...formData, essay_title: e.target.value })}
                placeholder="e.g., My Journey to Computer Science"
              />
            </div>

            <div>
              <Label>Degree Level</Label>
              <Select
                value={formData.degree_level}
                onValueChange={(value) => setFormData({ ...formData, degree_level: value })}
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
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'essay_content')}
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
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'writer_resume')}
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
              <Label>Key Strategies (JSON format)</Label>
              <Textarea
                value={formData.key_strategies}
                onChange={(e) => setFormData({ ...formData, key_strategies: e.target.value })}
                rows={2}
                placeholder='["Strategy 1", "Strategy 2"]'
              />
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            <Plus className="w-4 h-4 mr-2" />
            Add Essay
          </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(essay.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
