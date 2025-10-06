// Analytics and scoring service
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/lib/errors/error-handler';
import { DatabaseError } from '@/lib/errors/AppError';
import type { Result } from '@/types/api';
import type { EssayScore, EssayAnalytics } from '@/types/entities';

export const analyticsService = {
  async getEssayScores(essayId: string): Promise<Result<EssayScore[], DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('essay_scores')
        .select('*')
        .eq('essay_id', essayId)
        .order('scored_at', { ascending: false });

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: (data || []) as EssayScore[] };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async getLatestScore(essayId: string): Promise<Result<EssayScore | null, DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('essay_scores')
        .select('*')
        .eq('essay_id', essayId)
        .order('scored_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: data as EssayScore | null };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async getEssayAnalytics(essayId: string): Promise<Result<EssayAnalytics[], DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('essay_analytics')
        .select('*')
        .eq('essay_id', essayId)
        .order('created_at', { ascending: false });

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: (data || []) as EssayAnalytics[] };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async trackSuggestionAction(
    essayId: string,
    suggestionId: string,
    action: 'applied' | 'dismissed',
    suggestionType: string,
    originalText?: string,
    suggestedText?: string,
    reasoning?: string
  ): Promise<Result<void, DatabaseError>> {
    try {
      const { error } = await supabase
        .from('essay_analytics')
        .insert({
          essay_id: essayId,
          suggestion_id: suggestionId,
          action,
          suggestion_type: suggestionType,
          original_text: originalText || null,
          suggested_text: suggestedText || null,
          reasoning: reasoning || null,
          analysis_id: crypto.randomUUID(),
        });

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async getScoresForEssays(essayIds: string[]): Promise<Result<Record<string, number>, DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('essay_scores')
        .select('essay_id, overall_score, scored_at')
        .in('essay_id', essayIds)
        .order('scored_at', { ascending: false });

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      // Get latest score for each essay
      const latestScores: Record<string, number> = {};
      data?.forEach(score => {
        if (!latestScores[score.essay_id] && score.overall_score) {
          latestScores[score.essay_id] = score.overall_score;
        }
      });

      return { success: true, data: latestScores };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },
};
