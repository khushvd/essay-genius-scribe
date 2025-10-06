-- Add last_exported_at timestamp to track exports
ALTER TABLE public.essays 
ADD COLUMN last_exported_at TIMESTAMP WITH TIME ZONE;

-- Create completion_status enum type
CREATE TYPE completion_status AS ENUM ('in_progress', 'completed');

-- Add completion_status column with default
ALTER TABLE public.essays 
ADD COLUMN completion_status completion_status DEFAULT 'in_progress' NOT NULL;

-- Create indexes for performance
CREATE INDEX idx_essays_last_exported_at ON public.essays(last_exported_at);
CREATE INDEX idx_essays_completion_status ON public.essays(completion_status);
CREATE INDEX idx_essays_auto_complete ON public.essays(completion_status, updated_at, last_exported_at) 
WHERE completion_status = 'in_progress';

-- Backfill: Mark old essays (>30 days without updates) as completed
UPDATE essays 
SET completion_status = 'completed' 
WHERE updated_at < NOW() - INTERVAL '30 days';