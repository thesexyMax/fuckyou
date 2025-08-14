-- Add missing is_featured column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Add index for better performance when filtering featured events
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON public.events(is_featured);

-- Update any existing featured events if needed (optional)
-- UPDATE public.events SET is_featured = TRUE WHERE title ILIKE '%featured%' OR title ILIKE '%special%';
