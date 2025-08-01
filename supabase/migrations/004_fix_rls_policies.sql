-- Fix infinite recursion in RLS policies
-- Drop existing policies that might have recursion issues
DROP POLICY IF EXISTS "Users can view all matches" ON public.matches;
DROP POLICY IF EXISTS "Users can create matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can delete their own matches" ON public.matches;

-- Create new, simpler RLS policies for matches table
CREATE POLICY "Enable read access for all users" ON public.matches
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.matches
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for match creators only" ON public.matches
    FOR UPDATE USING (auth.uid() = organizer_id)
    WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Enable delete for match creators only" ON public.matches
    FOR DELETE USING (auth.uid() = organizer_id);

-- Fix match_participants policies
DROP POLICY IF EXISTS "Users can view match participants" ON public.match_participants;
DROP POLICY IF EXISTS "Users can join matches" ON public.match_participants;
DROP POLICY IF EXISTS "Users can leave matches" ON public.match_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON public.match_participants;

CREATE POLICY "Enable read access for all users" ON public.match_participants
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.match_participants
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for participant users only" ON public.match_participants
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for participant users only" ON public.match_participants
    FOR DELETE USING (auth.uid() = user_id);

-- Fix match_chat policies
DROP POLICY IF EXISTS "Users can view match chat" ON public.match_chat;
DROP POLICY IF EXISTS "Users can send messages" ON public.match_chat;

CREATE POLICY "Enable read access for all users" ON public.match_chat
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.match_chat
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Make sure RLS is enabled on all tables
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_chat ENABLE ROW LEVEL SECURITY; 