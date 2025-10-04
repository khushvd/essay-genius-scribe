-- Make essay title optional
ALTER TABLE public.essays 
ALTER COLUMN title DROP NOT NULL;