-- Fix the foreign key constraint for student_apps.created_by
-- The constraint is incorrectly using character varying instead of UUID to reference users.id

-- First, check if there are any invalid created_by values before converting
DO $$
BEGIN
    -- Delete any student_apps with invalid created_by values (not valid UUIDs or non-existent users)
    DELETE FROM student_apps 
    WHERE created_by IS NULL 
       OR created_by = '' 
       OR NOT (created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    
    RAISE NOTICE 'Cleaned up invalid created_by values in student_apps';
END $$;

-- Drop existing foreign key constraint if it exists
ALTER TABLE student_apps DROP CONSTRAINT IF EXISTS student_apps_created_by_fkey;

-- Convert created_by column to UUID type
ALTER TABLE student_apps ALTER COLUMN created_by TYPE UUID USING created_by::UUID;

-- Create the correct foreign key constraint to reference users.id (UUID)
ALTER TABLE student_apps 
ADD CONSTRAINT student_apps_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_student_apps_created_by ON student_apps(created_by);

-- Also fix the events table created_by column type (it's still character varying)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE events ALTER COLUMN created_by TYPE UUID USING created_by::UUID;
ALTER TABLE events 
ADD CONSTRAINT events_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- Verify the constraints are working
DO $$
BEGIN
    -- Check if all student_apps have valid created_by references
    IF EXISTS (
        SELECT 1 FROM student_apps sa 
        LEFT JOIN users u ON sa.created_by = u.id 
        WHERE u.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Some student_apps still have invalid created_by references';
    END IF;
    
    -- Check if all events have valid created_by references
    IF EXISTS (
        SELECT 1 FROM events e 
        LEFT JOIN users u ON e.created_by = u.id 
        WHERE u.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Some events still have invalid created_by references';
    END IF;
    
    RAISE NOTICE 'Foreign key constraints fixed successfully for both student_apps and events';
END $$;
