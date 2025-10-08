-- Insert Indian School of Business
INSERT INTO public.colleges (name, country, tier) 
VALUES ('Indian School of Business', 'India', 'premium')
ON CONFLICT DO NOTHING;

-- Insert programmes for Indian School of Business
DO $$
DECLARE
  college_uuid uuid;
BEGIN
  SELECT id INTO college_uuid FROM public.colleges WHERE name = 'Indian School of Business';
  
  IF college_uuid IS NOT NULL THEN
    INSERT INTO public.programmes (college_id, name, english_variant)
    VALUES 
      (college_uuid, 'PGP', 'american'),
      (college_uuid, 'PGP-YL', 'american'),
      (college_uuid, 'IVI', 'american'),
      (college_uuid, 'PGP MFAB', 'american'),
      (college_uuid, 'Other', 'american')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;