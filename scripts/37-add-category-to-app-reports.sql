-- Add missing category column to app_reports table
ALTER TABLE public.app_reports 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'other';

-- Add constraint for category values
ALTER TABLE public.app_reports 
ADD CONSTRAINT app_reports_category_check 
CHECK (category IN ('spam', 'inappropriate', 'copyright', 'harassment', 'fake', 'other'));

-- Update existing reports to have a default category
UPDATE public.app_reports 
SET category = 'other' 
WHERE category IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_app_reports_category ON public.app_reports(category);
CREATE INDEX IF NOT EXISTS idx_app_reports_status ON public.app_reports(status);
