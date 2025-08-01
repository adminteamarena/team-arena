-- Add match deletion notifications
-- This migration adds notifications when matches are deleted

-- Trigger function for match deletion notifications
CREATE OR REPLACE FUNCTION public.notify_match_deleted()
RETURNS TRIGGER AS $$
DECLARE
    organizer_name TEXT;
BEGIN
    -- Get organizer name from users table
    SELECT COALESCE(full_name, username, 'Someone') INTO organizer_name
    FROM public.users
    WHERE id = OLD.organizer_id;
    
    -- Notify all participants about the match deletion
    PERFORM public.notify_match_participants(
        OLD.id,
        'match_deleted',
        'Match Deleted',
        'The match "' || OLD.title || '" has been deleted by the organizer.',
        NULL, -- don't exclude anyone
        OLD.organizer_id,
        jsonb_build_object(
            'match_title', OLD.title,
            'organizer_name', organizer_name,
            'sport_type', OLD.sport_type,
            'date', OLD.date,
            'time', OLD.time,
            'location', OLD.location,
            'action', 'deleted'
        )
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for match deletion notifications
DROP TRIGGER IF EXISTS notify_match_deleted_trigger ON public.matches;
CREATE TRIGGER notify_match_deleted_trigger
    BEFORE DELETE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.notify_match_deleted(); 