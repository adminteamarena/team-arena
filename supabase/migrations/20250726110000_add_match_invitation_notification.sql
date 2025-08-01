-- Add match invitation notification type
-- This allows users to invite friends to matches and receive notifications with accept/refuse options

-- Drop the existing constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated constraint with match invitation type
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
    'position_changed',
    'kicked_from_match',
    'new_message',
    'system_announcement',
    'new_supporter',
    'support_request',
    'recruitment_post',
    'match_invitation',
    'test'
));