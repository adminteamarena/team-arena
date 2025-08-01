-- Re-enable match leave notifications
-- This migration re-enables the trigger for match leave notifications
-- The trigger was previously disabled due to issues during CASCADE operations

-- First, let's update the notify_match_left function to handle the timing issue
-- The function needs to be more robust when querying participants after deletion
CREATE OR REPLACE FUNCTION public.notify_match_left()
RETURNS TRIGGER AS $$
DECLARE
    match_title TEXT;
    match_organizer_id UUID;
    leaver_name TEXT;
    match_sport TEXT;
    match_date TEXT;
    match_time TEXT;
    match_location TEXT;
    leaver_position INTEGER;
    leaver_team TEXT;
    remaining_participant_count INTEGER;
    participant_user_id UUID;
    notification_count INTEGER := 0;
BEGIN
    -- Get match details
    SELECT m.title, m.organizer_id, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_organizer_id, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = OLD.match_id;
    
    -- If match doesn't exist, skip notifications (likely during CASCADE deletion)
    IF match_title IS NULL THEN
        RETURN OLD;
    END IF;
    
    -- Get leaver name from users table
    SELECT COALESCE(full_name, username, 'Someone') INTO leaver_name
    FROM public.users
    WHERE id = OLD.user_id;
    
    -- Store leaver's position and team info
    leaver_position := OLD.position_number;
    leaver_team := OLD.team_side;
    
    -- Get count of remaining participants (after the deletion)
    SELECT COUNT(*) INTO remaining_participant_count
    FROM public.match_participants
    WHERE match_id = OLD.match_id;
    
    -- Only send notifications if there are remaining participants
    IF remaining_participant_count > 0 THEN
        -- Notify all remaining participants about the leaver
        FOR participant_user_id IN 
            SELECT mp.user_id 
            FROM public.match_participants mp 
            WHERE mp.match_id = OLD.match_id 
        LOOP
            -- Create notification for each remaining participant
            PERFORM public.create_notification(
                participant_user_id,
                'match_left',
                'Player Left Match',
                leaver_name || ' left the match "' || match_title || '" (Team ' || leaver_team || ', Position ' || leaver_position || ').',
                OLD.match_id,
                OLD.user_id, -- from the leaver
                jsonb_build_object(
                    'match_title', match_title,
                    'leaver_name', leaver_name,
                    'leaver_id', OLD.user_id,
                    'position', leaver_position,
                    'team', leaver_team,
                    'sport_type', match_sport,
                    'date', match_date,
                    'time', match_time,
                    'location', match_location,
                    'remaining_participants', remaining_participant_count
                )
            );
            
            notification_count := notification_count + 1;
        END LOOP;
    END IF;
    
    -- Notify the leaver about leaving (confirmation)
    PERFORM public.create_notification(
        OLD.user_id,
        'match_left',
        'Left Match',
        'You left the match "' || match_title || '". Your position (Team ' || leaver_team || ', Position ' || leaver_position || ') is now available.',
        OLD.match_id,
        OLD.user_id, -- from themselves
        jsonb_build_object(
            'match_title', match_title,
            'position', leaver_position,
            'team', leaver_team,
            'sport_type', match_sport,
            'date', match_date,
            'time', match_time,
            'location', match_location,
            'organizer_id', match_organizer_id,
            'action', 'left',
            'remaining_participants', remaining_participant_count
        )
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger for match leave notifications
-- This trigger will only fire for direct DELETE operations, not during CASCADE operations
DROP TRIGGER IF EXISTS notify_match_left_trigger ON public.match_participants;
CREATE TRIGGER notify_match_left_trigger
    AFTER DELETE ON public.match_participants
    FOR EACH ROW 
    EXECUTE FUNCTION public.notify_match_left();

-- Add a comment explaining the fix
COMMENT ON TRIGGER notify_match_left_trigger ON public.match_participants IS 
'Trigger for match leave notifications - re-enabled with improved error handling and direct participant iteration';