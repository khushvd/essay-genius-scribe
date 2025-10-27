import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { z } from "zod";
import { EssayUploadParser } from "@/components/editor/EssayUploadParser";
import { EssayDetailsForm } from "./essay-creation/EssayDetailsForm";
import { ResumeSection } from "./essay-creation/ResumeSection";
import { QuestionnaireSection } from "./essay-creation/QuestionnaireSection";

// Validation schemas
const essayValidationSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z.string()
    .trim()
    .min(50, "Essay content must be at least 50 characters")
    .max(50000, "Essay content must be less than 50,000 characters"),
  degreeLevel: z.enum(["bachelors", "masters", "phd"]),
  cvText: z.string()
    .max(20000, "CV text must be less than 20,000 characters")
    .optional(),
  questionnaireText: z.string()
    .max(20000, "Questionnaire text must be less than 20,000 characters")
    .optional(),
});

interface NewEssayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const NewEssayDialog = ({ open, onOpenChange, userId }: NewEssayDialogProps) => {
  const navigate = useNavigate();
  
  // Helper function to sanitize text input
  const sanitizeText = (text: string, maxLength: number): string => {
    return text.trim().slice(0, maxLength);
  };

  // Helper function to verify college exists in database
  const verifyCollegeExists = async (collegeId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('colleges')
      .select('id')
      .eq('id', collegeId)
      .maybeSingle();
    
    return !error && !!data;
  };

  // Helper function to verify programme exists in database
  const verifyProgrammeExists = async (programmeId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('programmes')
      .select('id')
      .eq('id', programmeId)
      .maybeSingle();
    
    return !error && !!data;
  };

  // State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [degreeLevel, setDegreeLevel] = useState<"bachelors" | "masters">("bachelors");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [collegeId, setCollegeId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [isCustomCollege, setIsCustomCollege] = useState(false);
  const [customCollegeName, setCustomCollegeName] = useState("");
  const [customProgrammeName, setCustomProgrammeName] = useState("");
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
  const [questionnaireFile, setQuestionnaireFile] = useState<File | null>(null);
  const [questionnaireText, setQuestionnaireText] = useState("");
  const [uploadStage, setUploadStage] = useState<'upload' | 'select-essay' | 'edit-form'>('upload');
  const [parsedEssays, setParsedEssays] = useState<Array<{
    prompt_question: string;
    essay_title: string;
    essay_content: string;
    word_count: number;
  }>>([]);
  const [selectedEssayIndex, setSelectedEssayIndex] = useState<number | null>(null);
  const [parsedMetadata, setParsedMetadata] = useState<{
    college_name?: string;
    programme_name?: string;
    degree_level?: 'bachelors' | 'masters';
    college_id?: string;
    programme_id?: string;
    collegeMatches?: Array<{ id: string; name: string; country: string }>;
    programmeMatches?: Array<{ id: string; name: string }>;
    searchUsed?: boolean;
    collegeNameVerified?: boolean;
    programmeNameVerified?: boolean;
  } | null>(null);

  const handleParsedData = async (parsedData: {
    essays: Array<{
      prompt_question: string;
      essay_title: string;
      essay_content: string;
      word_count: number;
    }>;
    college_name?: string;
    programme_name?: string;
    college_id?: string;
    programme_id?: string;
    degree_level?: 'bachelors' | 'masters';
    collegeMatches?: Array<{ id: string; name: string; country: string }>;
    programmeMatches?: Array<{ id: string; name: string }>;
    searchUsed?: boolean;
    collegeNameVerified?: boolean;
    programmeNameVerified?: boolean;
  }) => {
    // Store metadata
    setParsedMetadata({
      college_name: parsedData.college_name,
      programme_name: parsedData.programme_name,
      degree_level: parsedData.degree_level,
      college_id: parsedData.college_id,
      programme_id: parsedData.programme_id,
      collegeMatches: parsedData.collegeMatches,
      programmeMatches: parsedData.programmeMatches,
      searchUsed: parsedData.searchUsed,
      collegeNameVerified: parsedData.collegeNameVerified,
      programmeNameVerified: parsedData.programmeNameVerified,
    });

    // Check number of essays
    if (!parsedData.essays || parsedData.essays.length === 0) {
      toast.error('No essays found in document');
      return;
    }

    if (parsedData.essays.length === 1) {
      // Single essay - auto-fill form immediately
      await applySingleEssay(parsedData.essays[0], parsedData);
      setUploadStage('edit-form');
      toast.success('Essay parsed successfully!');
    } else {
      // Multiple essays - show selection screen
      setParsedEssays(parsedData.essays);
      setUploadStage('select-essay');
      toast.success(`Found ${parsedData.essays.length} essay prompts`);
    }
  };

