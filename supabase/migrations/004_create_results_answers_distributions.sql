CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quiz_results_quiz_id ON quiz_results(quiz_id);
CREATE INDEX idx_quiz_results_user_id ON quiz_results(user_id);

CREATE TABLE user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_result_id UUID NOT NULL REFERENCES quiz_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES options(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_answers_quiz_result_id ON user_answers(quiz_result_id);

CREATE TABLE token_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_result_id UUID REFERENCES quiz_results(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  tx_signature TEXT,
  status TEXT DEFAULT 'pending',
  distributed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_token_distributions_user_id ON token_distributions(user_id);
CREATE INDEX idx_token_distributions_quiz_result_id ON token_distributions(quiz_result_id);
