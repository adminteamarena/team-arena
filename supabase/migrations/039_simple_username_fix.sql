-- Simple and robust username fix
-- Use the most reliable approach to get usernames

-- Enhanced function to notify match participants and add chat message when someone joins
CREATE OR REPLACE FUNCTION public.notify_and_chat_match_joined()
RETURNS TRIGGER AS $$
DECLARE
    match_title TEXT;
    match_organizer_id UUID;
    joiner_name TEXT;
    match_sport TEXT;
    match_date TEXT;
    match_time TEXT;
    match_location TEXT;
    chat_message TEXT;
    user_email TEXT;
BEGIN
    -- Get match details
    SELECT m.title, m.organizer_id, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_organizer_id, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = NEW.match_id;
    
    -- Get user email first (most reliable)
    SELECT u.email INTO user_email
    FROM auth.users u
    WHERE u.id = NEW.user_id;
    
    -- Simple fallback: use email username or 'Player'
    IF user_email IS NOT NULL AND user_email != '' THEN
        joiner_name := SPLIT_PART(user_email, '@', 1);
    ELSE
        joiner_name := 'Player';
    END IF;
    
    -- If joiner_name is still empty or null, use fallback
    IF joiner_name IS NULL OR joiner_name = '' THEN
        joiner_name := 'Player';
    END IF;
    
    -- Create chat message with guaranteed username
    chat_message := joiner_name || ' 🎉 joined the match on Team ' || NEW.team_side || ', Position ' || NEW.position_number;
    
    -- Add system message to match chat with the joiner's user_id
    PERFORM public.add_match_chat_system_message(
        NEW.match_id,
        chat_message,
        'join_info',
        NEW.user_id
    );
    
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
        NEW.user_id,
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

-- Enhanced function to notify match participants and add chat message when someone leaves
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
    user_email TEXT;
BEGIN
    -- Get match details
    SELECT m.title, m.organizer_id, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_organizer_id, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = OLD.match_id;
    
    -- Get user email first (most reliable)
    SELECT u.email INTO user_email
    FROM auth.users u
    WHERE u.id = OLD.user_id;
    
    -- Simple fallback: use email username or 'Player'
    IF user_email IS NOT NULL AND user_email != '' THEN
        leaver_name := SPLIT_PART(user_email, '@', 1);
    ELSE
        leaver_name := 'Player';
    END IF;
    
    -- If leaver_name is still empty or null, use fallback
    IF leaver_name IS NULL OR leaver_name = '' THEN
        leaver_name := 'Player';
    END IF;
    
    -- Store leaver's position and team info
    leaver_position := OLD.position_number;
    leaver_team := OLD.team_side;
    
    -- Get count of remaining participants
    SELECT COUNT(*) INTO remaining_participant_count
    FROM public.match_participants
    WHERE match_id = OLD.match_id;
    
    -- Create chat message with guaranteed username
    chat_message := leaver_name || ' 👋 left the match (Team ' || leaver_team || ', Position ' || leaver_position || ')';
    
    -- Add system message to match chat with the leaver's user_id
    PERFORM public.add_match_chat_system_message(
        OLD.match_id,
        chat_message,
        'leave_info',
        OLD.user_id
    );
    
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
        OLD.user_id,
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