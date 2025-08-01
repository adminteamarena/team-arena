-- Verify and ensure real-time configuration is working properly
-- This migration ensures that real-time events are properly configured

-- Check current publication tables
SELECT 
    schemaname,
    tablename,
    'Currently in supabase_realtime publication' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public'
ORDER BY tablename;

-- Make sure the tables have the right replica identity
SELECT 
    n.nspname as schemaname,
    c.relname as tablename,
    c.relreplident
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
AND c.relname IN ('match_participants', 'matches')
ORDER BY c.relname;

-- Ensure the tables are properly configured for real-time
-- Drop and re-add to ensure proper configuration
ALTER PUBLICATION supabase_realtime DROP TABLE public.match_participants;
ALTER PUBLICATION supabase_realtime DROP TABLE public.matches;

-- Re-add with explicit configuration
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- Ensure proper replica identity for real-time changes
ALTER TABLE public.match_participants REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;

-- Grant necessary permissions
GRANT SELECT ON public.match_participants TO anon, authenticated;
GRANT SELECT ON public.matches TO anon, authenticated;

-- Verify the final configuration
SELECT 
    schemaname,
    tablename,
    'Added to supabase_realtime publication' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public'
AND tablename IN ('match_participants', 'matches')
ORDER BY tablename;