-- Add user banning system to public.users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;

-- Create user restrictions table for more granular control
CREATE TABLE IF NOT EXISTS public.user_restrictions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('cannot_publish', 'cannot_register', 'cannot_comment')),
  reason TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app reports table
CREATE TABLE IF NOT EXISTS public.app_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  app_id UUID REFERENCES public.student_apps(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Add app ratings table if not exists
CREATE TABLE IF NOT EXISTS public.app_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  app_id UUID REFERENCES public.student_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(app_id, user_id)
);

-- Add average_rating column to student_apps table
ALTER TABLE public.student_apps ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE public.student_apps ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
ALTER TABLE public.student_apps ADD COLUMN IF NOT EXISTS total_likes INTEGER DEFAULT 0;

-- Create function to update app ratings
CREATE OR REPLACE FUNCTION public.update_app_ratings()
RETURNS TRIGGER AS $$
BEGIN
  -- Update average rating and total ratings
  UPDATE public.student_apps 
  SET 
    average_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM public.app_ratings 
      WHERE app_id = COALESCE(NEW.app_id, OLD.app_id)
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.app_ratings 
      WHERE app_id = COALESCE(NEW.app_id, OLD.app_id)
    )
  WHERE id = COALESCE(NEW.app_id, OLD.app_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create function to update app likes count
CREATE OR REPLACE FUNCTION public.update_app_likes()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total likes
  UPDATE public.student_apps 
  SET total_likes = (
    SELECT COUNT(*)
    FROM public.app_likes 
    WHERE app_id = COALESCE(NEW.app_id, OLD.app_id)
  )
  WHERE id = COALESCE(NEW.app_id, OLD.app_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for rating updates
DROP TRIGGER IF EXISTS trigger_update_app_ratings_insert ON public.app_ratings;
CREATE TRIGGER trigger_update_app_ratings_insert
  AFTER INSERT ON public.app_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_app_ratings();

DROP TRIGGER IF EXISTS trigger_update_app_ratings_update ON public.app_ratings;
CREATE TRIGGER trigger_update_app_ratings_update
  AFTER UPDATE ON public.app_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_app_ratings();

DROP TRIGGER IF EXISTS trigger_update_app_ratings_delete ON public.app_ratings;
CREATE TRIGGER trigger_update_app_ratings_delete
  AFTER DELETE ON public.app_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_app_ratings();

-- Create triggers for likes updates
DROP TRIGGER IF EXISTS trigger_update_app_likes_insert ON public.app_likes;
CREATE TRIGGER trigger_update_app_likes_insert
  AFTER INSERT ON public.app_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_app_likes();

DROP TRIGGER IF EXISTS trigger_update_app_likes_delete ON public.app_likes;
CREATE TRIGGER trigger_update_app_likes_delete
  AFTER DELETE ON public.app_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_app_likes();

-- Enable RLS for new tables
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for user restrictions
CREATE POLICY "Admins can manage restrictions" ON public.user_restrictions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Users can view own restrictions" ON public.user_restrictions FOR SELECT USING (user_id = auth.uid());

-- Create policies for app reports
CREATE POLICY "Users can create app reports" ON public.app_reports FOR INSERT WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Users can view own reports" ON public.app_reports FOR SELECT USING (auth.uid() = reported_by);
CREATE POLICY "Admins can view all reports" ON public.app_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update reports" ON public.app_reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Create policies for app ratings
CREATE POLICY "Users can view all ratings" ON public.app_ratings FOR SELECT USING (true);
CREATE POLICY "Users can create ratings" ON public.app_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON public.app_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings" ON public.app_ratings FOR DELETE USING (auth.uid() = user_id);

-- Update existing apps with calculated ratings
UPDATE public.student_apps SET 
  average_rating = COALESCE((
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM public.app_ratings 
    WHERE app_id = public.student_apps.id
  ), 0),
  total_ratings = COALESCE((
    SELECT COUNT(*)
    FROM public.app_ratings 
    WHERE app_id = public.student_apps.id
  ), 0),
  total_likes = COALESCE((
    SELECT COUNT(*)
    FROM public.app_likes 
    WHERE app_id = public.student_apps.id
  ), 0);
