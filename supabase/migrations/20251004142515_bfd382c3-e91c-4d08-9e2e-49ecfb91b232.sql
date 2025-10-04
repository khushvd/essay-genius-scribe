-- Assign initial admins (function to get user by email)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = _email LIMIT 1;
$$;

-- Assign admin roles to initial admins
DO $$
DECLARE
  admin1_id UUID;
  admin2_id UUID;
BEGIN
  -- Get user IDs
  admin1_id := public.get_user_id_by_email('khushvardhandembla@gmail.com');
  admin2_id := public.get_user_id_by_email('simran.sachdeva.official@gmail.com');
  
  -- Assign admin role to first admin (only if user exists and doesn't have role)
  IF admin1_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin1_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Assign admin role to second admin (only if user exists and doesn't have role)
  IF admin2_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin2_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Create essay_analytics table for tracking suggestion interactions
CREATE TABLE IF NOT EXISTS public.essay_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  analysis_id TEXT NOT NULL,
  suggestion_id TEXT NOT NULL,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('critical', 'enhancement', 'personalization')),
  action TEXT NOT NULL CHECK (action IN ('applied', 'dismissed', 'ignored')),
  action_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_text TEXT,
  suggested_text TEXT,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on essay_analytics
ALTER TABLE public.essay_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for essay_analytics
CREATE POLICY "Writers can view their own essay analytics"
ON public.essay_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.essays
    WHERE essays.id = essay_analytics.essay_id
    AND essays.writer_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all essay analytics"
ON public.essay_analytics
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert essay analytics"
ON public.essay_analytics
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.essays
    WHERE essays.id = essay_analytics.essay_id
    AND essays.writer_id = auth.uid()
  )
);

-- Create essay_scores table for before/after scoring
CREATE TABLE IF NOT EXISTS public.essay_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  score_type TEXT NOT NULL CHECK (score_type IN ('initial', 'post_feedback', 'final')),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  clarity_score INTEGER CHECK (clarity_score >= 0 AND clarity_score <= 100),
  impact_score INTEGER CHECK (impact_score >= 0 AND impact_score <= 100),
  authenticity_score INTEGER CHECK (authenticity_score >= 0 AND authenticity_score <= 100),
  coherence_score INTEGER CHECK (coherence_score >= 0 AND coherence_score <= 100),
  ai_reasoning TEXT,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scored_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on essay_scores
ALTER TABLE public.essay_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for essay_scores
CREATE POLICY "Writers can view their own essay scores"
ON public.essay_scores
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.essays
    WHERE essays.id = essay_scores.essay_id
    AND essays.writer_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all essay scores"
ON public.essay_scores
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert essay scores"
ON public.essay_scores
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert essay scores"
ON public.essay_scores
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.essays
    WHERE essays.id = essay_scores.essay_id
    AND essays.writer_id = auth.uid()
  )
);

CREATE POLICY "Admins can update essay scores"
ON public.essay_scores
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Enhance successful_essays table with portfolio data
ALTER TABLE public.successful_essays
ADD COLUMN IF NOT EXISTS writer_resume TEXT,
ADD COLUMN IF NOT EXISTS writer_questionnaire JSONB,
ADD COLUMN IF NOT EXISTS essay_title TEXT,
ADD COLUMN IF NOT EXISTS degree_level TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_essay_analytics_essay_id ON public.essay_analytics(essay_id);
CREATE INDEX IF NOT EXISTS idx_essay_analytics_action ON public.essay_analytics(action);
CREATE INDEX IF NOT EXISTS idx_essay_scores_essay_id ON public.essay_scores(essay_id);
CREATE INDEX IF NOT EXISTS idx_essay_scores_score_type ON public.essay_scores(score_type);