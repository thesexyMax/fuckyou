-- Add the missing event_id_suffix column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_id_suffix text;

-- Update existing events to have a random 4-digit suffix
UPDATE events 
SET event_id_suffix = LPAD((RANDOM() * 9999)::int::text, 4, '0')
WHERE event_id_suffix IS NULL;

-- Make the column NOT NULL after populating existing records
ALTER TABLE events ALTER COLUMN event_id_suffix SET NOT NULL;

-- Add index for better performance on event URL lookups
CREATE INDEX IF NOT EXISTS idx_events_event_id_suffix ON events(event_id_suffix);
