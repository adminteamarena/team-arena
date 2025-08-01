-- Fix RLS policies for real-time - the previous migration had syntax errors

-- Verify the policies were created successfully
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

-- Also check if real-time needs additional permissions
-- Grant explicit SELECT permissions to ensure real-time works
GRANT SELECT ON public.match_participants TO anon, authenticated;
GRANT SELECT ON public.matches TO anon, authenticated;