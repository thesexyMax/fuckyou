-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  notification_type VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid() OR recipient_id IN (
    SELECT id FROM users WHERE id = (
      SELECT id FROM users WHERE username = current_setting('app.current_user', true)
    )
  ));

CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    sender_id IN (
      SELECT id FROM users WHERE is_admin = true AND id = (
        SELECT id FROM users WHERE username = current_setting('app.current_user', true)
      )
    )
  );

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid() OR recipient_id IN (
    SELECT id FROM users WHERE id = (
      SELECT id FROM users WHERE username = current_setting('app.current_user', true)
    )
  ));

-- Add category column to app_reports if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_reports' AND column_name = 'category') THEN
    ALTER TABLE app_reports ADD COLUMN category VARCHAR(50) DEFAULT 'inappropriate_content';
  END IF;
END $$;
