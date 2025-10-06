// Centralized auth hook
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/services/auth.service';
import { profilesService } from '@/services/profiles.service';
import { toast } from 'sonner';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/entities';

export const useAuth = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<'free' | 'premium' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session);

        // Defer profile fetching with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const profileResult = await profilesService.getProfile(userId);
    
    if (profileResult.success) {
      setProfile(profileResult.data);
    }

    // Fetch user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    setRole(roleData?.role || 'free');
    setLoading(false);
  };

  const signOut = async () => {
    const result = await authService.signOut();
    
    if (result.success) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      setIsAuthenticated(false);
      toast.success('Signed out successfully');
      navigate('/auth');
    }
  };

  const checkAccountStatus = (redirectOnPending = true) => {
    if (!profile) return null;

    if (profile.account_status === 'pending') {
      if (redirectOnPending) {
        navigate('/pending-approval');
      }
      return 'pending';
    }

    if (profile.account_status === 'rejected' || profile.account_status === 'suspended') {
      signOut();
      toast.error(`Your account has been ${profile.account_status}`);
      return profile.account_status;
    }

    return 'approved';
  };

  return {
    user,
    session,
    profile,
    role,
    loading,
    isAuthenticated,
    isAdmin: role === 'admin',
    isPremium: role === 'premium' || role === 'admin',
    signOut,
    checkAccountStatus,
  };
};
