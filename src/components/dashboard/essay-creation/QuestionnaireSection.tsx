import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ChevronDown, FileText, X } from "lucide-react";
import { FileUploadSection } from "./FileUploadSection";

interface QuestionnaireData {
  academicInterests: string;
  extracurriculars: string;
  careerGoals: string;
  challenges: string;
}

interface QuestionnaireSectionProps {
  questionnaireFile: File | null;
  questionnaireText: string;
  questionnaireData: QuestionnaireData;
  onQuestionnaireFileChange: (file: File | null) => void;
  onQuestionnaireTextChange: (text: string) => void;
  onQuestionnaireDataChange: (data: QuestionnaireData) => void;
}

export const QuestionnaireSection = ({
  questionnaireFile,
  questionnaireText,
  questionnaireData,
  onQuestionnaireFileChange,
  onQuestionnaireTextChange,
  onQuestionnaireDataChange,
}: QuestionnaireSectionProps) => {
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);

  const handleFileUpload = (text: string, file: File) => {
    onQuestionnaireTextChange(text);
    onQuestionnaireFileChange(file);
  };

  const handleRemoveFile = () => {
    onQuestionnaireFileChange(null);
    onQuestionnaireTextChange("");
  };

  const updateQuestionnaireField = (field: keyof QuestionnaireData, value: string) => {
    onQuestionnaireDataChange({ ...questionnaireData, [field]: value });
  };

  return (
    <Collapsible open={questionnaireOpen} onOpenChange={setQuestionnaireOpen}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between">
          <span>Background Questionnaire (Optional)</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${questionnaireOpen ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          Upload a document or fill out the form to help us understand your background
        </p>
        
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Document</TabsTrigger>
            <TabsTrigger value="form">Fill Form</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-2">
            {questionnaireFile ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm flex-1">{questionnaireFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-3 bg-muted/50 rounded-md max-h-32 overflow-y-auto">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {questionnaireText.slice(0, 500)}...
                  </p>
                </div>
              </div>
            ) : (
              <FileUploadSection
                label="Click to upload questionnaire document"
                description="Supports PDF and DOCX files (max 5MB)"
                onFileUpload={handleFileUpload}
                uploadedFile={questionnaireFile}
                onRemoveFile={handleRemoveFile}
                id="questionnaire-upload"
              />
            )}
          </TabsContent>
          
          <TabsContent value="form" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="academic-interests">Academic Interests</Label>
              <Textarea
                id="academic-interests"
                value={questionnaireData.academicInterests}
                onChange={(e) => updateQuestionnaireField('academicInterests', e.target.value)}
                placeholder="What subjects or fields excite you most?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extracurriculars">Extracurricular Activities</Label>
              <Textarea
                id="extracurriculars"
                value={questionnaireData.extracurriculars}
                onChange={(e) => updateQuestionnaireField('extracurriculars', e.target.value)}
                placeholder="Key activities, clubs, sports, volunteering..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="career-goals">Career Goals</Label>
              <Textarea
                id="career-goals"
                value={questionnaireData.careerGoals}
                onChange={(e) => updateQuestionnaireField('careerGoals', e.target.value)}
                placeholder="What are your professional aspirations?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="challenges">Personal Challenges or Growth Moments</Label>
              <Textarea
                id="challenges"
                value={questionnaireData.challenges}
                onChange={(e) => updateQuestionnaireField('challenges', e.target.value)}
                placeholder="Significant challenges you've overcome or pivotal growth experiences..."
                rows={2}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
};
