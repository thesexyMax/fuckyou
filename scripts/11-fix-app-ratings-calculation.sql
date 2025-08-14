-- Create function to calculate average app ratings
CREATE OR REPLACE FUNCTION calculate_app_average_rating(app_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    avg_rating DECIMAL(3,2);
BEGIN
    SELECT ROUND(AVG(rating::DECIMAL), 2) INTO avg_rating
    FROM app_ratings 
    WHERE app_id = app_uuid;
    
    RETURN COALESCE(avg_rating, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Create view for apps with calculated ratings
CREATE OR REPLACE VIEW apps_with_ratings AS
SELECT 
    sa.*,
    COALESCE(calculate_app_average_rating(sa.id), 0.00) as average_rating,
    COALESCE(rating_counts.total_ratings, 0) as total_ratings,
    COALESCE(like_counts.total_likes, 0) as total_likes
FROM student_apps sa
LEFT JOIN (
    SELECT app_id, COUNT(*) as total_ratings
    FROM app_ratings
    GROUP BY app_id
) rating_counts ON sa.id = rating_counts.app_id
LEFT JOIN (
    SELECT app_id, COUNT(*) as total_likes
    FROM app_likes
    GROUP BY app_id
) like_counts ON sa.id = like_counts.app_id;

-- Grant permissions for the view
GRANT SELECT ON apps_with_ratings TO authenticated;
GRANT SELECT ON apps_with_ratings TO anon;
