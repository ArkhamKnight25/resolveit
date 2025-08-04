-- Initialize ResolveIt database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_complainant ON cases(complainant_id);
CREATE INDEX IF NOT EXISTS idx_cases_respondent ON cases(respondent_id);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_witnesses_case ON witnesses(case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- Insert admin user (will be created by seed script, but this is backup)
-- Password: admin123 (hashed with bcryptjs)
-- INSERT INTO users (id, email, password, name, role, is_verified, created_at, updated_at) 
-- VALUES (
--   gen_random_uuid(),
--   'admin@resolveit.com',
--   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdB7TQQdGLN2WXq',
--   'System Administrator',
--   'ADMIN',
--   true,
--   NOW(),
--   NOW()
-- ) ON CONFLICT (email) DO NOTHING;
