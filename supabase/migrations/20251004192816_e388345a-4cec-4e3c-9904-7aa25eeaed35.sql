-- Update trigger to send admin notification emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  VALUES (NEW.id, 'free');
  
  -- Send admin notification via edge function (async, won't block signup)
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-user-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'type', 'admin_notification',
      'recipientEmail', NEW.email,
      'recipientName', COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
  );
  
  RETURN NEW;
END;
$function$;