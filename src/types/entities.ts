// Core domain entity types
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  account_status: 'pending' | 'approved' | 'rejected' | 'suspended';
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'free' | 'premium' | 'admin';
  created_at: string;
}

export interface College {
  id: string;
  name: string;
  country: string;
  tier: string | null;
  created_at: string;
}

export interface Programme {
  id: string;
  name: string;
  college_id: string;
  english_variant: 'american' | 'british';
  created_at: string;
}

export interface Essay {
  id: string;
  writer_id: string;
  title: string | null;
  content: string;
  degree_level: 'bachelors' | 'masters' | 'phd';
  college_id: string | null;
  programme_id: string | null;
  custom_college_name: string | null;
  custom_programme_name: string | null;
  status: 'draft' | 'in_review' | 'completed' | 'archived';
  cv_data: CvData | null;
  questionnaire_data: QuestionnaireData | null;
  created_at: string;
  updated_at: string;
  colleges?: College;
  programmes?: Programme;
}

export interface CvData {
  text: string;
  source: 'file' | 'manual';
  fileName?: string;
}

export interface QuestionnaireData {
  academicInterests?: string;
  extracurriculars?: string;
  careerGoals?: string;
  challenges?: string;
  questionnaireText?: string;
  source?: 'file' | 'manual';
  fileName?: string;
}

export interface EssayScore {
  id: string;
  essay_id: string;
  overall_score: number | null;
  clarity_score: number | null;
  coherence_score: number | null;
  impact_score: number | null;
  authenticity_score: number | null;
  score_type: string;
  scored_at: string;
  scored_by: string | null;
  ai_reasoning: string | null;
  notes: string | null;
  created_at: string;
}

export interface EssaySuggestion {
  id: string;
  type: 'grammar' | 'clarity' | 'structure' | 'content' | 'style';
  originalText: string;
  suggestion: string;
  reasoning: string;
  location: {
    start: number;
    end: number;
  };
  severity: 'high' | 'medium' | 'low';
}

export interface EssayAnalytics {
  id: string;
  essay_id: string;
  suggestion_id: string;
  suggestion_type: string;
  original_text: string | null;
  suggested_text: string | null;
  reasoning: string | null;
  action: 'applied' | 'dismissed' | 'pending';
  analysis_id: string;
  action_timestamp: string;
  created_at: string;
}

export interface TrainingEssay {
  id: string;
  essay_id: string;
  original_content: string;
  final_content: string;
  suggestions_applied: any;
  suggestions_dismissed: any;
  manual_edits: any;
  before_score: any;
  after_score: any;
  improvement_metrics: any;
  status: string;
  metadata: any;
  added_by: string | null;
  added_at: string;
  admin_notes: string | null;
  created_at: string;
}

export interface SuccessfulEssay {
  id: string;
  essay_title: string | null;
  essay_content: string;
  college_id: string | null;
  programme_id: string | null;
  degree_level: string | null;
  writer_resume: string | null;
  writer_questionnaire: any;
  key_strategies: any;
  performance_score: number | null;
  created_at: string;
}
