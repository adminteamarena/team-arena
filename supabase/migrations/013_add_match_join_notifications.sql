-- Add match join notifications
-- This migration adds notifications when users join matches

-- Function to notify match participants (excluding specific user)
CREATE OR REPLACE FUNCTION public.notify_match_participants(
    match_id UUID,
    notification_type VARCHAR(50),
    notification_title VARCHAR(255),
    notification_message TEXT,
    exclude_user_id UUID DEFAULT NULL,
    from_user_id UUID DEFAULT NULL,
    notification_data JSONB DEFAULT '{}'
) RETURNS INTEGER AS $$
DECLARE
    participant_count INTEGER := 0;
    participant_user_id UUID;
BEGIN
    -- Loop through all match participants
    FOR participant_user_id IN 
        SELECT mp.user_id 
        FROM public.match_participants mp 
        WHERE mp.match_id = match_id 
        AND (exclude_user_id IS NULL OR mp.user_id != exclude_user_id)
    LOOP
        -- Create notification for each participant
        PERFORM public.create_notification(
            participant_user_id,
            notification_type,
            notification_title,
            notification_message,
            match_id,
            from_user_id,
            notification_data
        );
        
        participant_count := participant_count + 1;
    END LOOP;
    
    RETURN participant_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for match join notifications
CREATE OR REPLACE FUNCTION public.notify_match_joined()
RETURNS TRIGGER AS $$
DECLARE
    match_title TEXT;
    match_organizer_id UUID;
    joiner_name TEXT;
    match_sport TEXT;
    match_date TEXT;
    match_time TEXT;
    match_location TEXT;
BEGIN
    -- Get match details
    SELECT m.title, m.organizer_id, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_organizer_id, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = NEW.match_id;
    
    -- Get joiner name from users table
    SELECT COALESCE(full_name, username, 'Someone') INTO joiner_name
    FROM public.users
    WHERE id = NEW.user_id;
    
    -- Notify all existing participants about the new joiner (excluding the joiner)
    PERFORM public.notify_match_participants(
        NEW.match_id,
        'match_joined',
        'New Player Joined',
        joiner_name || ' joined your match "' || match_title || '" on Team ' || NEW.team_side || ', Position ' || NEW.position_number || '.',
        NEW.user_id, -- exclude the joiner
        NEW.user_id, -- from the joiner
        jsonb_build_object(
            'match_title', match_title,
            'joiner_name', joiner_name,
            'joiner_id', NEW.user_id,
            'position', NEW.position_number,
            'team', NEW.team_side,
            'sport_type', match_sport,
            'date', match_date,
            'time', match_time,
            'location', match_location
        )
    );
    
    -- Notify the joiner about successful join
    PERFORM public.create_notification(
        NEW.user_id,
        'match_joined',
        'Successfully Joined Match',
        'You joined the match "' || match_title || '" on Team ' || NEW.team_side || ', Position ' || NEW.position_number || '. Get ready to play!',
        NEW.match_id,
        NEW.user_id, -- from themselves
        jsonb_build_object(
            'match_title', match_title,
            'position', NEW.position_number,
            'team', NEW.team_side,
            'sport_type', match_sport,
            'date', match_date,
            'time', match_time,
            'location', match_location,
            'organizer_id', match_organizer_id
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for match join notifications
DROP TRIGGER IF EXISTS notify_match_joined_trigger ON public.match_participants;
CREATE TRIGGER notify_match_joined_trigger
    AFTER INSERT ON public.match_participants
    FOR EACH ROW EXECUTE FUNCTION public.notify_match_joined(); 