-- Create courses table for organizing quizzes
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(50) UNIQUE NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Quiz type and timing
  quiz_type VARCHAR(20) NOT NULL CHECK (quiz_type IN ('live', 'unlive')),
  password VARCHAR(255) NOT NULL, -- All quizzes are password protected
  
  -- Timing settings
  duration_minutes INTEGER NOT NULL DEFAULT 60, -- Quiz duration in minutes
  start_time TIMESTAMP WITH TIME ZONE, -- For live quizzes - when quiz starts
  end_time TIMESTAMP WITH TIME ZONE, -- For unlive quizzes - deadline
  login_window_minutes INTEGER DEFAULT 10, -- How early users can login for live quiz
  
  -- Instructions and settings
  instructions TEXT,
  show_results_immediately BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT TRUE,
  allow_review BOOLEAN DEFAULT TRUE,
  max_attempts INTEGER DEFAULT 1,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_published BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_image_url TEXT, -- Optional image for question
  question_type VARCHAR(20) NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  points INTEGER NOT NULL DEFAULT 1,
  explanation TEXT, -- Explanation shown after answering
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, question_number)
);

-- Create quiz options table (for multiple choice questions)
CREATE TABLE IF NOT EXISTS public.quiz_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_letter CHAR(1) NOT NULL CHECK (option_letter IN ('A', 'B', 'C', 'D', 'E')),
  option_text TEXT,
  option_image_url TEXT, -- Optional image for option
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(question_id, option_letter)
);

-- Create quiz attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_remaining_seconds INTEGER, -- Remaining time when submitted
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'abandoned')),
  
  -- Scores (calculated after submission)
  total_questions INTEGER,
  correct_answers INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  score_percentage DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, user_id, attempt_number)
);

-- Create quiz answers table
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.quiz_options(id) ON DELETE SET NULL, -- For multiple choice
  answer_text TEXT, -- For short answer questions
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

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

-- Create function to auto-submit expired quiz attempts
CREATE OR REPLACE FUNCTION public.auto_submit_expired_quizzes()
RETURNS void AS $$
BEGIN
  -- Auto-submit live quizzes that have exceeded their time limit
  UPDATE public.quiz_attempts 
  SET 
    status = 'auto_submitted',
    submitted_at = NOW(),
    time_remaining_seconds = 0,
    updated_at = NOW()
  WHERE status = 'in_progress'
    AND id IN (
      SELECT qa.id 
      FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      WHERE q.quiz_type = 'live' 
        AND qa.started_at + INTERVAL '1 minute' * q.duration_minutes < NOW()
    );
    
  -- Auto-submit unlive quizzes that have exceeded their deadline
  UPDATE public.quiz_attempts 
  SET 
    status = 'auto_submitted',
    submitted_at = NOW(),
    time_remaining_seconds = 0,
    updated_at = NOW()
  WHERE status = 'in_progress'
    AND id IN (
      SELECT qa.id 
      FROM public.quiz_attempts qa
      JOIN public.quizzes q ON qa.quiz_id = q.id
      WHERE q.quiz_type = 'unlive' 
        AND q.end_time < NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate quiz scores
CREATE OR REPLACE FUNCTION public.calculate_quiz_score(attempt_id_param UUID)
RETURNS void AS $$
DECLARE
  total_questions_count INTEGER;
  correct_answers_count INTEGER;
  total_points_earned INTEGER;
  score_percent DECIMAL(5,2);
BEGIN
  -- Count total questions for this quiz attempt
  SELECT COUNT(qq.id) INTO total_questions_count
  FROM public.quiz_questions qq
  JOIN public.quiz_attempts qa ON qq.quiz_id = qa.quiz_id
  WHERE qa.id = attempt_id_param;
  
  -- Count correct answers and total points
  SELECT 
    COUNT(CASE WHEN qans.is_correct = true THEN 1 END),
    COALESCE(SUM(qans.points_earned), 0)
  INTO correct_answers_count, total_points_earned
  FROM public.quiz_answers qans
  WHERE qans.attempt_id = attempt_id_param;
  
  -- Calculate percentage
  IF total_questions_count > 0 THEN
    score_percent := (correct_answers_count::DECIMAL / total_questions_count::DECIMAL) * 100;
  ELSE
    score_percent := 0;
  END IF;
  
  -- Update the attempt with calculated scores
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
  -- Only calculate when status changes to submitted or auto_submitted
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

-- Enable RLS for all quiz tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- Create policies for courses
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Create policies for quizzes
CREATE POLICY "Anyone can view published quizzes" ON public.quizzes FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can view all quizzes" ON public.quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can manage quizzes" ON public.quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Create policies for quiz questions
CREATE POLICY "Users can view questions of published quizzes" ON public.quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes WHERE id = quiz_id AND is_published = true)
);
CREATE POLICY "Admins can manage quiz questions" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Create policies for quiz options
CREATE POLICY "Users can view options of published quiz questions" ON public.quiz_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quiz_questions qq 
    JOIN public.quizzes q ON qq.quiz_id = q.id 
    WHERE qq.id = question_id AND q.is_published = true
  )
);
CREATE POLICY "Admins can manage quiz options" ON public.quiz_options FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Create policies for quiz attempts
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts" ON public.quiz_attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all attempts" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Create policies for quiz answers
CREATE POLICY "Users can manage own answers" ON public.quiz_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quiz_attempts WHERE id = attempt_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all answers" ON public.quiz_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Insert sample courses
INSERT INTO public.courses (name, description, code, created_by) VALUES
('Computer Science', 'Programming and software development courses', 'CS', (SELECT id FROM public.users WHERE is_admin = true LIMIT 1)),
('Mathematics', 'Mathematical concepts and problem solving', 'MATH', (SELECT id FROM public.users WHERE is_admin = true LIMIT 1)),
('Physics', 'Physical sciences and laboratory work', 'PHYS', (SELECT id FROM public.users WHERE is_admin = true LIMIT 1)),
('Chemistry', 'Chemical processes and reactions', 'CHEM', (SELECT id FROM public.users WHERE is_admin = true LIMIT 1)),
('English', 'Language arts and literature', 'ENG', (SELECT id FROM public.users WHERE is_admin = true LIMIT 1))
ON CONFLICT (code) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_type ON public.quizzes(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_published ON public.quizzes(is_published);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id ON public.quiz_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON public.quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id ON public.quiz_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON public.quiz_answers(question_id);
