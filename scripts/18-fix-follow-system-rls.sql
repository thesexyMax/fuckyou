-- Fix RLS policies for follow system to work with custom authentication
-- The existing policies use auth.uid() which doesn't work with localStorage auth

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all follows" ON user_follows;
DROP POLICY IF EXISTS "Users can follow others" ON user_follows;
DROP POLICY IF EXISTS "Users can unfollow others" ON user_follows;

-- Disable RLS for user_follows table to work with custom auth
ALTER TABLE user_follows DISABLE ROW LEVEL SECURITY;

-- Also fix the alternative followers table if it exists
DROP POLICY IF EXISTS "Users can view all follows" ON followers;
DROP POLICY IF EXISTS "Users can follow others" ON followers;
DROP POLICY IF EXISTS "Users can unfollow others" ON followers;

-- Disable RLS for followers table as well
ALTER TABLE followers DISABLE ROW LEVEL SECURITY;

-- Add helpful comment
COMMENT ON TABLE user_follows IS 'Follow system table - RLS disabled for custom authentication';
