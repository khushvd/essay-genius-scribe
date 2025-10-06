-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to run auto-complete-essays every 6 hours
SELECT cron.schedule(
  'auto-complete-essays-every-6-hours',
  '0 */6 * * *',  -- At minute 0 past every 6th hour (00:00, 06:00, 12:00, 18:00 UTC)
  $$
  SELECT
    net.http_post(
      url := 'https://fsrelhcbfrpfprmzkjmo.supabase.co/functions/v1/auto-complete-essays',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcmVsaGNiZnJwZnBybXpram1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MTk3ODAsImV4cCI6MjA3NTA5NTc4MH0.UsjZWRyhc458GYuPqBdJWgHjDanJEcCTuLu3srCvsWA'
      ),
      body := jsonb_build_object('source', 'cron')
    ) as request_id;
  $$
);