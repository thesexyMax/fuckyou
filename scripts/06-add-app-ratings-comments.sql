-- Create app ratings table
CREATE TABLE IF NOT EXISTS app_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id uuid REFERENCES student_apps(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(app_id, user_id)
);

-- Create app comments table
CREATE TABLE IF NOT EXISTS app_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id uuid REFERENCES student_apps(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies for app ratings
ALTER TABLE app_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all app ratings" ON app_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own app ratings" ON app_ratings
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own app ratings" ON app_ratings
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own app ratings" ON app_ratings
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Add RLS policies for app comments
ALTER TABLE app_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all app comments" ON app_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own app comments" ON app_comments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own app comments" ON app_comments
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own app comments" ON app_comments
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_ratings_app_id ON app_ratings(app_id);
CREATE INDEX IF NOT EXISTS idx_app_ratings_user_id ON app_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_app_comments_app_id ON app_comments(app_id);
CREATE INDEX IF NOT EXISTS idx_app_comments_user_id ON app_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_app_comments_created_at ON app_comments(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_ratings_updated_at BEFORE UPDATE ON app_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_comments_updated_at BEFORE UPDATE ON app_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
