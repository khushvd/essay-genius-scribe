import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import { z } from "zod";
import type { Result } from "@/types/api";
import { ValidationError } from "@/lib/errors/AppError";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// File validation schema
const fileValidationSchema = z.object({
  size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
  type: z.string().refine(
    (type) => ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"].includes(type),
    "File must be PDF or DOCX"
  ),
});

/**
 * Validates file size and type
 */
export const validateFile = (file: File): Result<File, ValidationError> => {
  try {
    fileValidationSchema.parse({ size: file.size, type: file.type });
    return { success: true, data: file };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: new ValidationError(error.errors[0].message) 
      };
    }
    return { 
      success: false, 
      error: new ValidationError("Invalid file") 
    };
  }
};

/**
 * Parses PDF file and extracts text content
 */
export const parsePDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let extractedText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    extractedText += pageText + "\n";
  }
  
  return extractedText;
};

/**
 * Parses DOCX file and extracts text content
 */
export const parseDOCX = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

/**
 * Parses a file (PDF or DOCX) and returns extracted text
 */
export const parseFile = async (file: File): Promise<Result<string, ValidationError>> => {
  try {
    // Validate file first
    const validationResult = validateFile(file);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error };
    }

    const fileType = file.type;
    let extractedText = "";

    if (fileType === "application/pdf") {
      extractedText = await parsePDF(file);
    } else {
      // Handle DOCX
      extractedText = await parseDOCX(file);
    }

    return { success: true, data: extractedText };
  } catch (error) {
    console.error("File parsing error:", error);
    return { 
      success: false, 
      error: new ValidationError("Failed to parse file. Please try copying the text instead.") 
    };
  }
};
