-- Disable match_participants DELETE trigger to prevent issues during match deletion
-- The trigger was trying to query deleted match data during CASCADE operations

-- Drop the trigger that was causing constraint violations during match deletion
DROP TRIGGER IF EXISTS notify_match_left_trigger ON public.match_participants;

-- Keep the function for potential manual use but don't trigger it automatically
-- during CASCADE deletions from match deletion