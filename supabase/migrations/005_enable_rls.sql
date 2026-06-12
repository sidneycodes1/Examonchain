-- Create mapping helper function
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users 
  WHERE privy_id = auth.jwt() ->> 'sub' 
     OR id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_distributions ENABLE ROW LEVEL SECURITY;

-- 1. Policies for users
CREATE POLICY "Users can view and update their own profile" ON users
  FOR ALL USING (id = public.current_user_id());

-- 2. Policies for materials
CREATE POLICY "Users can view and manage their own materials" ON materials
  FOR ALL USING (user_id = public.current_user_id());

-- 3. Policies for quizzes
CREATE POLICY "Users can view and manage their own quizzes" ON quizzes
  FOR ALL USING (user_id = public.current_user_id());

-- 4. Policies for questions
CREATE POLICY "Users can view questions of their own quizzes" ON questions
  FOR ALL USING (
    quiz_id IN (
      SELECT id FROM quizzes WHERE user_id = public.current_user_id()
    )
  );

-- 5. Policies for options
CREATE POLICY "Users can view options of their own quizzes" ON options
  FOR ALL USING (
    question_id IN (
      SELECT q.id FROM questions q
      JOIN quizzes qz ON qz.id = q.quiz_id
      WHERE qz.user_id = public.current_user_id()
    )
  );

-- 6. Policies for quiz_results
CREATE POLICY "Users can view and manage their own quiz results" ON quiz_results
  FOR ALL USING (user_id = public.current_user_id());

-- 7. Policies for user_answers
CREATE POLICY "Users can view and manage their own quiz answers" ON user_answers
  FOR ALL USING (
    quiz_result_id IN (
      SELECT id FROM quiz_results WHERE user_id = public.current_user_id()
    )
  );

-- 8. Policies for token_distributions
CREATE POLICY "Users can view their own token distributions" ON token_distributions
  FOR ALL USING (user_id = public.current_user_id());
