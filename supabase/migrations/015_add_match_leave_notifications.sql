-- Add match leave/kick notifications
-- This migration adds notifications when users leave or are kicked from matches

-- Trigger function for match leave/kick notifications
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
BEGIN
    -- Get match details
    SELECT m.title, m.organizer_id, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_organizer_id, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = OLD.match_id;
    
    -- Get leaver name from users table
    SELECT COALESCE(full_name, username, 'Someone') INTO leaver_name
    FROM public.users
    WHERE id = OLD.user_id;
    
    -- Store leaver's position and team info
    leaver_position := OLD.position_number;
    leaver_team := OLD.team_side;
    
    -- Get count of remaining participants
    SELECT COUNT(*) INTO remaining_participant_count
    FROM public.match_participants
    WHERE match_id = OLD.match_id;
    
    -- Only send notifications if there are remaining participants
    IF remaining_participant_count > 0 THEN
        -- Notify all remaining participants about the leaver
        PERFORM public.notify_match_participants(
            OLD.match_id,
            'match_left',
            'Player Left Match',
            leaver_name || ' left the match "' || match_title || '" (Team ' || leaver_team || ', Position ' || leaver_position || ').',
            OLD.user_id, -- exclude the leaver (they already left)
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

-- Create trigger for match leave/kick notifications
DROP TRIGGER IF EXISTS notify_match_left_trigger ON public.match_participants;
CREATE TRIGGER notify_match_left_trigger
    AFTER DELETE ON public.match_participants
    FOR EACH ROW EXECUTE FUNCTION public.notify_match_left();

-- Also create a function to distinguish between voluntary leave and being kicked
-- This will be used to send more specific notifications
CREATE OR REPLACE FUNCTION public.notify_player_kicked(
    kicked_match_id UUID,
    kicked_user_id UUID,
    kicker_user_id UUID
) RETURNS VOID AS $$
DECLARE
    match_title TEXT;
    kicked_player_name TEXT;
    kicker_name TEXT;
    match_sport TEXT;
    match_date TEXT;
    match_time TEXT;
    match_location TEXT;
    player_position INTEGER;
    player_team TEXT;
BEGIN
    -- Get match details
    SELECT m.title, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = kicked_match_id;
    
    -- Get player details before they were kicked
    SELECT COALESCE(u.full_name, u.username, 'Someone') INTO kicked_player_name
    FROM public.users u
    WHERE u.id = kicked_user_id;
    
    -- Get kicker name
    SELECT COALESCE(u.full_name, u.username, 'Someone') INTO kicker_name
    FROM public.users u
    WHERE u.id = kicker_user_id;
    
    -- Get the player's position info (this needs to be called before deletion)
    -- This function should be called from the application before deleting the participant
    
    -- Send specific notification to the kicked player
    PERFORM public.create_notification(
        kicked_user_id,
        'kicked_from_match',
        'Removed from Match',
        'You were removed from the match "' || match_title || '" by the organizer.',
        kicked_match_id,
        kicker_user_id,
        jsonb_build_object(
            'match_title', match_title,
            'kicker_name', kicker_name,
            'sport_type', match_sport,
            'date', match_date,
            'time', match_time,
            'location', match_location,
            'action', 'kicked'
        )
    );
    
    -- Notify remaining participants about the kick
    PERFORM public.notify_match_participants(
        kicked_match_id,
        'match_left',
        'Player Removed',
        kicked_player_name || ' was removed from the match "' || match_title || '" by the organizer.',
        kicked_user_id, -- exclude the kicked player
        kicker_user_id, -- from the kicker
        jsonb_build_object(
            'match_title', match_title,
            'removed_player', kicked_player_name,
            'kicker_name', kicker_name,
            'sport_type', match_sport,
            'date', match_date,
            'time', match_time,
            'location', match_location,
            'action', 'kicked'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 