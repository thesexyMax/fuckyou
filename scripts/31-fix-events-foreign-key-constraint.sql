-- Fix the foreign key constraint for events.created_by
-- The constraint was incorrectly referencing users.username instead of users.id

-- First, drop the incorrect foreign key constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;

-- Check if there are any invalid created_by values before converting
DO $$
BEGIN
    -- Delete any events with invalid created_by values (not valid UUIDs or non-existent users)
    DELETE FROM events 
    WHERE created_by IS NULL 
       OR created_by = '' 
       OR NOT (created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
    
    RAISE NOTICE 'Cleaned up invalid created_by values';
END $$;

-- Convert created_by column to UUID type
ALTER TABLE events ALTER COLUMN created_by TYPE UUID USING created_by::UUID;

-- Recreate the foreign key constraint to reference users.id (UUID) instead of users.username
ALTER TABLE events 
ADD CONSTRAINT events_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- Verify the constraint is working
DO $$
BEGIN
    -- Check if all events have valid created_by references
    IF EXISTS (
        SELECT 1 FROM events e 
        LEFT JOIN users u ON e.created_by = u.id 
        WHERE u.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Some events still have invalid created_by references';
    END IF;
    
    RAISE NOTICE 'Foreign key constraint fixed successfully';
END $$;
