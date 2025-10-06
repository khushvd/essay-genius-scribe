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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
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
  const [entryMode, setEntryMode] = useState<"manual" | "upload">("manual");

  const handleParsedData = async (parsedData: {
    title: string;
    content: string;
    collegeName?: string;
    programmeName?: string;
    collegeId?: string;
    programmeId?: string;
    collegeMatches?: Array<{ id: string; name: string; country: string }>;
    programmeMatches?: Array<{ id: string; name: string }>;
    searchUsed?: boolean;
    collegeNameVerified?: boolean;
    programmeNameVerified?: boolean;
    degreeLevel?: 'bachelors' | 'masters';
  }) => {
    // Validate title
    const titleValidation = z.string().trim().min(1).max(200).safeParse(parsedData.title);
    if (!titleValidation.success) {
      toast.warning('Title is invalid or too long. Please edit manually.');
    } else {
      setTitle(sanitizeText(parsedData.title, 200));
    }

    // Validate content
    const contentValidation = z.string().trim().min(50).max(50000).safeParse(parsedData.content);
    if (!contentValidation.success) {
      toast.warning('Essay content is invalid or exceeds length limits. Please edit manually.');
    } else {
      setContent(sanitizeText(parsedData.content, 50000));
    }

    // Set degree level if parsed
    if (parsedData.degreeLevel && ['bachelors', 'masters', 'phd'].includes(parsedData.degreeLevel)) {
      setDegreeLevel(parsedData.degreeLevel);
    }

    // Validate and auto-fill college if database match found
    if (parsedData.collegeId) {
      const collegeExists = await verifyCollegeExists(parsedData.collegeId);
      
      if (collegeExists) {
        setCollegeId(parsedData.collegeId);
        setIsCustomCollege(false);
        
        if (parsedData.searchUsed && parsedData.collegeNameVerified) {
          toast.success(`College "${parsedData.collegeName}" verified and matched in database`);
        } else if (parsedData.collegeMatches && parsedData.collegeMatches.length > 1) {
          toast.info(`Found ${parsedData.collegeMatches.length} similar colleges. Top match selected.`);
        }
      } else {
        toast.warning('Parsed college not found in database. Please select manually.');
        
        if (parsedData.collegeName) {
          const sanitizedName = sanitizeText(parsedData.collegeName, 200);
          if (sanitizedName) {
            setIsCustomCollege(true);
            setCustomCollegeName(sanitizedName);
          }
        }
      }
    } else if (parsedData.collegeName) {
      const sanitizedName = sanitizeText(parsedData.collegeName, 200);
      if (sanitizedName) {
        setIsCustomCollege(true);
        setCustomCollegeName(sanitizedName);
        
        if (parsedData.searchUsed && parsedData.collegeNameVerified) {
          toast.info(`College "${sanitizedName}" verified but not in database. Using custom entry.`);
        }
      } else {
        toast.warning('College name is too long or invalid. Please enter manually.');
      }
    }

    // Validate and auto-fill programme if database match found
    if (parsedData.programmeId && parsedData.collegeId) {
      const programmeExists = await verifyProgrammeExists(parsedData.programmeId);
      
      if (programmeExists) {
        setProgrammeId(parsedData.programmeId);
        
        if (parsedData.searchUsed && parsedData.programmeNameVerified) {
          toast.success(`Programme "${parsedData.programmeName}" verified and matched`);
        }
      } else {
        toast.warning('Parsed programme not found in database. Please select manually.');
        
        if (parsedData.programmeName) {
          const sanitizedName = sanitizeText(parsedData.programmeName, 200);
          if (sanitizedName) {
            setCustomProgrammeName(sanitizedName);
          }
        }
      }
    } else if (parsedData.programmeName) {
      const sanitizedName = sanitizeText(parsedData.programmeName, 200);
      if (sanitizedName) {
        setCustomProgrammeName(sanitizedName);
      } else {
        toast.warning('Programme name is too long or invalid. Please enter manually.');
      }
    }

    setEntryMode("manual");
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

        <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as "manual" | "upload")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="upload">Upload & Parse with AI</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <EssayUploadParser onParsed={handleParsedData} />
          </TabsContent>

          <TabsContent value="manual" asChild>
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
