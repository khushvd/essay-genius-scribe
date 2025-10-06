// Profiles service
import { supabase } from '@/integrations/supabase/client';
import { handleError } from '@/lib/errors/error-handler';
import { DatabaseError, NotFoundError } from '@/lib/errors/AppError';
import type { Result } from '@/types/api';
import type { Profile } from '@/types/entities';
import type { ProfileUpdate, ProfileWithRole } from '@/types/database';

export const profilesService = {
  async getProfile(userId: string): Promise<Result<Profile, DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
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
          error: new NotFoundError('Profile') 
        };
      }

      return { success: true, data: data as Profile };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async updateProfile(userId: string, updates: ProfileUpdate): Promise<Result<Profile, DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: data as Profile };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async listUsers(): Promise<Result<ProfileWithRole[], DatabaseError>> {
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        return { 
          success: false, 
          error: new DatabaseError(profilesError.message, profilesError.code) 
        };
      }

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        return { 
          success: false, 
          error: new DatabaseError(rolesError.message, rolesError.code) 
        };
      }

      // Create a map of user_id to role
      const rolesMap = new Map(
        rolesData?.map(r => [r.user_id, r.role]) || []
      );

      // Combine profiles with roles
      const usersWithRoles: ProfileWithRole[] = profilesData?.map(profile => ({
        ...profile,
        user_roles: [{ role: rolesMap.get(profile.id) || 'free' }]
      })) || [];

      return { success: true, data: usersWithRoles };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async updateAccountStatus(
    userId: string,
    status: 'approved' | 'rejected' | 'suspended',
    adminId: string
  ): Promise<Result<Profile, DatabaseError>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          account_status: status,
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return { 
          success: false, 
          error: new DatabaseError(error.message, error.code) 
        };
      }

      return { success: true, data: data as Profile };
    } catch (error) {
      return { success: false, error: handleError(error) as DatabaseError };
    }
  },

  async updateUserRole(
    userId: string,
    role: 'free' | 'premium' | 'admin'
  ): Promise<Result<void, DatabaseError>> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

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
};
