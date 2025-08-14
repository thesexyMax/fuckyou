-- Add missing social_links column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';

-- Create index for better performance on social_links queries
CREATE INDEX IF NOT EXISTS idx_events_social_links ON events USING GIN (social_links);

-- Update any existing events to have empty social_links object if null
UPDATE events SET social_links = '{}' WHERE social_links IS NULL;
