-- Fix RLS policies for event_registrations table
-- Since the app uses localStorage authentication, disable RLS to allow registrations

-- Disable RLS for event_registrations table
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be blocking insertions
DROP POLICY IF EXISTS "Users can register for events" ON event_registrations;
DROP POLICY IF EXISTS "Users can view their registrations" ON event_registrations;
DROP POLICY IF EXISTS "event_registrations_insert_policy" ON event_registrations;
DROP POLICY IF EXISTS "event_registrations_select_policy" ON event_registrations;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_user ON event_registrations(event_id, user_id);

-- Add unique constraint to prevent duplicate registrations
ALTER TABLE event_registrations 
ADD CONSTRAINT unique_event_user_registration 
UNIQUE (event_id, user_id);
