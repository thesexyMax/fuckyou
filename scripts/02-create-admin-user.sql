-- Update a user to admin role (replace with actual email)
-- This script should be run after the first user signs up
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com'; -- Replace with your admin email

-- Create some sample data for testing (optional)
-- You can remove this section if you don't want sample data

-- Sample events
INSERT INTO events (title, description, event_date, location, max_attendees, created_by) 
SELECT 
  'Welcome Week Mixer',
  'Join us for a fun mixer to meet new students and make connections!',
  NOW() + INTERVAL '7 days',
  'Student Center Main Hall',
  100,
  id
FROM profiles 
WHERE role = 'admin' 
LIMIT 1;

INSERT INTO events (title, description, event_date, location, max_attendees, created_by) 
SELECT 
  'Tech Talk: AI in Education',
  'Learn about the latest developments in AI and how they''re transforming education.',
  NOW() + INTERVAL '14 days',
  'Engineering Building Room 201',
  50,
  id
FROM profiles 
WHERE role = 'admin' 
LIMIT 1;

-- Sample apps
INSERT INTO apps (title, description, github_url, demo_url, tags, created_by) 
SELECT 
  'Campus Food Tracker',
  'A web app to track dining hall menus and nutritional information across campus.',
  'https://github.com/example/campus-food-tracker',
  'https://campus-food-tracker.vercel.app',
  ARRAY['react', 'nextjs', 'food', 'campus'],
  id
FROM profiles 
WHERE role = 'admin' 
LIMIT 1;

INSERT INTO apps (title, description, github_url, demo_url, tags, created_by) 
SELECT 
  'Study Group Finder',
  'Connect with classmates and form study groups for your courses.',
  'https://github.com/example/study-group-finder',
  'https://study-groups.vercel.app',
  ARRAY['vue', 'education', 'social', 'students'],
  id
FROM profiles 
WHERE role = 'admin' 
LIMIT 1;
