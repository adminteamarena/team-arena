-- Fix function uniqueness issue for add_match_chat_system_message
-- The function has been redefined multiple times causing ambiguity

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS public.add_match_chat_system_message(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.add_match_chat_system_message(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.add_match_chat_system_message(UUID, TEXT);

-- Create the final version with proper parameter typing
CREATE OR REPLACE FUNCTION public.add_match_chat_system_message(
    match_id UUID,
    message_text TEXT,
    message_type TEXT DEFAULT 'system',
    from_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    message_id UUID;
    system_user_id UUID;
BEGIN
    -- Use the provided user_id or try to find a system/admin user
    -- For now, we'll use the from_user_id since we always have it in join/leave context
    IF from_user_id IS NOT NULL THEN
        system_user_id := from_user_id;
    ELSE
        -- Fallback: use the first user in the system (this shouldn't happen in our case)
        SELECT id INTO system_user_id 
        FROM auth.users 
        WHERE created_at = (SELECT MIN(created_at) FROM auth.users)
        LIMIT 1;
        
        -- If still no user found, we'll skip the message
        IF system_user_id IS NULL THEN
            RAISE WARNING 'No user found for system message, skipping';
            RETURN NULL;
        END IF;
    END IF;

    INSERT INTO public.match_chat (match_id, user_id, message, message_type)
    VALUES (match_id, system_user_id, message_text, message_type)
    RETURNING id INTO message_id;
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;