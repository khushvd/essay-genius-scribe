-- Clear existing data first
TRUNCATE TABLE public.programmes CASCADE;
TRUNCATE TABLE public.colleges CASCADE;

-- Insert 100 colleges across different countries
INSERT INTO public.colleges (name, country) VALUES
-- USA Colleges (40 colleges)
('Harvard University', 'USA'),
('Stanford University', 'USA'),
('Massachusetts Institute of Technology', 'USA'),
('Yale University', 'USA'),
('Princeton University', 'USA'),
('Columbia University', 'USA'),
('University of Pennsylvania', 'USA'),
('Duke University', 'USA'),
('Northwestern University', 'USA'),
('Johns Hopkins University', 'USA'),
('California Institute of Technology', 'USA'),
('University of Chicago', 'USA'),
('Cornell University', 'USA'),
('Brown University', 'USA'),
('Dartmouth College', 'USA'),
('University of California, Berkeley', 'USA'),
('University of California, Los Angeles', 'USA'),
('University of Southern California', 'USA'),
('New York University', 'USA'),
('University of Michigan', 'USA'),
('Carnegie Mellon University', 'USA'),
('University of Virginia', 'USA'),
('Georgetown University', 'USA'),
('Rice University', 'USA'),
('Vanderbilt University', 'USA'),
('University of Notre Dame', 'USA'),
('Emory University', 'USA'),
('University of California, San Diego', 'USA'),
('Boston University', 'USA'),
('Georgia Institute of Technology', 'USA'),
('University of North Carolina at Chapel Hill', 'USA'),
('University of Texas at Austin', 'USA'),
('University of Wisconsin-Madison', 'USA'),
('University of Illinois Urbana-Champaign', 'USA'),
('Washington University in St. Louis', 'USA'),
('University of Washington', 'USA'),
('Boston College', 'USA'),
('Tufts University', 'USA'),
('University of California, Davis', 'USA'),
('University of Florida', 'USA'),

-- UK Colleges (30 colleges)
('University of Oxford', 'UK'),
('University of Cambridge', 'UK'),
('Imperial College London', 'UK'),
('London School of Economics', 'UK'),
('University College London', 'UK'),
('University of Edinburgh', 'UK'),
('King''s College London', 'UK'),
('University of Manchester', 'UK'),
('University of Bristol', 'UK'),
('University of Warwick', 'UK'),
('University of Glasgow', 'UK'),
('Durham University', 'UK'),
('University of Birmingham', 'UK'),
('University of Leeds', 'UK'),
('University of Southampton', 'UK'),
('University of Sheffield', 'UK'),
('University of Nottingham', 'UK'),
('Queen Mary University of London', 'UK'),
('University of York', 'UK'),
('Lancaster University', 'UK'),
('University of Exeter', 'UK'),
('University of Bath', 'UK'),
('University of St Andrews', 'UK'),
('Newcastle University', 'UK'),
('University of Liverpool', 'UK'),
('Cardiff University', 'UK'),
('University of Reading', 'UK'),
('University of Sussex', 'UK'),
('University of Leicester', 'UK'),
('Loughborough University', 'UK'),

-- Canada Colleges (15 colleges)
('University of Toronto', 'Canada'),
('University of British Columbia', 'Canada'),
('McGill University', 'Canada'),
('McMaster University', 'Canada'),
('University of Alberta', 'Canada'),
('University of Waterloo', 'Canada'),
('Western University', 'Canada'),
('Queen''s University', 'Canada'),
('University of Calgary', 'Canada'),
('Dalhousie University', 'Canada'),
('University of Ottawa', 'Canada'),
('Simon Fraser University', 'Canada'),
('University of Victoria', 'Canada'),
('York University', 'Canada'),
('Carleton University', 'Canada'),

-- Australia Colleges (10 colleges)
('Australian National University', 'Australia'),
('University of Melbourne', 'Australia'),
('University of Sydney', 'Australia'),
('University of Queensland', 'Australia'),
('Monash University', 'Australia'),
('University of New South Wales', 'Australia'),
('University of Adelaide', 'Australia'),
('University of Western Australia', 'Australia'),
('University of Technology Sydney', 'Australia'),
('RMIT University', 'Australia'),

-- Other Countries (5 colleges)
('ETH Zurich', 'Other'),
('National University of Singapore', 'Other'),
('University of Hong Kong', 'Other'),
('Tsinghua University', 'Other'),
('University of Amsterdam', 'Other');

-- Insert programmes for colleges
-- Common programmes that will be inserted for each college
WITH college_ids AS (
  SELECT id, country FROM public.colleges
),
programme_template AS (
  SELECT 
    unnest(ARRAY[
      'Computer Science',
      'Business Administration',
      'Engineering',
      'Medicine',
      'Law',
      'Psychology',
      'Economics',
      'Biology',
      'Mathematics',
      'English Literature',
      'History',
      'Political Science'
    ]) AS programme_name
)
INSERT INTO public.programmes (name, college_id, english_variant)
SELECT 
  pt.programme_name,
  ci.id,
  CASE 
    WHEN ci.country = 'UK' THEN 'british'::english_variant
    WHEN ci.country = 'Australia' THEN 'british'::english_variant
    ELSE 'american'::english_variant
  END
FROM college_ids ci
CROSS JOIN programme_template pt;