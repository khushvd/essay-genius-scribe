-- Phase 1: Critical Database Fixes

-- 1.1 Clean up duplicate roles (keep highest priority: admin > premium > free)
-- First, identify and delete duplicate roles keeping the highest priority one
WITH ranked_roles AS (
  SELECT 
    id,
    user_id,
    role,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY 
        CASE role
          WHEN 'admin' THEN 1
          WHEN 'premium' THEN 2
          WHEN 'free' THEN 3
        END,
        created_at ASC
    ) as rn
  FROM public.user_roles
)
DELETE FROM public.user_roles
WHERE id IN (
  SELECT id FROM ranked_roles WHERE rn > 1
);

-- 1.2 Add unique constraint on user_id to prevent future duplicates
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- 1.3 Add foreign key relationship to profiles table
-- First check if the foreign key already exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_roles_user_id_fkey' 
    AND table_name = 'user_roles'
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- 1.4 Enable pg_net extension for net.http_post calls
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1.5 Update handle_new_user trigger to use proper async email notification
-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
  
  -- Assign default 'free' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  
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
      -- Log error but don't block user creation
      RAISE WARNING 'Failed to send admin notification email: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Set the Supabase configuration (these should be set via ALTER DATABASE but we'll use a safer approach)
-- Note: These settings should ideally be set at the database level, but for now we'll rely on edge functions
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function to create user profile and role on signup. Requires app.settings.supabase_url and app.settings.supabase_anon_key to be set for email notifications.';