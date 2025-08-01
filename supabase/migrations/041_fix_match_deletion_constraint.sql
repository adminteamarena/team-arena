-- Fix match deletion constraint issues
-- The problem is that triggers fire during CASCADE operations and try to insert new chat messages
-- into a match that's being deleted, causing foreign key constraint violations

-- First, let's modify the match leave trigger to NOT fire during cascade operations
-- We'll detect cascade operations by checking if the match still exists

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
    match_exists BOOLEAN;
BEGIN
    -- Check if the match still exists (to detect CASCADE operations)
    SELECT EXISTS(SELECT 1 FROM public.matches WHERE id = OLD.match_id) INTO match_exists;
    
    -- If the match doesn't exist, this is a CASCADE operation from match deletion
    -- In this case, we should NOT send notifications or add chat messages
    IF NOT match_exists THEN
        RETURN OLD;
    END IF;
    
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
    
    -- Create two-line chat message format (using | as separator)
    chat_message := leaver_name || ' 👋 left the match|Team ' || leaver_team || ', Position ' || leaver_position;
    
    -- Add system message to match chat with the leaver's user_id
    -- Only if the match still exists
    IF match_exists THEN
        PERFORM public.add_match_chat_system_message(
            OLD.match_id,
            chat_message,
            'leave_info',
            OLD.user_id
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

-- Also, let's ensure that the match_chat foreign key constraint is properly set with CASCADE
-- In case it got corrupted somehow
ALTER TABLE public.match_chat 
DROP CONSTRAINT IF EXISTS match_chat_match_id_fkey;

ALTER TABLE public.match_chat 
ADD CONSTRAINT match_chat_match_id_fkey 
FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;

-- Make sure the cleanup trigger for voice messages doesn't interfere
-- Let's modify it to be more robust
CREATE OR REPLACE FUNCTION public.cleanup_voice_message_files()
RETURNS TRIGGER AS $$
BEGIN
    -- Only try to clean up if the voice URL exists and is not null
    IF OLD.voice_url IS NOT NULL AND OLD.voice_url != '' THEN
        -- Here we would typically delete the file from storage
        -- For now, we'll just log it
        RAISE LOG 'Voice file cleanup needed for URL: %', OLD.voice_url;
    END IF;
    
    RETURN OLD;
EXCEPTION 
    WHEN OTHERS THEN
        -- If cleanup fails, log the error but don't prevent the deletion
        RAISE LOG 'Voice file cleanup failed for URL: %, Error: %', OLD.voice_url, SQLERRM;
        RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;