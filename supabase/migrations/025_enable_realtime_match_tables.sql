-- Enable real-time subscriptions for match-related tables
-- This migration ensures that real-time subscriptions work properly for match updates

-- Enable real-time on matches table
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
EXCEPTION WHEN duplicate_object THEN
    -- Table already added to publication, skip
    NULL;
END
$$;

-- Enable real-time on match_participants table
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_participants;
EXCEPTION WHEN duplicate_object THEN
    -- Table already added to publication, skip
    NULL;
END
$$;

-- Enable real-time on match_chat table
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_chat;
EXCEPTION WHEN duplicate_object THEN
    -- Table already added to publication, skip
    NULL;
END
$$;

-- Enable real-time on private_conversations table
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.private_conversations;
EXCEPTION WHEN duplicate_object THEN
    -- Table already added to publication, skip
    NULL;
END
$$;

-- Enable real-time on private_messages table
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
EXCEPTION WHEN duplicate_object THEN
    -- Table already added to publication, skip
    NULL;
END
$$;

-- Add some debug info
SELECT 'Real-time migration for match tables completed successfully' AS message;