-- Drop and recreate the match modification function to fix parameter naming conflict
-- Cannot change parameter names on existing function, must drop and recreate

-- Drop the existing function
DROP FUNCTION IF EXISTS public.notify_match_modification(UUID, UUID, VARCHAR(255), TEXT);

-- Recreate with non-conflicting parameter names
CREATE OR REPLACE FUNCTION public.notify_match_modification(
    target_match_id UUID,
    target_organizer_id UUID,
    target_match_title VARCHAR(255),
    target_changes_summary TEXT
) RETURNS VOID AS $$
DECLARE
    participant_user_id UUID;
    participant_count INTEGER := 0;
    notification_count INTEGER := 0;
BEGIN
    -- Log function call
    RAISE NOTICE 'notify_match_modification called: match_id=%, organizer_id=%, match_title=%, changes=%', 
        target_match_id, target_organizer_id, target_match_title, target_changes_summary;
    
    -- Count total participants
    SELECT COUNT(DISTINCT mp.user_id)
    INTO participant_count
    FROM public.match_participants mp
    WHERE mp.match_id = target_match_id;
    
    RAISE NOTICE 'Total participants in match: %', participant_count;
    
    -- Get all participants of the match (excluding the organizer)
    FOR participant_user_id IN 
        SELECT DISTINCT mp.user_id
        FROM public.match_participants mp
        WHERE mp.match_id = target_match_id
        AND mp.user_id != target_organizer_id
    LOOP
        RAISE NOTICE 'Processing participant: %', participant_user_id;
        
        -- Create notification for each participant
        BEGIN
            PERFORM public.create_notification(
                participant_user_id,
                'match_modified',
                'Match Updated',
                'The organizer has updated "' || target_match_title || '". ' || target_changes_summary,
                target_match_id,
                target_organizer_id,
                jsonb_build_object(
                    'match_id', target_match_id,
                    'match_title', target_match_title,
                    'changes', target_changes_summary
                )
            );
            
            notification_count := notification_count + 1;
            RAISE NOTICE 'Successfully created notification for participant: %', participant_user_id;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to create notification for participant %: %', participant_user_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Notification process complete. Created % notifications out of % participants', 
        notification_count, participant_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;