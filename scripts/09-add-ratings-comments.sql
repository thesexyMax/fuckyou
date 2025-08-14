-- Add app ratings table
CREATE TABLE IF NOT EXISTS app_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID REFERENCES student_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(app_id, user_id)
);

-- Add app comments table
CREATE TABLE IF NOT EXISTS app_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID REFERENCES student_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for app_ratings
CREATE POLICY "Anyone can view app ratings" ON app_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert their own ratings" ON app_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own ratings" ON app_ratings FOR UPDATE USING (true);

-- Create policies for app_comments
CREATE POLICY "Anyone can view app comments" ON app_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments" ON app_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own comments" ON app_comments FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own comments" ON app_comments FOR DELETE USING (true);
