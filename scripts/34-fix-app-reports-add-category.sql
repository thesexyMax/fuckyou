-- Add missing category column to app_reports table
ALTER TABLE public.app_reports ADD COLUMN IF NOT EXISTS category TEXT;

-- Update existing reports to have a default category
UPDATE public.app_reports SET category = 'other' WHERE category IS NULL;

-- Add constraint to ensure category is one of the valid options
ALTER TABLE public.app_reports ADD CONSTRAINT app_reports_category_check 
CHECK (category IN ('inappropriate_content', 'spam', 'harassment', 'copyright', 'malicious', 'other'));
