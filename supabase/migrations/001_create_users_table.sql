CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_id TEXT UNIQUE NOT NULL,
  phantom_wallet TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  total_tokens_earned BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_privy_id ON users(privy_id);
