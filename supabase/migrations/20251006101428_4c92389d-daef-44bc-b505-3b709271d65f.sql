-- Phase 1: Security Hardening - Database & RLS Policies

-- 1.1: Fix Function Search Paths (Critical Security Issue)
-- Update update_updated_at function with proper security definer and search path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update handle_new_user function with proper search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  supabase_anon_key text;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  -- Assign default 'free' role to new users (use UPSERT to prevent duplicates)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Get Supabase URL and anon key from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- Only send notification if we have the required settings
  IF supabase_url IS NOT NULL AND supabase_anon_key IS NOT NULL THEN
    BEGIN
      PERFORM extensions.net.http_post(
        url := supabase_url || '/functions/v1/send-user-emails',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || supabase_anon_key
        ),
        body := jsonb_build_object(
          'type', 'admin_notification',
          'recipientEmail', NEW.email,
          'recipientName', COALESCE(NEW.raw_user_meta_data->>'full_name', '')
        ),
        timeout_milliseconds := 5000
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send admin notification email: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 1.2: Add Explicit Denial Policies for Unauthenticated Users
-- Prevent anonymous users from accessing profiles
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Prevent anonymous users from accessing essays
CREATE POLICY "Deny anonymous access to essays"
ON public.essays
FOR ALL
TO anon
USING (false);

-- Prevent anonymous users from accessing essay_analytics
CREATE POLICY "Deny anonymous access to essay_analytics"
ON public.essay_analytics
FOR ALL
TO anon
USING (false);

-- Prevent anonymous users from accessing essay_scores
CREATE POLICY "Deny anonymous access to essay_scores"
ON public.essay_scores
FOR ALL
TO anon
USING (false);

-- Prevent anonymous users from accessing training_essays
CREATE POLICY "Deny anonymous access to training_essays"
ON public.training_essays
FOR ALL
TO anon
USING (false);

-- Prevent anonymous users from accessing successful_essays
CREATE POLICY "Deny anonymous access to successful_essays"
ON public.successful_essays
FOR ALL
TO anon
USING (false);

-- Prevent anonymous users from accessing user_roles
CREATE POLICY "Deny anonymous access to user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false);

-- 1.3: Add Admin-Only Policies for Reference Tables
-- Only admins can modify colleges table
CREATE POLICY "Only admins can insert colleges"
ON public.colleges
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update colleges"
ON public.colleges
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete colleges"
ON public.colleges
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can modify programmes table
CREATE POLICY "Only admins can insert programmes"
ON public.programmes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update programmes"
ON public.programmes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete programmes"
ON public.programmes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 1.4: Create Admin Audit Log Table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Deny anonymous access to audit logs
CREATE POLICY "Deny anonymous access to audit_logs"
ON public.admin_audit_log
FOR ALL
TO anon
USING (false);