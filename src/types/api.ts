// API response and error types

export type Result<T, E = Error> = 
  | { success: true; data: T; error?: never }
  | { success: false; error: E; data?: never };

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AnalysisResponse {
  suggestions: any[];
  scores: {
    overall: number;
    clarity: number;
    coherence: number;
    impact: number;
    authenticity: number;
  };
  reasoning: string;
}

export interface AuthResponse {
  user: any;
  session: any;
}

export interface EmailNotificationRequest {
  type: 'approval' | 'rejection' | 'suspension' | 'admin_notification';
  recipientEmail: string;
  recipientName: string;
  adminName?: string;
}
