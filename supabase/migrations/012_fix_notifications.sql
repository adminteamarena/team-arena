-- Fix notifications system for match creation
-- This migration properly handles existing notifications table

-- Drop existing table and recreate with proper structure
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Create the notifications table with correct structure
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'match_created',
        'match_joined',
        'match_left',
        'match_ready_check',
        'match_status_changed',
        'match_cancelled',
        'match_deleted',
        'position_changed',
        'kicked_from_match',
        'new_message',
        'system_announcement'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related entities
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Notification metadata
    data JSONB DEFAULT '{}',
    
    -- Status tracking
    is_read BOOLEAN DEFAULT FALSE,
    is_seen BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_match_id ON public.notifications(match_id) WHERE match_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Create notification helper function
CREATE OR REPLACE FUNCTION public.create_notification(
    target_user_id UUID,
    notification_type VARCHAR(50),
    notification_title VARCHAR(255),
    notification_message TEXT,
    related_match_id UUID DEFAULT NULL,
    from_user_id UUID DEFAULT NULL,
    notification_data JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Insert the notification
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        match_id,
        from_user_id,
        data
    ) VALUES (
        target_user_id,
        notification_type,
        notification_title,
        notification_message,
        related_match_id,
        from_user_id,
        notification_data
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for match creation notifications
CREATE OR REPLACE FUNCTION public.notify_match_created()
RETURNS TRIGGER AS $$
DECLARE
    organizer_name TEXT;
BEGIN
    -- Get organizer name from users table
    SELECT COALESCE(full_name, username, 'Someone') INTO organizer_name
    FROM public.users
    WHERE id = NEW.organizer_id;
    
    -- Create notification for organizer
    PERFORM public.create_notification(
        NEW.organizer_id,
        'match_created',
        'Match Created Successfully',
        'Your match "' || NEW.title || '" has been created and is ready for participants.',
        NEW.id,
        NEW.organizer_id,
        jsonb_build_object(
            'match_title', NEW.title,
            'sport_type', NEW.sport_type,
            'date', NEW.date,
            'time', NEW.time,
            'location', NEW.location
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for match creation
DROP TRIGGER IF EXISTS notify_match_created_trigger ON public.matches;
CREATE TRIGGER notify_match_created_trigger
    AFTER INSERT ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.notify_match_created(); 