import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Loader2, FileText, X } from "lucide-react";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ParsedEssayData {
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
}

interface EssayUploadParserProps {
  onParsed: (data: ParsedEssayData) => void;
  autoParseOnUpload?: boolean;
}

export const EssayUploadParser = ({ onParsed, autoParseOnUpload = false }: EssayUploadParserProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.type;
    let extractedText = "";

    if (fileType === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        extractedText += pageText + "\n";
      }
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword"
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value;
    } else {
      throw new Error("Unsupported file type. Please use PDF or DOCX.");
    }

    return extractedText;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setFile(selectedFile);
      
      // Auto-parse if enabled
      if (autoParseOnUpload) {
        await parseFile(selectedFile);
      }
    }
  };

  const parseFile = async (fileToParse: File) => {
    setParsing(true);
    try {
      // Extract text from file
      const extractedText = await extractTextFromFile(fileToParse);

      if (!extractedText.trim()) {
        toast.error("Could not extract text from file");
        setParsing(false);
        return;
      }

      // Call edge function to parse
      const { data, error } = await supabase.functions.invoke("parse-portfolio-essay", {
        body: { essayContent: extractedText },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setParsing(false);
        return;
      }

      // Parse the response
      const parsedData: ParsedEssayData = {
        essays: data.essays || [],
        college_name: data.college_name,
        programme_name: data.programme_name,
        college_id: data.college_id,
        programme_id: data.programme_id,
        degree_level: data.degree_level,
        collegeMatches: data.college_matches || [],
        programmeMatches: data.programme_matches || [],
        searchUsed: data.search_used,
        collegeNameVerified: data.college_name_verified,
        programmeNameVerified: data.programme_name_verified,
      };

      onParsed(parsedData);
      
      const verifiedText = data.search_used ? " (Verified via web search)" : "";
      toast.success(`Document parsed successfully!${verifiedText}`);
    } catch (error: any) {
      console.error("Parse error:", error);
      toast.error(error.message || "Failed to parse essay");
    } finally {
      setParsing(false);
    }
  };

  const handleParse = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }
    await parseFile(file);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="essay-upload" className="text-base font-medium">
          Upload Essay Document
        </Label>
        <p className="text-sm text-muted-foreground mb-3">
          Upload your essay document (PDF or DOCX). {autoParseOnUpload ? 'It will be parsed automatically.' : 'Click Parse to extract content.'}
        </p>

        {file ? (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <FileText className="h-5 w-5" />
            <span className="text-sm flex-1">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div>
            <Label htmlFor="essay-upload" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-md p-8 hover:border-primary transition-colors text-center">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  Click to upload essay
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF or DOCX (max 5MB)
                </p>
              </div>
            </Label>
            <Input
              id="essay-upload"
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}
      </div>

      {file && !autoParseOnUpload && (
        <Button
          type="button"
          onClick={handleParse}
          disabled={parsing}
          className="w-full"
        >
          {parsing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Auto-parse Essay
            </>
          )}
        </Button>
      )}

      {parsing && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Parsing document...
        </div>
      )}
    </div>
  );
};
