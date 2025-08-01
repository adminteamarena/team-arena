-- Debug username issue with extensive logging
-- This will help us understand what data is available

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
    user_metadata JSONB;
    profile_full_name TEXT;
    profile_username TEXT;
BEGIN
    -- Get match details
    SELECT m.title, m.organizer_id, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_organizer_id, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = NEW.match_id;
    
    -- Get detailed user information for debugging
    SELECT u.email, u.raw_user_meta_data, p.full_name, p.username
    INTO user_email, user_metadata, profile_full_name, profile_username
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = NEW.user_id;
    
    -- Log debug information
    RAISE LOG 'JOIN DEBUG - User ID: %, Email: %, Metadata: %, Profile Full Name: %, Profile Username: %', 
        NEW.user_id, user_email, user_metadata, profile_full_name, profile_username;
    
    -- Try multiple approaches to get the name
    joiner_name := COALESCE(
        CASE WHEN profile_full_name IS NOT NULL AND profile_full_name != '' THEN profile_full_name END,
        CASE WHEN profile_username IS NOT NULL AND profile_username != '' THEN profile_username END,
        CASE WHEN user_metadata->>'full_name' IS NOT NULL AND user_metadata->>'full_name' != '' THEN user_metadata->>'full_name' END,
        CASE WHEN user_metadata->>'name' IS NOT NULL AND user_metadata->>'name' != '' THEN user_metadata->>'name' END,
        CASE WHEN user_metadata->>'user_name' IS NOT NULL AND user_metadata->>'user_name' != '' THEN user_metadata->>'user_name' END,
        CASE WHEN user_metadata->>'username' IS NOT NULL AND user_metadata->>'username' != '' THEN user_metadata->>'username' END,
        CASE WHEN user_email IS NOT NULL THEN SPLIT_PART(user_email, '@', 1) END,
        'Anonymous User'
    );
    
    -- Log what we finally got
    RAISE LOG 'JOIN DEBUG - Final joiner_name: %', joiner_name;
    
    -- Create improved informative chat message for join with emoji and team/position info
    chat_message := joiner_name || ' 🎉 joined the match on Team ' || NEW.team_side || ', Position ' || NEW.position_number;
    
    -- Log the final chat message
    RAISE LOG 'JOIN DEBUG - Final chat message: %', chat_message;
    
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
    user_email TEXT;
    user_metadata JSONB;
    profile_full_name TEXT;
    profile_username TEXT;
BEGIN
    -- Get match details
    SELECT m.title, m.organizer_id, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_organizer_id, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = OLD.match_id;
    
    -- Get detailed user information for debugging
    SELECT u.email, u.raw_user_meta_data, p.full_name, p.username
    INTO user_email, user_metadata, profile_full_name, profile_username
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = OLD.user_id;
    
    -- Log debug information
    RAISE LOG 'LEAVE DEBUG - User ID: %, Email: %, Metadata: %, Profile Full Name: %, Profile Username: %', 
        OLD.user_id, user_email, user_metadata, profile_full_name, profile_username;
    
    -- Try multiple approaches to get the name
    leaver_name := COALESCE(
        CASE WHEN profile_full_name IS NOT NULL AND profile_full_name != '' THEN profile_full_name END,
        CASE WHEN profile_username IS NOT NULL AND profile_username != '' THEN profile_username END,
        CASE WHEN user_metadata->>'full_name' IS NOT NULL AND user_metadata->>'full_name' != '' THEN user_metadata->>'full_name' END,
        CASE WHEN user_metadata->>'name' IS NOT NULL AND user_metadata->>'name' != '' THEN user_metadata->>'name' END,
        CASE WHEN user_metadata->>'user_name' IS NOT NULL AND user_metadata->>'user_name' != '' THEN user_metadata->>'user_name' END,
        CASE WHEN user_metadata->>'username' IS NOT NULL AND user_metadata->>'username' != '' THEN user_metadata->>'username' END,
        CASE WHEN user_email IS NOT NULL THEN SPLIT_PART(user_email, '@', 1) END,
        'Anonymous User'
    );
    
    -- Log what we finally got
    RAISE LOG 'LEAVE DEBUG - Final leaver_name: %', leaver_name;
    
    -- Store leaver's position and team info
    leaver_position := OLD.position_number;
    leaver_team := OLD.team_side;
    
    -- Get count of remaining participants
    SELECT COUNT(*) INTO remaining_participant_count
    FROM public.match_participants
    WHERE match_id = OLD.match_id;
    
    -- Create improved informative chat message for leave with emoji and team/position info
    chat_message := leaver_name || ' 👋 left the match (Team ' || leaver_team || ', Position ' || leaver_position || ')';
    
    -- Log the final chat message
    RAISE LOG 'LEAVE DEBUG - Final chat message: %', chat_message;
    
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