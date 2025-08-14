-- Fix app_comments table and add username to app_reports
-- Also add category column that was missing

-- First, let's add the missing category column to app_reports if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'app_reports' AND column_name = 'category') THEN
        ALTER TABLE app_reports ADD COLUMN category VARCHAR(50) DEFAULT 'inappropriate';
    END IF;
END $$;

-- Create a view for app_reports with username information
CREATE OR REPLACE VIEW app_reports_with_user AS
SELECT 
    ar.*,
    u.username as reporter_username,
    u.full_name as reporter_full_name
FROM app_reports ar
JOIN users u ON ar.reported_by = u.id;

-- Grant access to the view
GRANT SELECT ON app_reports_with_user TO authenticated;
GRANT SELECT ON app_reports_with_user TO anon;

-- Create function to upsert app ratings (insert or update)
CREATE OR REPLACE FUNCTION upsert_app_rating(
    p_app_id UUID,
    p_user_id UUID,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    rating_id UUID;
BEGIN
    -- Try to update existing rating
    UPDATE app_ratings 
    SET rating = p_rating, 
        comment = p_comment, 
        updated_at = NOW()
    WHERE app_id = p_app_id AND user_id = p_user_id
    RETURNING id INTO rating_id;
    
    -- If no existing rating, insert new one
    IF rating_id IS NULL THEN
        INSERT INTO app_ratings (app_id, user_id, rating, comment)
        VALUES (p_app_id, p_user_id, p_rating, p_comment)
        RETURNING id INTO rating_id;
    END IF;
    
    RETURN rating_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION upsert_app_rating TO authenticated;
