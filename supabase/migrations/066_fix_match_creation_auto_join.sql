-- Migration: Fix match creation auto-join issue
-- Create a database function to handle match creation and organizer participation atomically

-- Function to create a match and automatically add the organizer as a participant
CREATE OR REPLACE FUNCTION create_match_with_organizer(
    p_title TEXT,
    p_sport_type TEXT,
    p_location TEXT,
    p_date DATE,
    p_time TIME,
    p_max_players INTEGER,
    p_team_format TEXT,
    p_organizer_id UUID,
    p_description TEXT DEFAULT NULL,
    p_ready_check_started BOOLEAN DEFAULT FALSE,
    p_ready_check_deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_weather_condition TEXT DEFAULT NULL,
    p_is_paid BOOLEAN DEFAULT FALSE,
    p_price_per_person DECIMAL DEFAULT NULL,
    p_currency TEXT DEFAULT 'MAD'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_match_id UUID;
    match_result JSON;
    participant_result RECORD;
BEGIN
    -- Insert the match
    INSERT INTO matches (
        title, sport_type, location, date, time, max_players, team_format, 
        organizer_id, description, ready_check_started, ready_check_deadline,
        weather_condition, is_paid, price_per_person, currency, status,
        creator_id, match_name, created_at, updated_at
    ) VALUES (
        p_title, p_sport_type, p_location, p_date, p_time, p_max_players, p_team_format,
        p_organizer_id, p_description, p_ready_check_started, p_ready_check_deadline,
        p_weather_condition, p_is_paid, p_price_per_person, p_currency, 'upcoming',
        p_organizer_id, p_title, NOW(), NOW()
    ) RETURNING id INTO new_match_id;

    -- Add the organizer as the first participant
    INSERT INTO match_participants (
        match_id, user_id, position_number, team_side, is_ready, joined_at
    ) VALUES (
        new_match_id, p_organizer_id, 1, 'A', false, NOW()
    );

    -- Get the complete match data with organizer info
    SELECT row_to_json(match_data) INTO match_result
    FROM (
        SELECT 
            m.*,
            p.id as organizer_id,
            p.username as organizer_username,
            p.full_name as organizer_full_name,
            p.avatar_url as organizer_avatar_url,
            1 as participant_count
        FROM matches m
        LEFT JOIN profiles p ON m.organizer_id = p.id
        WHERE m.id = new_match_id
    ) match_data;

    -- Send welcome system message
    INSERT INTO match_chat_messages (match_id, message, message_type, created_at)
    VALUES (new_match_id, 'Welcome to ' || p_title || '! Match created and ready for participants.', 'system', NOW());

    -- Return the match data
    RETURN match_result;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise it
        RAISE EXCEPTION 'Failed to create match with organizer: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_match_with_organizer(
    TEXT, TEXT, TEXT, DATE, TIME, INTEGER, TEXT, UUID, TEXT, BOOLEAN, TIMESTAMP WITH TIME ZONE, TEXT, BOOLEAN, DECIMAL, TEXT
) TO authenticated;

-- Comment explaining the function
COMMENT ON FUNCTION create_match_with_organizer IS 'Creates a match and automatically adds the organizer as the first participant in a single atomic transaction';