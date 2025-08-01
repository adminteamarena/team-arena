-- Disable match deletion trigger since we handle notifications manually in the application
-- This prevents conflicts with our manual notification system

-- Drop the trigger that was causing constraint violations
DROP TRIGGER IF EXISTS notify_match_deleted_trigger ON public.matches;

-- Keep the function for potential future use but don't trigger it automatically
-- The function had issues because it tried to query participants after they were deleted via CASCADE