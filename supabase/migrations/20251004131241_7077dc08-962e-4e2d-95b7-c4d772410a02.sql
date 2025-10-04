-- Create degree level enum
CREATE TYPE degree_level AS ENUM ('bachelors', 'masters');

-- Add new columns to essays table
ALTER TABLE essays 
ADD COLUMN degree_level degree_level DEFAULT 'bachelors',
ADD COLUMN custom_college_name text,
ADD COLUMN custom_programme_name text,
ADD COLUMN questionnaire_data jsonb;

-- Add CommonApp as a country option
INSERT INTO colleges (name, country, tier) 
VALUES ('CommonApp', 'CommonApp', 'standard')
ON CONFLICT DO NOTHING;