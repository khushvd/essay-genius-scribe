// Centralized authentication utilities
import { supabase } from '@/integrations/supabase/client';
import { AuthError } from './errors/AppError';
import type { User } from '@/types/entities';
import type { Session } from '@supabase/supabase-js';

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  
  return user as User | null;
};

export const getCurrentSession = async (): Promise<Session | null> => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  
  return session;
};

export const requireAuth = async (): Promise<User> => {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new AuthError('You must be logged in to access this resource');
  }
  
  return user;
};

export const checkRole = async (
  userId: string,
  requiredRole: 'free' | 'premium' | 'admin'
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  // Admin has access to everything
  if (data.role === 'admin') {
    return true;
  }

  // Premium has access to premium and free features
  if (requiredRole === 'premium' && data.role === 'premium') {
    return true;
  }

  // Match exact role
  return data.role === requiredRole;
};

export const getAccessToken = async (): Promise<string | null> => {
  const session = await getCurrentSession();
  return session?.access_token || null;
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new AuthError('Failed to sign out', error.message);
  }
};
