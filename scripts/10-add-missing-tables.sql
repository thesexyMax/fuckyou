-- Add missing tables for ratings and comments
CREATE TABLE IF NOT EXISTS app_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID REFERENCES student_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(app_id, user_id)
);

CREATE TABLE IF NOT EXISTS app_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID REFERENCES student_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view ratings" ON app_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert their own ratings" ON app_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own ratings" ON app_ratings FOR UPDATE USING (true);

CREATE POLICY "Anyone can view comments" ON app_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON app_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own comments" ON app_comments FOR UPDATE USING (true);
