-- Add missing fields to events table for enhanced admin management
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date timestamp with time zone;
ALTER TABLE events ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_id_suffix text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Update existing events to use event_date if they have date column
UPDATE events SET event_date = date WHERE event_date IS NULL AND date IS NOT NULL;

-- Create unique event ID suffix for existing events
UPDATE events 
SET event_id_suffix = LPAD((RANDOM() * 9999)::int::text, 4, '0')
WHERE event_id_suffix IS NULL;

-- Add user restrictions table for banning system
CREATE TABLE IF NOT EXISTS user_restrictions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  restriction_type text NOT NULL CHECK (restriction_type IN ('cannot_join_events', 'cannot_publish', 'community_restriction')),
  reason text,
  created_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true
);

-- Create RLS policies for user_restrictions (admin only)
ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user restrictions" ON user_restrictions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_user_restrictions_user_id ON user_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restrictions_active ON user_restrictions(is_active);
