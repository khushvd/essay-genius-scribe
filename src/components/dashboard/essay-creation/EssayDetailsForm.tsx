import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseDOCX } from "@/lib/utils/fileParser";

interface EssayDetailsFormProps {
  title: string;
  content: string;
  degreeLevel: "bachelors" | "masters";
  selectedCountry: string;
  collegeId: string;
  programmeId: string;
  isCustomCollege: boolean;
  customCollegeName: string;
  customProgrammeName: string;
  uploadedFile: File | null;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onDegreeLevelChange: (level: "bachelors" | "masters") => void;
  onCountryChange: (country: string) => void;
  onCollegeIdChange: (id: string) => void;
  onProgrammeIdChange: (id: string) => void;
  onIsCustomCollegeChange: (isCustom: boolean) => void;
  onCustomCollegeNameChange: (name: string) => void;
  onCustomProgrammeNameChange: (name: string) => void;
  onUploadedFileChange: (file: File | null) => void;
}

export const EssayDetailsForm = ({
  title,
  content,
  degreeLevel,
  selectedCountry,
  collegeId,
  programmeId,
  isCustomCollege,
  customCollegeName,
  customProgrammeName,
  uploadedFile,
  onTitleChange,
  onContentChange,
  onDegreeLevelChange,
  onCountryChange,
  onCollegeIdChange,
  onProgrammeIdChange,
  onIsCustomCollegeChange,
  onCustomCollegeNameChange,
  onCustomProgrammeNameChange,
  onUploadedFileChange,
}: EssayDetailsFormProps) => {
  const [colleges, setColleges] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);

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
      const extractedText = await parseDOCX(file);
      onContentChange(extractedText);
      onUploadedFileChange(file);
      toast.success("Document uploaded successfully!");
    } catch (error) {
      console.error("File parsing error:", error);
      toast.error("Failed to parse document. Please try copying the text instead.");
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Essay Prompt (if any)</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Describe a challenge you overcame..."
        />
      </div>

      <div className="space-y-2">
        <Label>Degree Level</Label>
        <Select value={degreeLevel} onValueChange={(value: "bachelors" | "masters") => onDegreeLevelChange(value)}>
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
        <Select value={selectedCountry} onValueChange={onCountryChange}>
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
                onChange={(e) => onCustomCollegeNameChange(e.target.value)}
                placeholder="Enter college name"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onIsCustomCollegeChange(false);
                  onCustomCollegeNameChange("");
                  onCustomProgrammeNameChange("");
                }}
              >
                Switch to dropdown
              </Button>
            </div>
          ) : (
            <Select value={collegeId} onValueChange={(value) => {
              if (value === "custom") {
                onIsCustomCollegeChange(true);
                onCollegeIdChange("");
              } else {
                onCollegeIdChange(value);
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
              onChange={(e) => onCustomProgrammeNameChange(e.target.value)}
              placeholder="Enter programme name (optional)"
            />
          ) : (
            <Select 
              value={programmeId} 
              onValueChange={onProgrammeIdChange}
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

      <div className="space-y-2">
        <Label>Initial Draft</Label>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Document</TabsTrigger>
            <TabsTrigger value="paste">Paste Text</TabsTrigger>
          </TabsList>
          
          <TabsContent value="paste" className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
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
                      onUploadedFileChange(null);
                      onContentChange("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
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
    </>
  );
};
