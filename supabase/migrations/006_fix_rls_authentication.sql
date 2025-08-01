-- Fix RLS policies for proper authentication handling
-- The issue is that RLS policies need to properly check for authenticated users

-- Drop the existing policies that might be too restrictive
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.matches;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.matches;
DROP POLICY IF EXISTS "Enable update for match creators only" ON public.matches;
DROP POLICY IF EXISTS "Enable delete for match creators only" ON public.matches;

-- Create new RLS policies that work with Supabase Auth
CREATE POLICY "Allow authenticated users to read matches" ON public.matches
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create matches" ON public.matches
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = organizer_id
    );

CREATE POLICY "Allow organizers to update their matches" ON public.matches
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = organizer_id
    );

CREATE POLICY "Allow organizers to delete their matches" ON public.matches
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = organizer_id
    );

-- Also update match_participants policies to be more permissive
DROP POLICY IF EXISTS "Enable read access for all users" ON public.match_participants;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.match_participants;
DROP POLICY IF EXISTS "Enable update for participant users only" ON public.match_participants;
DROP POLICY IF EXISTS "Enable delete for participant users only" ON public.match_participants;

CREATE POLICY "Allow authenticated users to read participants" ON public.match_participants
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to join matches" ON public.match_participants
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow users to update their own participation" ON public.match_participants
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

CREATE POLICY "Allow users to leave matches" ON public.match_participants
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    );

-- Update match_chat policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.match_chat;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.match_chat;

CREATE POLICY "Allow authenticated users to read chat" ON public.match_chat
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to send messages" ON public.match_chat
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        auth.uid() = user_id
    ); 