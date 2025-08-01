-- Fix notification policies to ensure follow notifications can be created
-- This migration ensures notifications can be properly inserted and read

-- First, check if notifications table exists and has proper structure
DO $$
BEGIN
    -- Ensure notifications table has the required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE public.notifications ADD COLUMN type VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'from_user_id') THEN
        ALTER TABLE public.notifications ADD COLUMN from_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'data') THEN
        ALTER TABLE public.notifications ADD COLUMN data JSONB DEFAULT '{}';
    END IF;
END $$;

-- Drop existing notification policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications for others" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- Create comprehensive notification policies
-- Allow users to view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Allow authenticated users to create notifications for anyone (needed for follow notifications)
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update (mark as read) their own notifications
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON public.notifications(from_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Ensure proper grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- Test notification function to verify permissions
CREATE OR REPLACE FUNCTION public.test_notification_creation()
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    test_notification_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Try to insert a test notification
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        from_user_id,
        data
    ) VALUES (
        current_user_id,
        'test',
        'Test Notification',
        'This is a test notification to verify permissions.',
        current_user_id,
        '{"test": true}'::jsonb
    ) RETURNING id INTO test_notification_id;
    
    -- Clean up test notification
    DELETE FROM public.notifications WHERE id = test_notification_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test notification creation failed: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on test function
GRANT EXECUTE ON FUNCTION public.test_notification_creation TO authenticated;