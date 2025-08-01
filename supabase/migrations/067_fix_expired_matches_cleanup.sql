-- Migration: Fix expired matches cleanup function type casting error
-- This migration fixes the PostgreSQL type error when comparing VARCHAR date/time with intervals

-- Drop and recreate the function with proper type casting
CREATE OR REPLACE FUNCTION move_expired_matches_to_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_match RECORD;
    participant RECORD;
    organizer_name TEXT;
    match_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Find matches that are expired (date + time has passed and status is still 'upcoming')
    FOR expired_match IN 
        SELECT m.*, p.username as organizer_username, p.full_name as organizer_full_name
        FROM matches m
        LEFT JOIN profiles p ON m.organizer_id = p.id
        WHERE m.status = 'upcoming' 
        AND m.date IS NOT NULL 
        AND m.time IS NOT NULL
    LOOP
        -- Convert VARCHAR date and time to proper timestamp
        BEGIN
            match_datetime := (expired_match.date || ' ' || expired_match.time)::TIMESTAMP WITH TIME ZONE;
            
            -- Skip if the match hasn't expired yet
            IF match_datetime >= NOW() THEN
                CONTINUE;
            END IF;
        EXCEPTION 
            WHEN OTHERS THEN
                -- Skip matches with invalid date/time format
                RAISE WARNING 'Skipping match % due to invalid date/time format: % %', 
                    expired_match.id, expired_match.date, expired_match.time;
                CONTINUE;
        END;
        
        -- Get organizer display name
        organizer_name := COALESCE(expired_match.organizer_full_name, expired_match.organizer_username, 'Unknown');
        
        -- Add organizer to history
        INSERT INTO match_history (
            match_id, user_id, match_title, sport_type, location, 
            match_date, match_time, team_format, user_role, 
            final_status, organizer_name, participant_count
        ) VALUES (
            expired_match.id, expired_match.organizer_id, expired_match.title, 
            expired_match.sport_type, expired_match.location, expired_match.date::DATE, 
            expired_match.time::TIME, expired_match.team_format, 'organizer', 
            'expired', organizer_name, 
            (SELECT COUNT(*) FROM match_participants WHERE match_id = expired_match.id)
        );
        
        -- Add all participants to history
        FOR participant IN 
            SELECT mp.*, p.username, p.full_name 
            FROM match_participants mp
            LEFT JOIN profiles p ON mp.user_id = p.id
            WHERE mp.match_id = expired_match.id
            AND mp.user_id != expired_match.organizer_id -- Don't duplicate organizer
        LOOP
            INSERT INTO match_history (
                match_id, user_id, match_title, sport_type, location, 
                match_date, match_time, team_format, user_role, 
                team_side, position_number, final_status, organizer_name, participant_count
            ) VALUES (
                expired_match.id, participant.user_id, expired_match.title, 
                expired_match.sport_type, expired_match.location, expired_match.date::DATE, 
                expired_match.time::TIME, expired_match.team_format, 'participant', 
                participant.team_side, participant.position_number, 'expired', 
                organizer_name, 
                (SELECT COUNT(*) FROM match_participants WHERE match_id = expired_match.id)
            );
        END LOOP;
        
        -- Update match status to expired (instead of deleting for audit trail)
        UPDATE matches 
        SET status = 'expired', updated_at = NOW()
        WHERE id = expired_match.id;
        
        -- Send system message about expiration
        INSERT INTO match_chat_messages (match_id, message, message_type, created_at)
        VALUES (expired_match.id, '⏰ This match has expired and been moved to history', 'system', NOW());
        
        RAISE NOTICE 'Moved expired match % to history for % users', expired_match.title, 
            (SELECT COUNT(*) FROM match_participants WHERE match_id = expired_match.id) + 1;
    END LOOP;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION move_expired_matches_to_history() TO authenticated;

-- Comment explaining the fix
COMMENT ON FUNCTION move_expired_matches_to_history() IS 'Moves expired matches (past date/time but still upcoming status) to match history for all participants. Fixed to handle VARCHAR date/time format properly.';