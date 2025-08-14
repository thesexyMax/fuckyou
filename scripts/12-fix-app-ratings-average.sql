-- Create function to calculate average app ratings properly
CREATE OR REPLACE FUNCTION calculate_app_average_rating(app_id_param UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    avg_rating DECIMAL(3,2);
BEGIN
    SELECT ROUND(AVG(rating::DECIMAL), 2) INTO avg_rating
    FROM app_ratings 
    WHERE app_id = app_id_param;
    
    RETURN COALESCE(avg_rating, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Update student_apps table to include average_rating column if not exists
ALTER TABLE student_apps 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00;

-- Create trigger to automatically update average rating when ratings change
CREATE OR REPLACE FUNCTION update_app_average_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE student_apps 
    SET average_rating = calculate_app_average_rating(
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.app_id
            ELSE NEW.app_id
        END
    )
    WHERE id = CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.app_id
        ELSE NEW.app_id
    END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for INSERT, UPDATE, DELETE on app_ratings
DROP TRIGGER IF EXISTS trigger_update_app_rating_on_insert ON app_ratings;
DROP TRIGGER IF EXISTS trigger_update_app_rating_on_update ON app_ratings;
DROP TRIGGER IF EXISTS trigger_update_app_rating_on_delete ON app_ratings;

CREATE TRIGGER trigger_update_app_rating_on_insert
    AFTER INSERT ON app_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_average_rating();

CREATE TRIGGER trigger_update_app_rating_on_update
    AFTER UPDATE ON app_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_average_rating();

CREATE TRIGGER trigger_update_app_rating_on_delete
    AFTER DELETE ON app_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_average_rating();

-- Update existing apps with their current average ratings
UPDATE student_apps 
SET average_rating = calculate_app_average_rating(id);
