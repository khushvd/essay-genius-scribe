// Centralized Zod validation schemas
import { z } from 'zod';

// Auth schemas
export const authValidationSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(10, { message: "Password must be at least 10 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" }),
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" })
    .optional(),
});

// Essay schemas
export const essayValidationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z
    .string()
    .trim()
    .min(50, "Essay content must be at least 50 characters")
    .max(50000, "Essay content must be less than 50,000 characters"),
  degreeLevel: z.enum(["bachelors", "masters", "phd"]),
  cvText: z
    .string()
    .max(20000, "CV text must be less than 20,000 characters")
    .optional(),
  questionnaireText: z
    .string()
    .max(20000, "Questionnaire text must be less than 20,000 characters")
    .optional(),
});

export const essayUpdateSchema = z.object({
  content: z.string().trim().min(50).max(50000).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(['draft', 'in_review', 'completed', 'archived']).optional(),
});

// File validation schema
export const fileValidationSchema = z.object({
  size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
  type: z.string().refine(
    (type) => [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"
    ].includes(type),
    "File must be PDF or DOCX"
  ),
});

// Profile schemas
export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  account_status: z
    .enum(['pending', 'approved', 'rejected', 'suspended'])
    .optional(),
});

// User management schemas
export const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(10),
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(['free', 'premium', 'admin']).default('free'),
});

// Questionnaire schema
export const questionnaireSchema = z.object({
  academicInterests: z.string().max(5000).optional(),
  extracurriculars: z.string().max(5000).optional(),
  careerGoals: z.string().max(5000).optional(),
  challenges: z.string().max(5000).optional(),
});
