import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface SpreadsheetRow {
  filename: string;
  essay_title: string;
  college_name: string;
  programme_name: string;
  degree_level: string;
  performance_score: number;
  status?: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

export const BulkUploadDialog = ({ open, onOpenChange, onSuccess }: BulkUploadDialogProps) => {
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [essayFiles, setEssayFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<SpreadsheetRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const parseSpreadsheet = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

    return jsonData.map((row: any) => ({
      filename: row.filename || row.Filename || '',
      essay_title: row.essay_title || row['Essay Title'] || '',
      college_name: row.college_name || row['College Name'] || '',
      programme_name: row.programme_name || row['Programme Name'] || '',
      degree_level: row.degree_level || row['Degree Level'] || 'masters',
      performance_score: parseInt(row.performance_score || row['Performance Score'] || '0'),
      status: 'pending' as const
    }));
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim();
  };

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleSpreadsheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSpreadsheetFile(file);
      const data = await parseSpreadsheet(file);
      setParsedData(data);
      toast({
        title: "Spreadsheet parsed",
        description: `Found ${data.length} essays to upload`,
      });
    } catch (error: any) {
      toast({
        title: "Error parsing spreadsheet",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkUpload = async () => {
    if (parsedData.length === 0 || essayFiles.length === 0) {
      toast({
        title: "Missing files",
        description: "Please upload both spreadsheet and essay files",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    const updatedData = [...parsedData];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < updatedData.length; i++) {
      const row = updatedData[i];
      updatedData[i].status = 'processing';
      setParsedData([...updatedData]);

      try {
        // Find matching file
        const matchingFile = essayFiles.find(f => 
          f.name.toLowerCase().includes(row.filename.toLowerCase().replace(/\.[^/.]+$/, ""))
        );

        if (!matchingFile) {
          throw new Error(`File not found: ${row.filename}`);
        }

        // Extract text
        let essayContent = "";
        if (matchingFile.type === "application/pdf") {
          essayContent = await extractTextFromPDF(matchingFile);
        } else {
          essayContent = await extractTextFromDOCX(matchingFile);
        }

        // Find college and programme IDs
        let collegeId = null;
        let programmeId = null;

        const { data: colleges } = await supabase
          .from("colleges")
          .select("id")
          .ilike("name", row.college_name)
          .limit(1);

        if (colleges && colleges.length > 0) {
          collegeId = colleges[0].id;

          const { data: programmes } = await supabase
            .from("programmes")
            .select("id")
            .eq("college_id", collegeId)
            .ilike("name", row.programme_name)
            .limit(1);

          if (programmes && programmes.length > 0) {
            programmeId = programmes[0].id;
          }
        }

        // Insert into successful_essays
        const { error: insertError } = await supabase
          .from("successful_essays")
          .insert({
            essay_title: row.essay_title,
            essay_content: essayContent,
            college_id: collegeId,
            programme_id: programmeId,
            degree_level: row.degree_level,
            performance_score: row.performance_score,
          });

        if (insertError) throw insertError;

        updatedData[i].status = 'success';
        successCount++;
      } catch (error: any) {
        updatedData[i].status = 'error';
        updatedData[i].error = error.message;
        errorCount++;
      }

      setParsedData([...updatedData]);
      setProgress(((i + 1) / updatedData.length) * 100);
    }

    setIsProcessing(false);
    toast({
      title: "Bulk upload complete",
      description: `${successCount} successful, ${errorCount} failed`,
    });

    if (successCount > 0) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Essays to Portfolio</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="spreadsheet">Excel/CSV File</Label>
              <Input
                id="spreadsheet"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleSpreadsheetUpload}
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required columns: filename, essay_title, college_name, programme_name, degree_level, performance_score
              </p>
            </div>

            <div>
              <Label htmlFor="essays">Essay Files (PDF/DOCX)</Label>
              <Input
                id="essays"
                type="file"
                accept=".pdf,.docx"
                multiple
                onChange={(e) => setEssayFiles(Array.from(e.target.files || []))}
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {essayFiles.length} files selected
              </p>
            </div>
          </div>

          {parsedData.length > 0 && (
            <>
              <div>
                <h3 className="font-medium mb-2">Preview ({parsedData.length} essays)</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parsedData.map((row, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{row.essay_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.filename} • {row.college_name} • {row.programme_name}
                          </p>
                          {row.error && (
                            <p className="text-xs text-destructive mt-1">{row.error}</p>
                          )}
                        </div>
                        <div className="ml-4">
                          {row.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                          {row.status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                          {row.status === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {isProcessing && (
                <div>
                  <Label>Upload Progress</Label>
                  <Progress value={progress} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(progress)}% complete
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkUpload}
                  disabled={isProcessing || essayFiles.length === 0}
                >
                  {isProcessing ? "Processing..." : "Upload All"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
