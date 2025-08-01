-- Migration: Create match history system and expired match cleanup
-- This migration creates a system to automatically move expired matches to user history

-- Create match_history table to store expired matches for user reference
CREATE TABLE IF NOT EXISTS match_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL, -- Reference to original match
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    match_title TEXT NOT NULL,
    sport_type TEXT NOT NULL,
    location TEXT NOT NULL,
    match_date DATE NOT NULL,
    match_time TIME NOT NULL,
    team_format TEXT NOT NULL,
    user_role TEXT NOT NULL CHECK (user_role IN ('organizer', 'participant')),
    team_side CHAR(1), -- Only for participants
    position_number INTEGER, -- Only for participants
    final_status TEXT NOT NULL CHECK (final_status IN ('completed', 'cancelled', 'expired')),
    organizer_name TEXT,
    participant_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_match_date ON match_history(match_date DESC);
CREATE INDEX IF NOT EXISTS idx_match_history_archived_at ON match_history(archived_at DESC);

-- Enable RLS for match_history
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for match_history
CREATE POLICY "Users can view their own match history" ON match_history
    FOR SELECT USING (auth.uid() = user_id);

-- Function to move expired matches to history
CREATE OR REPLACE FUNCTION move_expired_matches_to_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_match RECORD;
    participant RECORD;
    organizer_name TEXT;
BEGIN
    -- Find matches that are expired (date + time has passed and status is still 'upcoming')
    FOR expired_match IN 
        SELECT m.*, p.username as organizer_username, p.full_name as organizer_full_name
        FROM matches m
        LEFT JOIN profiles p ON m.organizer_id = p.id
        WHERE m.status = 'upcoming' 
        AND (m.date + m.time::interval) < NOW()
    LOOP
        -- Get organizer display name
        organizer_name := COALESCE(expired_match.organizer_full_name, expired_match.organizer_username, 'Unknown');
        
        -- Add organizer to history
        INSERT INTO match_history (
            match_id, user_id, match_title, sport_type, location, 
            match_date, match_time, team_format, user_role, 
            final_status, organizer_name, participant_count
        ) VALUES (
            expired_match.id, expired_match.organizer_id, expired_match.title, 
            expired_match.sport_type, expired_match.location, expired_match.date, 
            expired_match.time, expired_match.team_format, 'organizer', 
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
                expired_match.sport_type, expired_match.location, expired_match.date, 
                expired_match.time, expired_match.team_format, 'participant', 
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

-- Function to get user's match history
CREATE OR REPLACE FUNCTION get_user_match_history(target_user_id UUID, history_limit INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    match_title TEXT,
    sport_type TEXT,
    location TEXT,
    match_date DATE,
    match_time TIME,
    team_format TEXT,
    user_role TEXT,
    team_side CHAR(1),
    position_number INTEGER,
    final_status TEXT,
    organizer_name TEXT,
    participant_count INTEGER,
    archived_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mh.id, mh.match_title, mh.sport_type, mh.location, 
        mh.match_date, mh.match_time, mh.team_format, mh.user_role,
        mh.team_side, mh.position_number, mh.final_status, 
        mh.organizer_name, mh.participant_count, mh.archived_at
    FROM match_history mh
    WHERE mh.user_id = target_user_id
    ORDER BY mh.archived_at DESC
    LIMIT history_limit;
END;
$$;

-- Create a cron job to automatically clean up expired matches (runs every hour)
-- Note: This requires the pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-expired-matches', '0 * * * *', 'SELECT move_expired_matches_to_history();');

-- For now, we'll add a manual trigger that can be called
-- This can be triggered from the frontend or via a scheduled task

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION move_expired_matches_to_history() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_match_history(UUID, INTEGER) TO authenticated;

-- Comment explaining the system
COMMENT ON TABLE match_history IS 'Stores historical data of matches that users participated in or organized, including expired matches';
COMMENT ON FUNCTION move_expired_matches_to_history() IS 'Moves expired matches (past date/time but still upcoming status) to match history for all participants';
COMMENT ON FUNCTION get_user_match_history(UUID, INTEGER) IS 'Retrieves match history for a specific user with optional limit';