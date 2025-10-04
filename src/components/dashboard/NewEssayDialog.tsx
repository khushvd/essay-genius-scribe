import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import mammoth from "mammoth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ChevronDown, Upload, FileText, X } from "lucide-react";

interface NewEssayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const NewEssayDialog = ({ open, onOpenChange, userId }: NewEssayDialogProps) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [degreeLevel, setDegreeLevel] = useState<"bachelors" | "masters">("bachelors");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [collegeId, setCollegeId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [isCustomCollege, setIsCustomCollege] = useState(false);
  const [customCollegeName, setCustomCollegeName] = useState("");
  const [customProgrammeName, setCustomProgrammeName] = useState("");
  const [colleges, setColleges] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [questionnaireData, setQuestionnaireData] = useState({
    academicInterests: "",
    extracurriculars: "",
    careerGoals: "",
    challenges: "",
  });
  const [loading, setLoading] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);

  useEffect(() => {
    const fetchColleges = async () => {
      let query = supabase
        .from("colleges")
        .select("*")
        .order("name");
      
      if (selectedCountry !== "all") {
        query = query.eq("country", selectedCountry);
      }
      
      const { data } = await query;
      if (data) setColleges(data);
    };

    fetchColleges();
  }, [selectedCountry]);

  useEffect(() => {
    const fetchProgrammes = async () => {
      if (!collegeId) {
        setProgrammes([]);
        return;
      }

      const { data } = await supabase
        .from("programmes")
        .select("*")
        .eq("college_id", collegeId)
        .order("name");
      
      if (data) setProgrammes(data);
    };

    fetchProgrammes();
  }, [collegeId]);

  const handleFileUpload = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setContent(result.value);
      setUploadedFile(file);
      toast.success("Document uploaded successfully!");
    } catch (error) {
      toast.error("Failed to parse document. Please try copying the text instead.");
    }
  };

  const handleResumeUpload = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setCvText(result.value);
      setResumeFile(file);
      toast.success("Resume uploaded successfully!");
    } catch (error) {
      toast.error("Failed to parse resume. Please try pasting the text instead.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error("Please provide essay content either by typing or uploading a document.");
      return;
    }

    if (isCustomCollege && !customCollegeName.trim()) {
      toast.error("Please enter a college name.");
      return;
    }

    setLoading(true);

    try {
      // Prepare CV data
      const cvData = cvText.trim() ? { text: cvText, source: resumeFile ? "file" : "manual" } : null;
      
      // Prepare questionnaire data (only include non-empty fields)
      const filteredQuestionnaire = Object.entries(questionnaireData).reduce((acc, [key, value]) => {
        if (value.trim()) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const { data, error } = await supabase
        .from("essays")
        .insert({
          writer_id: userId,
          title,
          content,
          degree_level: degreeLevel,
          college_id: isCustomCollege ? null : (collegeId || null),
          programme_id: isCustomCollege ? null : (programmeId || null),
          custom_college_name: isCustomCollege ? customCollegeName : null,
          custom_programme_name: isCustomCollege && customProgrammeName ? customProgrammeName : null,
          cv_data: cvData,
          questionnaire_data: Object.keys(filteredQuestionnaire).length > 0 ? filteredQuestionnaire : null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Essay created successfully!");
      onOpenChange(false);
      navigate(`/editor/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Create New Essay</DialogTitle>
          <DialogDescription>
            Start a new essay draft for your college application
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Essay Prompt (if any)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Describe a challenge you overcame..."
            />
          </div>

          <div className="space-y-2">
            <Label>Degree Level</Label>
            <Select value={degreeLevel} onValueChange={(value: "bachelors" | "masters") => setDegreeLevel(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="bachelors">Bachelor's</SelectItem>
                <SelectItem value="masters">Master's</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="CommonApp">CommonApp (Bachelor's)</SelectItem>
                <SelectItem value="USA">USA</SelectItem>
                <SelectItem value="UK">UK</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="college">College</Label>
              {isCustomCollege ? (
                <div className="space-y-2">
                  <Input
                    value={customCollegeName}
                    onChange={(e) => setCustomCollegeName(e.target.value)}
                    placeholder="Enter college name"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCustomCollege(false);
                      setCustomCollegeName("");
                      setCustomProgrammeName("");
                    }}
                  >
                    Switch to dropdown
                  </Button>
                </div>
              ) : (
                <Select value={collegeId} onValueChange={(value) => {
                  if (value === "custom") {
                    setIsCustomCollege(true);
                    setCollegeId("");
                  } else {
                    setCollegeId(value);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select college" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {colleges.map((college) => (
                      <SelectItem key={college.id} value={college.id}>
                        {college.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Other (Manual Input)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="programme">Programme</Label>
              {isCustomCollege ? (
                <Input
                  value={customProgrammeName}
                  onChange={(e) => setCustomProgrammeName(e.target.value)}
                  placeholder="Enter programme name (optional)"
                />
              ) : (
                <Select 
                  value={programmeId} 
                  onValueChange={setProgrammeId}
                  disabled={!collegeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select programme" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {programmes.map((programme) => (
                      <SelectItem key={programme.id} value={programme.id}>
                        {programme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <Collapsible open={resumeOpen} onOpenChange={setResumeOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                <span>Student's Resume/Background (Optional)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${resumeOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Upload a resume or paste key details to personalize feedback
              </p>
              
              {resumeFile ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm flex-1">{resumeFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setResumeFile(null);
                      setCvText("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="resume-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-md p-6 hover:border-primary transition-colors text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload resume (PDF, DOCX)
                      </p>
                    </div>
                  </Label>
                  <Input
                    id="resume-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleResumeUpload(file);
                    }}
                  />
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or paste text</span>
                </div>
              </div>

              <Textarea
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Paste resume/CV content here..."
                rows={4}
              />
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={questionnaireOpen} onOpenChange={setQuestionnaireOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                <span>Background Questionnaire (Optional)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${questionnaireOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Help us understand your story better for more personalized feedback
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="academic-interests">Academic Interests</Label>
                <Textarea
                  id="academic-interests"
                  value={questionnaireData.academicInterests}
                  onChange={(e) => setQuestionnaireData(prev => ({ ...prev, academicInterests: e.target.value }))}
                  placeholder="What subjects or fields excite you most?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="extracurriculars">Extracurricular Activities</Label>
                <Textarea
                  id="extracurriculars"
                  value={questionnaireData.extracurriculars}
                  onChange={(e) => setQuestionnaireData(prev => ({ ...prev, extracurriculars: e.target.value }))}
                  placeholder="Key activities, clubs, sports, volunteering..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="career-goals">Career Goals</Label>
                <Textarea
                  id="career-goals"
                  value={questionnaireData.careerGoals}
                  onChange={(e) => setQuestionnaireData(prev => ({ ...prev, careerGoals: e.target.value }))}
                  placeholder="What are your professional aspirations?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="challenges">Personal Challenges or Growth Moments</Label>
                <Textarea
                  id="challenges"
                  value={questionnaireData.challenges}
                  onChange={(e) => setQuestionnaireData(prev => ({ ...prev, challenges: e.target.value }))}
                  placeholder="Significant challenges you've overcome or pivotal growth experiences..."
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <Label>Initial Draft</Label>
            <Tabs defaultValue="paste" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste">Paste Text</TabsTrigger>
                <TabsTrigger value="upload">Upload Document</TabsTrigger>
              </TabsList>
              
              <TabsContent value="paste" className="space-y-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing your essay here..."
                  rows={8}
                  required={!uploadedFile}
                />
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-2">
                {uploadedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm flex-1">{uploadedFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadedFile(null);
                          setContent("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={8}
                      placeholder="Extracted content will appear here. You can edit it."
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="essay-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-md p-12 hover:border-primary transition-colors text-center">
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Click to upload your essay draft
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports .doc and .docx files (max 5MB)
                        </p>
                      </div>
                    </Label>
                    <Input
                      id="essay-upload"
                      type="file"
                      accept=".doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error("File size must be less than 5MB");
                            return;
                          }
                          handleFileUpload(file);
                        }
                      }}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Essay"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