  const applySingleEssay = async (essay: {
    essay_title: string;
    essay_content: string;
  }, metadata: typeof parsedMetadata) => {
    // Validate and set title
    const titleValidation = z.string().trim().min(1).max(200).safeParse(essay.essay_title);
    if (titleValidation.success) {
      setTitle(sanitizeText(essay.essay_title, 200));
    }

    // Validate and set content
    const contentValidation = z.string().trim().min(50).max(50000).safeParse(essay.essay_content);
    if (contentValidation.success) {
      setContent(sanitizeText(essay.essay_content, 50000));
    }

    // Apply metadata
    if (metadata?.degree_level) {
      setDegreeLevel(metadata.degree_level);
    }

    // Validate and auto-fill college
    if (metadata?.college_id) {
      const collegeExists = await verifyCollegeExists(metadata.college_id);
      if (collegeExists) {
        setCollegeId(metadata.college_id);
        setIsCustomCollege(false);
      } else if (metadata?.college_name) {
        setIsCustomCollege(true);
        setCustomCollegeName(sanitizeText(metadata.college_name, 200));
      }
    } else if (metadata?.college_name) {
      setIsCustomCollege(true);
      setCustomCollegeName(sanitizeText(metadata.college_name, 200));
    }

    // Validate and auto-fill programme
    if (metadata?.programme_id && metadata?.college_id) {
      const programmeExists = await verifyProgrammeExists(metadata.programme_id);
      if (programmeExists) {
        setProgrammeId(metadata.programme_id);
      } else if (metadata?.programme_name) {
        setCustomProgrammeName(sanitizeText(metadata.programme_name, 200));
      }
    } else if (metadata?.programme_name) {
      setCustomProgrammeName(sanitizeText(metadata.programme_name, 200));
    }
  };

  const handleEssaySelection = async (index: number) => {
    const essay = parsedEssays[index];
    await applySingleEssay(essay, parsedMetadata);
    setSelectedEssayIndex(index);
    setUploadStage('edit-form');
  };

  const handleManualEntry = () => {
    setUploadStage('edit-form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate essay data
      const validationResult = essayValidationSchema.safeParse({
        title: title.trim(),
        content: content.trim(),
        degreeLevel,
        cvText: cvText.trim() || undefined,
        questionnaireText: questionnaireText.trim() || undefined,
      });

      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        setLoading(false);
        return;
      }
    
      if (!content.trim()) {
        toast.error("Please provide essay content either by typing or uploading a document.");
        setLoading(false);
        return;
      }

      if (isCustomCollege && !customCollegeName.trim()) {
        toast.error("Please enter a college name.");
        setLoading(false);
        return;
      }

      // Prepare CV data
      const cvData = cvText.trim() ? { text: cvText, source: resumeFile ? "file" : "manual" } : null;
      
      // Prepare questionnaire data
      let questionnairePayload = null;
      if (questionnaireFile && questionnaireText.trim()) {
        questionnairePayload = { 
          questionnaireText,
          source: "file",
          fileName: questionnaireFile.name 
        };
      } else {
        const filteredQuestionnaire = Object.entries(questionnaireData).reduce((acc, [key, value]) => {
          if (value.trim()) acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        
        if (Object.keys(filteredQuestionnaire).length > 0) {
          questionnairePayload = { ...filteredQuestionnaire, source: "manual" };
        }
      }

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
          questionnaire_data: questionnairePayload,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Essay created successfully!");
      onOpenChange(false);
      navigate(`/editor/${data.id}?new=true`);
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

        {uploadStage === 'upload' && (
          <div className="space-y-6">
            <EssayUploadParser onParsed={handleParsedData} autoParseOnUpload={true} />
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleManualEntry}
            >
              Skip upload and enter manually
            </Button>
          </div>
        )}

        {uploadStage === 'select-essay' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Found {parsedEssays.length} essay prompts</h3>
              <p className="text-sm text-muted-foreground">Select which essay to create:</p>
            </div>

            <RadioGroup value={selectedEssayIndex?.toString()} onValueChange={(v) => handleEssaySelection(parseInt(v))}>
              <div className="space-y-3">
                {parsedEssays.map((essay, index) => (
                  <Card key={index} className="p-4 cursor-pointer hover:border-primary transition-colors">
                    <label htmlFor={`essay-${index}`} className="flex items-start gap-3 cursor-pointer">
                      <RadioGroupItem value={index.toString()} id={`essay-${index}`} className="mt-1" />
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-sm">
                          {essay.prompt_question}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {essay.essay_title} • {essay.word_count} words
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {essay.essay_content.substring(0, 150)}...
                        </div>
                      </div>
                    </label>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>
        )}

        {uploadStage === 'edit-form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <EssayDetailsForm
              title={title}
              content={content}
              degreeLevel={degreeLevel}
              selectedCountry={selectedCountry}
              collegeId={collegeId}
              programmeId={programmeId}
              isCustomCollege={isCustomCollege}
              customCollegeName={customCollegeName}
              customProgrammeName={customProgrammeName}
              uploadedFile={uploadedFile}
              onTitleChange={setTitle}
              onContentChange={setContent}
              onDegreeLevelChange={setDegreeLevel}
              onCountryChange={setSelectedCountry}
              onCollegeIdChange={setCollegeId}
              onProgrammeIdChange={setProgrammeId}
              onIsCustomCollegeChange={setIsCustomCollege}
              onCustomCollegeNameChange={setCustomCollegeName}
              onCustomProgrammeNameChange={setCustomProgrammeName}
              onUploadedFileChange={setUploadedFile}
            />

            <ResumeSection
              resumeFile={resumeFile}
              cvText={cvText}
              onCvTextChange={setCvText}
              onResumeFileChange={setResumeFile}
              onQuestionnaireAutoFill={(data) => setQuestionnaireData({ ...questionnaireData, ...data })}
            />

            <QuestionnaireSection
              questionnaireFile={questionnaireFile}
              questionnaireText={questionnaireText}
              questionnaireData={questionnaireData}
              onQuestionnaireFileChange={setQuestionnaireFile}
              onQuestionnaireTextChange={setQuestionnaireText}
              onQuestionnaireDataChange={setQuestionnaireData}
            />

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Essay"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
