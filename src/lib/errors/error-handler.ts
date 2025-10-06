// Centralized error handling
import { toast } from 'sonner';
import { AppError, AuthError, ValidationError, NetworkError, DatabaseError } from './AppError';
import { PostgrestError } from '@supabase/supabase-js';

export const handleError = (error: unknown): AppError => {
  console.error('Error occurred:', error);

  // Handle known app errors
  if (error instanceof AppError) {
    toast.error(error.message);
    return error;
  }

  // Handle Supabase/PostgrestError
  if (isPostgrestError(error)) {
    const dbError = new DatabaseError(
      error.message || 'Database operation failed',
      error.code,
      error.details
    );
    toast.error(dbError.message);
    return dbError;
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    const netError = new NetworkError('Network request failed. Please check your connection.');
    toast.error(netError.message);
    return netError;
  }

  // Handle generic errors
  const genericError = new AppError(
    error instanceof Error ? error.message : 'An unexpected error occurred'
  );
  toast.error(genericError.message);
  return genericError;
};

// Type guard for Postgrest errors
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  );
}

export const handleAuthError = (error: unknown): AuthError => {
  console.error('Auth error:', error);

  if (error instanceof AuthError) {
    toast.error(error.message);
    return error;
  }

  const authError = new AuthError(
    error instanceof Error ? error.message : 'Authentication failed'
  );
  toast.error(authError.message);
  return authError;
};

export const handleValidationError = (error: unknown, field?: string): ValidationError => {
  console.error('Validation error:', error);

  if (error instanceof ValidationError) {
    toast.error(error.message);
    return error;
  }

  const validationError = new ValidationError(
    error instanceof Error ? error.message : 'Validation failed',
    field
  );
  toast.error(validationError.message);
  return validationError;
};
