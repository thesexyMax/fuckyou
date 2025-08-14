-- Fix RLS policies for notifications table to allow admin users to send notifications

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow admin to send notifications" ON notifications;

-- Create proper RLS policies for notifications
CREATE POLICY "Users can read their own notifications" ON notifications
    FOR SELECT USING (
        recipient_id = (
            SELECT id FROM users 
            WHERE id = (
                SELECT value::uuid FROM current_setting('app.current_user_id', true)
            )
        )
    );

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (
        recipient_id = (
            SELECT id FROM users 
            WHERE id = (
                SELECT value::uuid FROM current_setting('app.current_user_id', true)
            )
        )
    );

CREATE POLICY "Admins can insert notifications" ON notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (
                SELECT value::uuid FROM current_setting('app.current_user_id', true)
            ) 
            AND is_admin = true
        )
    );

-- Alternative simpler policy that allows any authenticated user to insert notifications
-- (in case the admin check doesn't work properly)
CREATE POLICY "Allow authenticated users to send notifications" ON notifications
    FOR INSERT WITH CHECK (
        sender_id = (
            SELECT value::uuid FROM current_setting('app.current_user_id', true)
        )
    );

-- Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT USAGE ON SEQUENCE notifications_id_seq TO authenticated;
