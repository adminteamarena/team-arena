-- Fix notifications RLS policy to allow proper notification creation
-- The current policy might be too restrictive

-- Drop existing policies
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- Create more permissive policies
CREATE POLICY "Anyone can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Also allow organizers to create notifications for their matches
CREATE POLICY "Organizers can create match notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() = from_user_id OR 
        auth.uid() IN (
            SELECT organizer_id FROM public.matches 
            WHERE id = match_id
        )
    );