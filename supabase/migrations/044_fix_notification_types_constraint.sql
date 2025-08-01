-- Fix notification types constraint to include follow notification types
-- This migration updates the check constraint to allow new_follower and follow_request types

-- First, drop the existing constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'notifications_type_check'
    ) THEN
        ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
        RAISE NOTICE 'Dropped existing notifications_type_check constraint';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop constraint: %', SQLERRM;
END $$;

-- Add the updated constraint with all notification types including follow types
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
    'new_follower',
    'follow_request',
    'test'
));

-- Verify the constraint was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'notifications_type_check'
    ) THEN
        RAISE NOTICE 'Successfully created notifications_type_check constraint with follow types';
    ELSE
        RAISE NOTICE 'Failed to create notifications_type_check constraint';
    END IF;
END $$;