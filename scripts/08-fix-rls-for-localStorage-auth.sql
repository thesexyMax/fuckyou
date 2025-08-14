-- Disable RLS temporarily and create new policies that work with localStorage auth
-- Since we're using localStorage auth instead of Supabase auth, we need to modify the policies

-- Drop existing policies that rely on auth.uid()
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;

DROP POLICY IF EXISTS "Authenticated users can create apps" ON public.student_apps;
DROP POLICY IF EXISTS "Users can update own apps" ON public.student_apps;
DROP POLICY IF EXISTS "Users can delete own apps" ON public.student_apps;

DROP POLICY IF EXISTS "Authenticated users can register" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can cancel own registrations" ON public.event_registrations;

DROP POLICY IF EXISTS "Authenticated users can like apps" ON public.app_likes;
DROP POLICY IF EXISTS "Users can unlike apps" ON public.app_likes;

-- Create new permissive policies for localStorage auth
-- Events policies
CREATE POLICY "Allow all event operations" ON public.events FOR ALL USING (true) WITH CHECK (true);

-- Student apps policies  
CREATE POLICY "Allow all app operations" ON public.student_apps FOR ALL USING (true) WITH CHECK (true);

-- Event registrations policies
CREATE POLICY "Allow all registration operations" ON public.event_registrations FOR ALL USING (true) WITH CHECK (true);

-- App likes policies
CREATE POLICY "Allow all like operations" ON public.app_likes FOR ALL USING (true) WITH CHECK (true);

-- Users policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Allow all user operations" ON public.users FOR ALL USING (true) WITH CHECK (true);
