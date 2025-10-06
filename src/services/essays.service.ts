// Essays service - all essay-related data operations
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/lib/errors/error-handler';
import { DatabaseError, NotFoundError } from '@/lib/errors/AppError';
import type { Result } from '@/types/api';
import type { Essay } from '@/types/entities';
import type { EssayInsert, EssayUpdate } from '@/types/database';

export const essaysService = {
  async getEssay(id: string): Promise<Result<Essay, DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('essays')
        .select(`
          *,
          colleges (id, name, country, tier),
          programmes (id, name, english_variant)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      if (!data) {
        return { 
          success: false, 
          error: new NotFoundError('Essay') 
        };
      }

      return { success: true, data: data as unknown as Essay };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async listEssays(userId: string): Promise<Result<Essay[], DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('essays')
        .select(`
          *,
          colleges (id, name, country),
          programmes (id, name, english_variant)
        `)
        .eq('writer_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: (data || []) as unknown as Essay[] };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async createEssay(essayData: EssayInsert): Promise<Result<Essay, DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('essays')
        .insert(essayData)
        .select(`
          *,
          colleges (id, name, country),
          programmes (id, name, english_variant)
        `)
        .single();

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: data as unknown as Essay };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async updateEssay(id: string, updates: EssayUpdate): Promise<Result<Essay, DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('essays')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(`
          *,
          colleges (id, name, country),
          programmes (id, name, english_variant)
        `)
        .single();

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: data as unknown as Essay };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async deleteEssay(id: string): Promise<Result<void, DatabaseError>> {
    try {
      const { error } = await supabase
        .from('essays')
        .delete()
        .eq('id', id);

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

  subscribeToEssays(userId: string, callback: () => void) {
    const channel = supabase
      .channel('essays_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'essays',
          filter: `writer_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },
};
