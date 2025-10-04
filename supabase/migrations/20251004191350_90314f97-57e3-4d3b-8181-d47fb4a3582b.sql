-- Fix performance score constraint
ALTER TABLE successful_essays DROP CONSTRAINT IF EXISTS successful_essays_performance_score_check;
ALTER TABLE successful_essays ADD CONSTRAINT successful_essays_performance_score_check 
  CHECK ((performance_score >= 0) AND (performance_score <= 100));

-- Add account status enum
CREATE TYPE account_status AS ENUM ('pending', 'approved', 'suspended', 'rejected');

-- Add approval columns to profiles
ALTER TABLE profiles 
  ADD COLUMN account_status account_status NOT NULL DEFAULT 'pending',
  ADD COLUMN approved_by uuid REFERENCES profiles(id),
  ADD COLUMN approved_at timestamptz;

-- Approve existing users (grandfather clause)
UPDATE profiles SET account_status = 'approved' WHERE account_status = 'pending';

-- Create training essays table
CREATE TABLE training_essays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id uuid REFERENCES essays(id) ON DELETE CASCADE NOT NULL,
  original_content text NOT NULL,
  final_content text NOT NULL,
  metadata jsonb,
  suggestions_applied jsonb,
  suggestions_dismissed jsonb,
  manual_edits jsonb,
  before_score jsonb,
  after_score jsonb,
  improvement_metrics jsonb,
  added_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES profiles(id),
  status text DEFAULT 'pending_review',
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on training_essays
ALTER TABLE training_essays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all training essays"
  ON training_essays FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert training essays"
  ON training_essays FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update training essays"
  ON training_essays FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete training essays"
  ON training_essays FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Update RLS policies for essays to check account_status
DROP POLICY IF EXISTS "Writers can view their own essays" ON essays;
CREATE POLICY "Writers can view their own essays" ON essays
  FOR SELECT USING (
    auth.uid() = writer_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND account_status = 'approved')
  );

DROP POLICY IF EXISTS "Writers can create their own essays" ON essays;
CREATE POLICY "Writers can create their own essays" ON essays
  FOR INSERT WITH CHECK (
    auth.uid() = writer_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND account_status = 'approved')
  );

DROP POLICY IF EXISTS "Writers can update their own essays" ON essays;
CREATE POLICY "Writers can update their own essays" ON essays
  FOR UPDATE USING (
    auth.uid() = writer_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND account_status = 'approved')
  );

DROP POLICY IF EXISTS "Writers can delete their own essays" ON essays;
CREATE POLICY "Writers can delete their own essays" ON essays
  FOR DELETE USING (
    auth.uid() = writer_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND account_status = 'approved')
  );

-- Update RLS policies for essay_analytics
DROP POLICY IF EXISTS "Writers can view their own essay analytics" ON essay_analytics;
CREATE POLICY "Writers can view their own essay analytics" ON essay_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM essays 
      WHERE essays.id = essay_analytics.essay_id 
        AND essays.writer_id = auth.uid()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND account_status = 'approved')
    )
  );

-- Update RLS policies for essay_scores
DROP POLICY IF EXISTS "Writers can view their own essay scores" ON essay_scores;
CREATE POLICY "Writers can view their own essay scores" ON essay_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM essays 
      WHERE essays.id = essay_scores.essay_id 
        AND essays.writer_id = auth.uid()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND account_status = 'approved')
    )
  );

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));