// Hook for handling file uploads and text extraction
import { useState } from 'react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { toast } from 'sonner';
import { fileValidationSchema } from '@/lib/validation/schemas';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface UseFileUploadResult {
  file: File | null;
  extractedText: string;
  isUploading: boolean;
  uploadFile: (file: File) => Promise<void>;
  clearFile: () => void;
  setText: (text: string) => void;
}

export const useFileUpload = (): UseFileUploadResult => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (uploadedFile: File) => {
    setIsUploading(true);
    
    try {
      // Validate file
      const parsed = fileValidationSchema.safeParse({ 
        size: uploadedFile.size, 
        type: uploadedFile.type 
      });

      if (!parsed.success) {
        toast.error(parsed.error.errors[0].message);
        return;
      }

      const fileType = uploadedFile.type;
      let text = '';

      if (fileType === 'application/pdf') {
        // Handle PDF
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          text += pageText + '\n';
        }
      } else {
        // Handle DOCX
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      }

      setExtractedText(text);
      setFile(uploadedFile);
      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error('File parsing error:', error);
      toast.error('Failed to parse document. Please try copying the text instead.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setExtractedText('');
  };

  const setText = (text: string) => {
    setExtractedText(text);
  };

  return {
    file,
    extractedText,
    isUploading,
    uploadFile,
    clearFile,
    setText,
  };
};
