// Authentication service
import { supabase } from '@/integrations/supabase/client';
import { AuthError } from '@/lib/errors/AppError';
import { handleAuthError } from '@/lib/errors/error-handler';
import type { Result } from '@/types/api';
import type { User, Session } from '@supabase/supabase-js';

interface SignInParams {
  email: string;
  password: string;
}

interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
}

interface AuthResult {
  user: User;
  session: Session;
}

export const authService = {
  async signIn({ email, password }: SignInParams): Promise<Result<AuthResult, AuthError>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: new AuthError(error.message, error.name) };
      }

      if (!data.user || !data.session) {
        return { success: false, error: new AuthError('Invalid credentials') };
      }

      return { 
        success: true, 
        data: { user: data.user, session: data.session } 
      };
    } catch (error) {
      return { success: false, error: handleAuthError(error) };
    }
  },

  async signUp({ email, password, fullName }: SignUpParams): Promise<Result<AuthResult, AuthError>> {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { success: false, error: new AuthError(error.message, error.name) };
      }

      if (!data.user || !data.session) {
        return { success: false, error: new AuthError('Signup failed') };
      }

      return { 
        success: true, 
        data: { user: data.user, session: data.session } 
      };
    } catch (error) {
      return { success: false, error: handleAuthError(error) };
    }
  },

  async signOut(): Promise<Result<void, AuthError>> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { success: false, error: new AuthError(error.message) };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: handleAuthError(error) };
    }
  },

  async getSession(): Promise<Result<Session | null, AuthError>> {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return { success: false, error: new AuthError(error.message) };
      }

      return { success: true, data: data.session };
    } catch (error) {
      return { success: false, error: handleAuthError(error) };
    }
  },

  async resetPassword(email: string): Promise<Result<void, AuthError>> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error: new AuthError(error.message) };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: handleAuthError(error) };
    }
  },
};
