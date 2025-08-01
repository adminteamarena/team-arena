-- Add match modification notifications
-- This migration adds support for notifying participants when match details are updated

-- Drop the existing constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated constraint with match_modified type
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'match_created',
    'match_joined', 
    'match_left',
    'match_ready_check',
    'match_status_changed',
    'match_cancelled',
    'match_deleted',
    'match_modified',
    'position_changed',
    'kicked_from_match',
    'player_removed',
    'new_message',
    'system_announcement',
    'new_supporter',
    'support_request',
    'recruitment_post',
    'match_invitation',
    'test'
));

-- Function to notify all match participants about match modifications
CREATE OR REPLACE FUNCTION public.notify_match_modification(
    match_id UUID,
    organizer_id UUID,
    match_title VARCHAR(255),
    changes_summary TEXT
) RETURNS VOID AS $$
DECLARE
    participant_user_id UUID;
BEGIN
    -- Get all participants of the match (excluding the organizer)
    FOR participant_user_id IN 
        SELECT DISTINCT mp.user_id
        FROM public.match_participants mp
        WHERE mp.match_id = match_id
        AND mp.user_id != organizer_id
    LOOP
        -- Create notification for each participant
        PERFORM public.create_notification(
            participant_user_id,
            'match_modified',
            'Match Updated',
            'The organizer has updated "' || match_title || '". ' || changes_summary,
            match_id,
            organizer_id,
            jsonb_build_object(
                'match_id', match_id,
                'match_title', match_title,
                'changes', changes_summary
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;