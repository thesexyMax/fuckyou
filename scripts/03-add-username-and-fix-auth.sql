-- Add username field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Update password_hash column to just password (no hashing)
ALTER TABLE users RENAME COLUMN password_hash TO password;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update existing users to have a default username (optional)
UPDATE users SET username = 'user' || student_id WHERE username IS NULL;
