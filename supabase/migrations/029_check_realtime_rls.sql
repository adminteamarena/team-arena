-- Check and fix RLS policies for real-time functionality
-- Real-time events can be blocked by overly restrictive RLS policies

-- Check current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('match_participants', 'matches')
ORDER BY tablename;

-- Check current policies on match_participants
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'match_participants'
ORDER BY policyname;

-- Ensure anon and authenticated users can SELECT match_participants for real-time
-- This is needed for real-time subscriptions to work
DO $$
BEGIN
    -- Check if we need to create a policy for real-time SELECT access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'match_participants' 
        AND policyname = 'Allow realtime select for all'
    ) THEN
        -- Create a policy that allows SELECT for real-time subscriptions
        CREATE POLICY "Allow realtime select for all" 
        ON public.match_participants 
        FOR SELECT 
        TO anon, authenticated 
        USING (true);
        
        RAISE NOTICE 'Created real-time SELECT policy for match_participants';
    ELSE
        RAISE NOTICE 'Real-time SELECT policy already exists for match_participants';
    END IF;
END $$;

-- Do the same for matches table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'matches' 
        AND policyname = 'Allow realtime select for all'
    ) THEN
        CREATE POLICY "Allow realtime select for all" 
        ON public.matches 
        FOR SELECT 
        TO anon, authenticated 
        USING (true);
        
        RAISE NOTICE 'Created real-time SELECT policy for matches';
    ELSE
        RAISE NOTICE 'Real-time SELECT policy already exists for matches';
    END IF;
END $$;

-- Verify the policies were created
SELECT 
    'match_participants' as table_name,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'match_participants'
AND policyname = 'Allow realtime select for all'

UNION ALL

SELECT 
    'matches' as table_name,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'matches'
AND policyname = 'Allow realtime select for all';