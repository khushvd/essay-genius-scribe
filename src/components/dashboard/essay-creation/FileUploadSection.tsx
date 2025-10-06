import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText, X } from "lucide-react";
import { parseFile } from "@/lib/utils/fileParser";

interface FileUploadSectionProps {
  label: string;
  description: string;
  onFileUpload: (text: string, file: File) => void;
  uploadedFile: File | null;
  onRemoveFile: () => void;
  accept?: string;
  id: string;
}

export const FileUploadSection = ({
  label,
  description,
  onFileUpload,
  uploadedFile,
  onRemoveFile,
  accept = ".pdf,.doc,.docx",
  id,
}: FileUploadSectionProps) => {
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const result = await parseFile(file);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    onFileUpload(result.data, file);
    toast.success("Document uploaded successfully!");
  };

  if (uploadedFile) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
        <FileText className="h-4 w-4" />
        <span className="text-sm flex-1">{uploadedFile.name}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemoveFile}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={id} className="cursor-pointer">
        <div className="border-2 border-dashed rounded-md p-6 hover:border-primary transition-colors text-center">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </Label>
      <Input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={loading}
      />
    </div>
  );
};
