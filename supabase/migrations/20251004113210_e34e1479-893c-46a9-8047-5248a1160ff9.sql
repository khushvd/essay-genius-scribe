-- Create enum for English variants
CREATE TYPE english_variant AS ENUM ('british', 'american');

-- Create enum for essay status
CREATE TYPE essay_status AS ENUM ('draft', 'in_review', 'completed');

-- Create colleges table
CREATE TABLE public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create programmes table
CREATE TABLE public.programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  english_variant english_variant NOT NULL DEFAULT 'american',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create profiles table for writers
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create essays table
CREATE TABLE public.essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status essay_status DEFAULT 'draft',
  cv_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create successful_essays table (knowledge base)
CREATE TABLE public.successful_essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE CASCADE,
  essay_content TEXT NOT NULL,
  key_strategies JSONB,
  performance_score INTEGER CHECK (performance_score >= 1 AND performance_score <= 10),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.successful_essays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for colleges (readable by all authenticated users)
CREATE POLICY "Authenticated users can view colleges"
  ON public.colleges FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for programmes (readable by all authenticated users)
CREATE POLICY "Authenticated users can view programmes"
  ON public.programmes FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for essays
CREATE POLICY "Writers can view their own essays"
  ON public.essays FOR SELECT
  USING (auth.uid() = writer_id);

CREATE POLICY "Writers can create their own essays"
  ON public.essays FOR INSERT
  WITH CHECK (auth.uid() = writer_id);

CREATE POLICY "Writers can update their own essays"
  ON public.essays FOR UPDATE
  USING (auth.uid() = writer_id);

CREATE POLICY "Writers can delete their own essays"
  ON public.essays FOR DELETE
  USING (auth.uid() = writer_id);

-- RLS Policies for successful_essays (readable by all authenticated users)
CREATE POLICY "Authenticated users can view successful essays"
  ON public.successful_essays FOR SELECT
  TO authenticated
  USING (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to update essays updated_at
CREATE TRIGGER update_essays_updated_at
  BEFORE UPDATE ON public.essays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert some sample colleges and programmes
INSERT INTO public.colleges (name, country) VALUES
  ('Harvard University', 'USA'),
  ('Oxford University', 'UK'),
  ('Stanford University', 'USA'),
  ('Cambridge University', 'UK'),
  ('MIT', 'USA');

INSERT INTO public.programmes (college_id, name, english_variant)
SELECT 
  c.id,
  p.name,
  CASE WHEN c.country = 'UK' THEN 'british'::english_variant ELSE 'american'::english_variant END
FROM public.colleges c
CROSS JOIN (VALUES
  ('Computer Science'),
  ('Business Administration'),
  ('Medicine'),
  ('Engineering'),
  ('Law')
) AS p(name);