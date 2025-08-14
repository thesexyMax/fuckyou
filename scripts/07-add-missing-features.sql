-- Add is_admin field to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create followers table for follow functionality
CREATE TABLE IF NOT EXISTS followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS for followers table
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Create policies for followers
CREATE POLICY "Users can view all follows" ON followers FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow others" ON followers FOR DELETE USING (auth.uid() = follower_id);

-- Update existing admin user if exists
UPDATE profiles SET is_admin = true WHERE email = 'admin@college.edu';
