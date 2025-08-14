-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order to handle dependencies)
DROP TABLE IF EXISTS public.quiz_answers CASCADE;
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.quiz_options CASCADE;
DROP TABLE IF EXISTS public.quiz_questions CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.app_reports CASCADE;
DROP TABLE IF EXISTS public.app_comments CASCADE;
DROP TABLE IF EXISTS public.app_ratings CASCADE;
DROP TABLE IF EXISTS public.app_likes CASCADE;
DROP TABLE IF EXISTS public.user_follows CASCADE;
DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.student_apps CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table with all required columns
CREATE TABLE public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id INTEGER UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  major TEXT,
  graduation_year INTEGER,
  bio TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  banned_reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE,
  instagram_url TEXT,
  github_url TEXT,
  facebook_url TEXT,
  other_social_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  max_attendees INTEGER,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  created_by VARCHAR(50) REFERENCES public.users(username) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event registrations table
CREATE TABLE public.event_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create student apps table
CREATE TABLE public.student_apps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  github_url TEXT,
  live_url TEXT,
  image_url TEXT,
  tech_stack TEXT[],
  tags TEXT[] DEFAULT '{}',
  created_by VARCHAR(50) REFERENCES public.users(username) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app likes table
CREATE TABLE public.app_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  app_id UUID REFERENCES public.student_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(app_id, user_id)
);

-- Create user follows table
CREATE TABLE public.user_follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create app ratings table
CREATE TABLE public.app_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  app_id UUID REFERENCES public.student_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(app_id, user_id)
);

-- Create app comments table
CREATE TABLE public.app_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  app_id UUID REFERENCES public.student_apps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app reports table
CREATE TABLE public.app_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  app_id UUID REFERENCES public.student_apps(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(50) UNIQUE NOT NULL DEFAULT 'GEN',
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_type VARCHAR(20) NOT NULL CHECK (quiz_type IN ('live', 'unlive')),
  password VARCHAR(255) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  login_window_minutes INTEGER DEFAULT 10,
  instructions TEXT,
  show_results_immediately BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT TRUE,
  allow_review BOOLEAN DEFAULT TRUE,
  max_attempts INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  question_type VARCHAR(20) NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  points INTEGER NOT NULL DEFAULT 1,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, question_number)
);

-- Create quiz options table
CREATE TABLE public.quiz_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_letter CHAR(1) NOT NULL CHECK (option_letter IN ('A', 'B', 'C', 'D', 'E')),
  option_text TEXT,
  option_image_url TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(question_id, option_letter)
);

-- Create quiz attempts table
CREATE TABLE public.quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_remaining_seconds INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'abandoned')),
  total_questions INTEGER,
  correct_answers INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  score_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, user_id, attempt_number)
);

-- Create quiz answers table
CREATE TABLE public.quiz_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.quiz_options(id) ON DELETE SET NULL,
  answer_text TEXT,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- Disable RLS for custom authentication system
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_apps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_student_apps_created_by ON public.student_apps(created_by);
CREATE INDEX IF NOT EXISTS idx_app_likes_app_id ON public.app_likes(app_id);
CREATE INDEX IF NOT EXISTS idx_app_likes_user_id ON public.app_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);

-- Insert admin user
INSERT INTO public.users (
  student_id, 
  username, 
  password, 
  full_name, 
  is_admin
) VALUES (
  0, 
  '0', 
  'admin123', 
  'Admin', 
  true
) ON CONFLICT (student_id) DO NOTHING;

-- Insert sample courses
INSERT INTO public.courses (name, description, code, created_by) VALUES
('General', 'General knowledge and campus quizzes', 'GEN', (SELECT id FROM public.users WHERE is_admin = true LIMIT 1)),
('Computer Science', 'Programming and software development courses', 'CS', (SELECT id FROM public.users WHERE is_admin = true LIMIT 1)),
('Mathematics', 'Mathematical concepts and problem solving', 'MATH', (SELECT id FROM public.users WHERE is_admin = true LIMIT 1)),
('Physics', 'Physical sciences and laboratory work', 'PHYS', (SELECT id FROM public.users WHERE is_admin = true LIMIT 1)),
('Chemistry', 'Chemical processes and reactions', 'CHEM', (SELECT id FROM public.users WHERE is_admin = true LIMIT 1))
ON CONFLICT (code) DO NOTHING;

-- Create quiz leaderboard view
CREATE OR REPLACE VIEW public.quiz_leaderboard AS
SELECT 
  qa.quiz_id,
  q.title as quiz_title,
  c.name as course_name,
  u.id as user_id,
  u.full_name,
  u.username,
  u.avatar_url,
  qa.score_percentage,
  qa.total_points,
  qa.correct_answers,
  qa.total_questions,
  qa.submitted_at,
  qa.time_remaining_seconds,
  ROW_NUMBER() OVER (PARTITION BY qa.quiz_id ORDER BY qa.score_percentage DESC, qa.submitted_at ASC) as rank
FROM public.quiz_attempts qa
JOIN public.quizzes q ON qa.quiz_id = q.id
LEFT JOIN public.courses c ON q.course_id = c.id
JOIN public.users u ON qa.user_id = u.id
WHERE qa.status IN ('submitted', 'auto_submitted')
ORDER BY qa.quiz_id, rank;

-- Create function to calculate quiz scores
CREATE OR REPLACE FUNCTION public.calculate_quiz_score(attempt_id_param UUID)
RETURNS void AS $$
DECLARE
  total_questions_count INTEGER;
  correct_answers_count INTEGER;
  total_points_earned INTEGER;
  score_percent DECIMAL(5,2);
BEGIN
  SELECT COUNT(qq.id) INTO total_questions_count
  FROM public.quiz_questions qq
  JOIN public.quiz_attempts qa ON qq.quiz_id = qa.quiz_id
  WHERE qa.id = attempt_id_param;
  
  SELECT 
    COUNT(CASE WHEN qans.is_correct = true THEN 1 END),
    COALESCE(SUM(qans.points_earned), 0)
  INTO correct_answers_count, total_points_earned
  FROM public.quiz_answers qans
  WHERE qans.attempt_id = attempt_id_param;
  
  IF total_questions_count > 0 THEN
    score_percent := (correct_answers_count::DECIMAL / total_questions_count::DECIMAL) * 100;
  ELSE
    score_percent := 0;
  END IF;
  
  UPDATE public.quiz_attempts
  SET 
    total_questions = total_questions_count,
    correct_answers = correct_answers_count,
    total_points = total_points_earned,
    score_percentage = score_percent,
    updated_at = NOW()
  WHERE id = attempt_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to calculate scores when quiz is submitted
CREATE OR REPLACE FUNCTION public.trigger_calculate_quiz_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('submitted', 'auto_submitted') AND OLD.status = 'in_progress' THEN
    PERFORM public.calculate_quiz_score(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quiz_score_calculation ON public.quiz_attempts;
CREATE TRIGGER trigger_quiz_score_calculation
  AFTER UPDATE ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_quiz_score();
