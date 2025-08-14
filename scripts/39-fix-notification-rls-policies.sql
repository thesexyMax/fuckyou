-- Fix RLS policies for notifications table to allow admin users to insert notifications

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create proper RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (
        user_id = (SELECT id FROM users WHERE username = current_setting('app.current_user', true))
        OR user_id IS NULL -- For broadcast notifications
    );

CREATE POLICY "Admins can insert notifications" ON notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE username = current_setting('app.current_user', true) 
            AND is_admin = true
        )
    );

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (
        user_id = (SELECT id FROM users WHERE username = current_setting('app.current_user', true))
    );

-- Create function to set current user context
CREATE OR REPLACE FUNCTION set_current_user(user_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user', (SELECT username FROM users WHERE id = user_id), true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_current_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_user(UUID) TO anon;
