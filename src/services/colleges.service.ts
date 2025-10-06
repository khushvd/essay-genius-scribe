// Colleges and programmes service
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/lib/errors/error-handler';
import { DatabaseError } from '@/lib/errors/AppError';
import type { Result } from '@/types/api';
import type { College, Programme } from '@/types/entities';

export const collegesService = {
  async listColleges(country?: string): Promise<Result<College[], DatabaseError>> {
    try {
      let query = supabase
        .from('colleges')
        .select('*')
        .order('name');

      if (country && country !== 'all') {
        query = query.eq('country', country);
      }

      const { data, error } = await query;

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: (data || []) as College[] };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async listProgrammes(collegeId: string): Promise<Result<Programme[], DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('programmes')
        .select('*')
        .eq('college_id', collegeId)
        .order('name');

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: (data || []) as Programme[] };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async searchColleges(searchTerm: string): Promise<Result<College[], DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('name')
        .limit(20);

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: (data || []) as College[] };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },
};
