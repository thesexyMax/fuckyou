-- Fix the follow system by ensuring the user_follows table exists and works properly
-- Drop the problematic followers table if it exists (this was causing the relation error)
DROP TABLE IF EXISTS followers CASCADE;

-- Ensure user_follows table exists with correct structure
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Disable RLS for custom authentication (as established in script 18)
ALTER TABLE user_follows DISABLE ROW LEVEL SECURITY;

-- Add helpful comment
COMMENT ON TABLE user_follows IS 'Follow system table - RLS disabled for custom authentication, no followers table needed';
