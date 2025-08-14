-- Add view_count column to student_apps table for real analytics
ALTER TABLE student_apps ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_student_apps_view_count ON student_apps(view_count);

-- Update existing apps with random view counts (for demo purposes)
UPDATE student_apps SET view_count = FLOOR(RANDOM() * 500) + 50 WHERE view_count = 0;

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_app_view_count(app_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE student_apps 
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = NOW()
  WHERE id = app_id;
END;
$$ LANGUAGE plpgsql;
