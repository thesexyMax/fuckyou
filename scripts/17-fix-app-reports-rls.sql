-- Fix RLS policies for app_reports table to work with custom authentication
-- The existing policies use auth.uid() which doesn't work with localStorage auth

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create app reports" ON public.app_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.app_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.app_reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.app_reports;

-- Disable RLS for app_reports table since we're using custom auth
ALTER TABLE public.app_reports DISABLE ROW LEVEL SECURITY;

-- Also fix app_ratings table RLS policies
DROP POLICY IF EXISTS "Users can view all ratings" ON public.app_ratings;
DROP POLICY IF EXISTS "Users can create ratings" ON public.app_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.app_ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON public.app_ratings;

-- Disable RLS for app_ratings table
ALTER TABLE public.app_ratings DISABLE ROW LEVEL SECURITY;

-- Fix user_restrictions table RLS policies
DROP POLICY IF EXISTS "Admins can manage restrictions" ON public.user_restrictions;
DROP POLICY IF EXISTS "Users can view own restrictions" ON public.user_restrictions;

-- Disable RLS for user_restrictions table
ALTER TABLE public.user_restrictions DISABLE ROW LEVEL SECURITY;

-- Add missing category column to app_reports table if it doesn't exist
ALTER TABLE public.app_reports ADD COLUMN IF NOT EXISTS category TEXT;

-- Update the reason column to match the new structure (category is separate)
-- No need to modify existing data, just ensure the column exists
