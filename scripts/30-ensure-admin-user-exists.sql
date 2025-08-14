-- Ensure the admin user exists in the users table
-- This fixes the foreign key constraint violation

-- First, check if the user exists and insert if not
INSERT INTO users (
    id,
    student_id,
    username,
    password,
    full_name,
    major,
    graduation_year,
    bio,
    avatar_url,
    is_admin,
    is_banned,
    banned_reason,
    banned_at,
    instagram_url,
    github_url,
    facebook_url,
    other_social_url,
    created_at,
    updated_at
) VALUES (
    'cf4359d3-d1c0-4843-89f9-7a22e6e09ed0',
    0,
    '0',
    'admin123',
    'Admin',
    NULL,
    NULL,
    NULL,
    NULL,
    true,
    false,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '2025-08-13T18:56:02.37779+00:00',
    '2025-08-13T18:56:02.37779+00:00'
) ON CONFLICT (id) DO UPDATE SET
    is_admin = EXCLUDED.is_admin,
    updated_at = NOW();

-- Also ensure the events.created_by column is properly typed as UUID
-- First, let's check if we need to convert any existing data
DO $$
BEGIN
    -- Check if the column is character varying and needs conversion
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'created_by' 
        AND data_type = 'character varying'
    ) THEN
        -- Convert the column to UUID type
        ALTER TABLE events ALTER COLUMN created_by TYPE UUID USING created_by::UUID;
    END IF;
END $$;

-- Ensure the foreign key constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'events_created_by_fkey'
    ) THEN
        ALTER TABLE events 
        ADD CONSTRAINT events_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
END $$;
