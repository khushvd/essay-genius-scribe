// Validation utility functions
import { z } from 'zod';
import { ValidationError } from '../errors/AppError';
import type { Result } from '@/types/api';

export const validateSchema = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Result<T, ValidationError> => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: new ValidationError(
          firstError.message,
          firstError.path.join('.')
        ),
      };
    }
    return {
      success: false,
      error: new ValidationError('Validation failed'),
    };
  }
};

export const validateFile = (file: File): Result<File, ValidationError> => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  if (file.size > maxSize) {
    return {
      success: false,
      error: new ValidationError('File size must be less than 5MB'),
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: new ValidationError('File must be PDF or DOCX'),
    };
  }

  return { success: true, data: file };
};
