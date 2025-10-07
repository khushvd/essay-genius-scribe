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
      // Try joined query using relational syntax
      const { data: joinedData, error: joinedError } = await supabase
        .from('profiles')
        .select('*, user_roles(role)')
        .order('created_at', { ascending: false });

      // If join works, format and return
      if (!joinedError && joinedData) {
        const usersWithRoles: ProfileWithRole[] = joinedData.map((profile: any) => {
          const userRoles = Array.isArray(profile.user_roles) && profile.user_roles.length > 0
            ? profile.user_roles
            : [{ role: 'free' as const }];
          return {
            ...profile,
            user_roles: userRoles
          };
        });
        return { success: true, data: usersWithRoles };
      }

      // Fallback: handle missing relationship or other join errors by fetching separately
      if (joinedError) {
        console.warn('Falling back to separate queries for user roles:', joinedError);
      }

      const { data: profilesOnly, error: profilesOnlyError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesOnlyError || !profilesOnly) {
        const err = profilesOnlyError || joinedError;
        return {
          success: false,
          error: new DatabaseError(err?.message || 'Failed to load users', err?.code)
        };
      }

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const rolesByUser = (rolesData || []).reduce((acc: Record<string, Array<{ role: 'free' | 'premium' | 'admin' }>>, r: any) => {
        const key = r.user_id as string;
        if (!acc[key]) acc[key] = [];
        acc[key].push({ role: r.role });
        return acc;
      }, {});

      const merged: ProfileWithRole[] = profilesOnly.map((p: any) => ({
        ...p,
        user_roles: rolesByUser[p.id] && rolesByUser[p.id].length > 0 ? rolesByUser[p.id] : [{ role: 'free' as const }],
      }));

      // If roles fetch errored, still return merged with defaults
      if (rolesError) {
        console.warn('Roles query error, defaulting to free roles:', rolesError);
      }

      return { success: true, data: merged };
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
