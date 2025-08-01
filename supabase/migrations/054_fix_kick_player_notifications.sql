-- Fix kick player notifications to distinguish between voluntary leaving and being kicked
-- This migration adds a new notification type for when players are removed by organizers

-- Drop the existing constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated constraint with player_removed type
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
    'player_removed',
    'new_message',
    'system_announcement',
    'new_supporter',
    'support_request',
    'recruitment_post',
    'match_invitation',
    'test'
));