-- Ensure real-time is properly working for match participant changes
-- This migration ensures that both INSERT and DELETE events work correctly

-- First, remove and re-add the tables to the publication to ensure they're properly configured
ALTER PUBLICATION supabase_realtime DROP TABLE public.match_participants;
ALTER PUBLICATION supabase_realtime DROP TABLE public.matches;

-- Re-add the tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- Ensure the tables have the proper replica identity for real-time
ALTER TABLE public.match_participants REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;

-- Grant proper permissions for real-time
GRANT SELECT ON public.match_participants TO anon, authenticated;
GRANT SELECT ON public.matches TO anon, authenticated;

-- Add some debug info
SELECT 
    schemaname,
    tablename,
    'Added to real-time publication' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('match_participants', 'matches');