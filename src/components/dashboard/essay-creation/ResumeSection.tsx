import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { FileUploadSection } from "./FileUploadSection";
import { supabase } from "@/integrations/supabase/client";
import { parseFile } from "@/lib/utils/fileParser";

interface ResumeSectionProps {
  resumeFile: File | null;
  cvText: string;
  onCvTextChange: (text: string) => void;
  onResumeFileChange: (file: File | null) => void;
  onQuestionnaireAutoFill: (data: {
    academicInterests: string;
    extracurriculars: string;
    careerGoals: string;
  }) => void;
}

export const ResumeSection = ({
  resumeFile,
  cvText,
  onCvTextChange,
  onResumeFileChange,
  onQuestionnaireAutoFill,
}: ResumeSectionProps) => {
  const [resumeOpen, setResumeOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResumeUpload = async (text: string, file: File) => {
    setLoading(true);
    onCvTextChange(text);
    onResumeFileChange(file);

    // Call AI to parse resume and auto-fill questionnaire
    if (text.trim().length >= 50) {
      toast.info("Parsing resume with AI...");
      
      const { data, error } = await supabase.functions.invoke('parse-resume', {
        body: { resumeText: text },
      });

      if (error) {
        console.error("AI parsing error:", error);
        toast.success("Resume uploaded! You can manually fill in the questionnaire below.");
      } else if (data?.parsed_data) {
        const parsed = data.parsed_data;
        
        // Auto-populate questionnaire from parsed resume
        onQuestionnaireAutoFill({
          academicInterests: parsed.academic_interests?.join(", ") || "",
          extracurriculars: parsed.extracurriculars?.join(", ") || "",
          careerGoals: parsed.career_goals || "",
        });

        toast.success("Resume uploaded and parsed! Questionnaire auto-filled.");
      }
    } else {
      toast.success("Resume uploaded successfully!");
    }
    
    setLoading(false);
  };

  const handleRemoveResume = () => {
    onResumeFileChange(null);
    onCvTextChange("");
  };

  return (
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
        
        <FileUploadSection
          label="Click to upload resume"
          description="PDF or DOCX (max 5MB)"
          onFileUpload={handleResumeUpload}
          uploadedFile={resumeFile}
          onRemoveFile={handleRemoveResume}
          id="resume-upload"
        />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or fill manually</span>
          </div>
        </div>

        <Textarea
          value={cvText}
          onChange={(e) => onCvTextChange(e.target.value)}
          placeholder="Paste resume/CV content here..."
          rows={4}
          disabled={loading}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};
