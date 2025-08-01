-- Enable real-time subscriptions for notifications table
-- This migration ensures that real-time subscriptions work properly

-- Enable real-time on notifications table (ignore if already exists)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN
    -- Table already added to publication, skip
    NULL;
END
$$;

-- Also ensure real-time is enabled on the users table for user data changes
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
EXCEPTION WHEN duplicate_object THEN
    -- Table already added to publication, skip
    NULL;
END
$$;

-- Add some debug info
SELECT 'Real-time migration completed successfully' AS message; 