-- Fix notification constraint to include supporter notification types
-- This ensures support notifications work correctly

-- Drop the existing constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Update any existing notifications with old terminology
UPDATE public.notifications 
SET type = 'new_supporter' 
WHERE type = 'new_follower';

UPDATE public.notifications 
SET type = 'support_request' 
WHERE type = 'follow_request';

-- Delete any notifications with invalid types that can't be mapped
DELETE FROM public.notifications 
WHERE type NOT IN (
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
    'test'
);

-- Add the updated constraint with supporter terminology
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
    'test'
));