-- Add debug logging to notification triggers
-- This migration enhances existing triggers with better logging

-- Enhanced create_notification function with debug logging
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
    -- Add debug logging
    RAISE NOTICE 'Creating notification for user: %, type: %, title: %', target_user_id, notification_type, notification_title;
    
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
    
    RAISE NOTICE 'Successfully created notification with ID: %', notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced match join trigger with debug logging
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
    RAISE NOTICE 'Match join trigger fired for user: % joining match: %', NEW.user_id, NEW.match_id;
    
    -- Get match details
    SELECT m.title, m.organizer_id, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_organizer_id, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = NEW.match_id;
    
    RAISE NOTICE 'Match details - Title: %, Organizer: %', match_title, match_organizer_id;
    
    -- Get joiner name from users table
    SELECT COALESCE(full_name, username, 'Someone') INTO joiner_name
    FROM public.users
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'Joiner name: %', joiner_name;
    
    -- Notify all existing participants about the new joiner (excluding the joiner)
    RAISE NOTICE 'Notifying existing participants about new joiner...';
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
    RAISE NOTICE 'Notifying joiner about successful join...';
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
    
    RAISE NOTICE 'Match join trigger completed successfully';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced match leave trigger with debug logging
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
    RAISE NOTICE 'Match leave trigger fired for user: % leaving match: %', OLD.user_id, OLD.match_id;
    
    -- Get match details
    SELECT m.title, m.organizer_id, m.sport_type, m.date, m.time, m.location 
    INTO match_title, match_organizer_id, match_sport, match_date, match_time, match_location
    FROM public.matches m
    WHERE m.id = OLD.match_id;
    
    RAISE NOTICE 'Match details - Title: %, Organizer: %', match_title, match_organizer_id;
    
    -- Get leaver name from users table
    SELECT COALESCE(full_name, username, 'Someone') INTO leaver_name
    FROM public.users
    WHERE id = OLD.user_id;
    
    RAISE NOTICE 'Leaver name: %', leaver_name;
    
    -- Store leaver's position and team info
    leaver_position := OLD.position_number;
    leaver_team := OLD.team_side;
    
    -- Get count of remaining participants
    SELECT COUNT(*) INTO remaining_participant_count
    FROM public.match_participants
    WHERE match_id = OLD.match_id;
    
    RAISE NOTICE 'Remaining participants: %', remaining_participant_count;
    
    -- Only send notifications if there are remaining participants
    IF remaining_participant_count > 0 THEN
        RAISE NOTICE 'Notifying remaining participants about leaver...';
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
    RAISE NOTICE 'Notifying leaver about leaving...';
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
    
    RAISE NOTICE 'Match leave trigger completed successfully';
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 