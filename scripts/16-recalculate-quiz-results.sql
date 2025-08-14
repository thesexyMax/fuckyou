-- Script to recalculate all quiz results correctly

-- First, let's create a more robust function to calculate individual answer correctness
CREATE OR REPLACE FUNCTION public.recalculate_quiz_answer_correctness(answer_id_param UUID)
RETURNS void AS $$
DECLARE
  selected_option_id_var UUID;
  question_id_var UUID;
  is_correct_var BOOLEAN := FALSE;
  points_var INTEGER := 0;
  question_points INTEGER := 1;
BEGIN
  -- Get the answer details
  SELECT selected_option_id, question_id 
  INTO selected_option_id_var, question_id_var
  FROM public.quiz_answers 
  WHERE id = answer_id_param;
  
  -- Get question points
  SELECT points INTO question_points
  FROM public.quiz_questions 
  WHERE id = question_id_var;
  
  -- Check if the selected option is correct
  IF selected_option_id_var IS NOT NULL THEN
    SELECT is_correct INTO is_correct_var
    FROM public.quiz_options 
    WHERE id = selected_option_id_var;
    
    -- If correct, award points
    IF is_correct_var = TRUE THEN
      points_var := question_points;
    END IF;
  END IF;
  
  -- Update the answer with correct values
  UPDATE public.quiz_answers
  SET 
    is_correct = is_correct_var,
    points_earned = points_var
  WHERE id = answer_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate all answers for a specific attempt
CREATE OR REPLACE FUNCTION public.recalculate_attempt_answers(attempt_id_param UUID)
RETURNS void AS $$
DECLARE
  answer_record RECORD;
BEGIN
  -- Loop through all answers for this attempt
  FOR answer_record IN 
    SELECT id FROM public.quiz_answers WHERE attempt_id = attempt_id_param
  LOOP
    PERFORM public.recalculate_quiz_answer_correctness(answer_record.id);
  END LOOP;
  
  -- Now recalculate the attempt totals
  PERFORM public.calculate_quiz_score(attempt_id_param);
END;
$$ LANGUAGE plpgsql;

-- Recalculate all existing quiz attempts
DO $$
DECLARE
  attempt_record RECORD;
BEGIN
  -- Loop through all submitted attempts
  FOR attempt_record IN 
    SELECT id FROM public.quiz_attempts 
    WHERE status IN ('submitted', 'auto_submitted')
  LOOP
    PERFORM public.recalculate_attempt_answers(attempt_record.id);
  END LOOP;
END;
$$;

-- Update the calculate_quiz_score function to be more robust
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
  
  -- Count correct answers and total points from quiz_answers table
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
  
  -- Log the calculation for debugging
  RAISE NOTICE 'Calculated scores for attempt %: % correct out of % questions (%.2f%%)', 
    attempt_id_param, correct_answers_count, total_questions_count, score_percent;
END;
$$ LANGUAGE plpgsql;
