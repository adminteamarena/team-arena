-- Fix the user_id constraint issue for join/leave messages
-- This migration fixes the NULL user_id issue by using the actual user who joined/left

-- Update the function to add system messages with proper user_id
CREATE OR REPLACE FUNCTION public.add_match_chat_system_message(
    match_id UUID,
    message_text TEXT,
    message_type TEXT DEFAULT 'system',
    from_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    message_id UUID;
    system_user_id UUID;
BEGIN
    -- Use the provided user_id or try to find a system/admin user
    -- For now, we'll use the from_user_id since we always have it in join/leave context
    IF from_user_id IS NOT NULL THEN
        system_user_id := from_user_id;
    ELSE
        -- Fallback: use the first user in the system (this shouldn't happen in our case)
        SELECT id INTO system_user_id FROM auth.users LIMIT 1;
    END IF;
    
    INSERT INTO public.match_chat (match_id, user_id, message, message_type)
    VALUES (match_id, system_user_id, message_text, message_type)
    RETURNING id INTO message_id;
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
BEGIN
    -- Get match details
    SELECT m.title, m.organizer_id, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_organizer_id, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = NEW.match_id;
    
    -- Get joiner name from users table or profiles
    SELECT COALESCE(p.full_name, p.username, u.email, 'Someone') INTO joiner_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = NEW.user_id;
    
    -- Create informative chat message for join
    chat_message := joiner_name || ' joined the match';
    
    -- Add system message to match chat with the joiner's user_id
    PERFORM public.add_match_chat_system_message(
        NEW.match_id,
        chat_message,
        'join_info',
        NEW.user_id  -- Use the joiner's user_id instead of NULL
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
BEGIN
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
    
    -- Create informative chat message for leave
    chat_message := leaver_name || ' left the match';
    
    -- Add system message to match chat with the leaver's user_id
    PERFORM public.add_match_chat_system_message(
        OLD.match_id,
        chat_message,
        'leave_info',
        OLD.user_id  -- Use the leaver's user_id instead of NULL
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