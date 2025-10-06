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
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  const fetchUserProfile = async (userId: string) => {
    // Prevent concurrent fetches
    if (isFetchingProfile) return;
    
    setIsFetchingProfile(true);
    
    try {
      const profileResult = await profilesService.getProfile(userId);
      
      if (!profileResult.success) {
        throw new Error('Failed to fetch user profile');
      }
      
      setProfile(profileResult.data);

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        throw new Error('Failed to fetch user role');
      }

      setRole(roleData?.role || 'free');
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error('Failed to load your profile. Please sign in again.');
      
      // Sign out user if profile fetch fails
      const { error: signOutError } = await supabase.auth.signOut();
      if (!signOutError) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
      setIsFetchingProfile(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let isInitialized = false;

    // Step 1: Check for existing session FIRST
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);

      if (session?.user) {
        // Fetch profile synchronously on mount
        await fetchUserProfile(session.user.id);
      } else {
        // No session, stop loading immediately
        setLoading(false);
      }

      isInitialized = true;
    };

    // Step 2: Set up auth state listener for FUTURE changes only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore events during initial mount to prevent race condition
        if (!isInitialized) return;
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session);

        if (session?.user) {
          // User logged in or session refreshed
          await fetchUserProfile(session.user.id);
        } else {
          // User logged out
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Initialize auth synchronously
    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
