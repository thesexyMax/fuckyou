-- Add social links columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS other_social_url TEXT;

-- Add helpful comment
COMMENT ON COLUMN users.instagram_url IS 'Instagram profile URL';
COMMENT ON COLUMN users.github_url IS 'GitHub profile URL';
COMMENT ON COLUMN users.facebook_url IS 'Facebook profile URL';
COMMENT ON COLUMN users.other_social_url IS 'Other social media profile URL';
