-- Fix match deletion cascade issue
-- The notify_and_chat_match_left function tries to add chat messages even when match is being deleted

CREATE OR REPLACE FUNCTION public.notify_and_chat_match_left()
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
    chat_message TEXT;
    is_organizer BOOLEAN := FALSE;
    match_exists BOOLEAN := FALSE;
BEGIN
    -- First check if the match still exists (could be in the process of being deleted)
    SELECT EXISTS(SELECT 1 FROM public.matches WHERE id = OLD.match_id) INTO match_exists;
    
    -- If the match doesn't exist, skip all processing (it's being deleted)
    IF NOT match_exists THEN
        RETURN OLD;
    END IF;
    
    -- Check if the person leaving is the organizer (organizers leaving should be handled normally)
    SELECT (OLD.user_id = m.organizer_id) INTO is_organizer
    FROM public.matches m
    WHERE m.id = OLD.match_id;
    
    -- Skip trigger notifications for non-organizer deletions
    -- The application layer (kickParticipant or leaveMatch functions) will handle notifications appropriately
    IF NOT is_organizer THEN
        -- Only add a basic chat message, no notifications
        -- Get basic match and user info for chat
        SELECT m.title INTO match_title
        FROM public.matches m
        WHERE m.id = OLD.match_id;
        
        SELECT COALESCE(p.full_name, p.username, u.email, 'Someone') INTO leaver_name
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE u.id = OLD.user_id;
        
        -- Note: We're not adding chat message here either since the application handles it
        -- via the sendSystemMessage in both leaveMatch and kickParticipant functions
        
        RETURN OLD;
    END IF;
    
    -- Original logic for voluntary leaving (when not being kicked)
    -- Get match details
    SELECT m.title, m.organizer_id, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_organizer_id, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = OLD.match_id;
    
    -- Get leaver name from users table or profiles
    SELECT COALESCE(p.full_name, p.username, u.email, 'Someone') INTO leaver_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = OLD.user_id;
    
    -- Store leaver's position and team info
    leaver_position := OLD.position_number;
    leaver_team := OLD.team_side;
    
    -- Get count of remaining participants
    SELECT COUNT(*) INTO remaining_participant_count
    FROM public.match_participants
    WHERE match_id = OLD.match_id;
    
    -- Create informative chat message for voluntary leave
    chat_message := '👋 ' || leaver_name || ' left the match (Team ' || leaver_team || ', Position ' || leaver_position || ')';
    
    -- Add system message to match chat (only if match still exists)
    IF match_exists THEN
        PERFORM public.add_match_chat_system_message(
            OLD.match_id,
            chat_message,
            'leave_info'
        );
    END IF;
    
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
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;