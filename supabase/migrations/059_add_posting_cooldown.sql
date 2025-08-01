-- Add posting cooldown functionality (1 hour between posts per user)
-- This migration adds functions to enforce and check posting cooldowns

-- Function to check if user can post (no posts in last hour)
CREATE OR REPLACE FUNCTION public.can_user_post_recruitment(user_id UUID)
RETURNS TABLE (
    can_post BOOLEAN,
    last_post_time TIMESTAMP WITH TIME ZONE,
    next_allowed_time TIMESTAMP WITH TIME ZONE,
    remaining_seconds INTEGER
) AS $$
DECLARE
    last_post_timestamp TIMESTAMP WITH TIME ZONE;
    cooldown_period INTERVAL := '1 hour';
    now_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Get user's most recent post
    SELECT created_at INTO last_post_timestamp
    FROM public.recruitment_posts 
    WHERE recruitment_posts.user_id = can_user_post_recruitment.user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no posts found, user can post
    IF last_post_timestamp IS NULL THEN
        RETURN QUERY SELECT 
            true as can_post,
            NULL::TIMESTAMP WITH TIME ZONE as last_post_time,
            NULL::TIMESTAMP WITH TIME ZONE as next_allowed_time,
            0 as remaining_seconds;
        RETURN;
    END IF;
    
    -- Calculate if cooldown period has passed
    DECLARE
        next_allowed TIMESTAMP WITH TIME ZONE := last_post_timestamp + cooldown_period;
        can_post_now BOOLEAN := now_time >= next_allowed;
        remaining_time INTEGER := CASE 
            WHEN can_post_now THEN 0 
            ELSE EXTRACT(EPOCH FROM (next_allowed - now_time))::INTEGER
        END;
    BEGIN
        RETURN QUERY SELECT 
            can_post_now as can_post,
            last_post_timestamp as last_post_time,
            next_allowed as next_allowed_time,
            remaining_time as remaining_seconds;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated create_recruitment_post function with cooldown check
CREATE OR REPLACE FUNCTION public.create_recruitment_post_with_cooldown(
    p_content TEXT,
    p_sport VARCHAR(50),
    p_location VARCHAR(100),
    p_is_urgent BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    success BOOLEAN,
    post_id UUID,
    error_message TEXT,
    remaining_seconds INTEGER
) AS $$
DECLARE
    new_post_id UUID;
    current_user_id UUID;
    cooldown_check RECORD;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::UUID as post_id,
            'Authentication required'::TEXT as error_message,
            0 as remaining_seconds;
        RETURN;
    END IF;
    
    -- Check if user can post (cooldown check)
    SELECT * INTO cooldown_check 
    FROM public.can_user_post_recruitment(current_user_id);
    
    IF NOT cooldown_check.can_post THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::UUID as post_id,
            'You must wait before posting again'::TEXT as error_message,
            cooldown_check.remaining_seconds;
        RETURN;
    END IF;
    
    -- Create the post
    INSERT INTO public.recruitment_posts (user_id, content, sport, location, is_urgent)
    VALUES (current_user_id, p_content, p_sport, p_location, p_is_urgent)
    RETURNING id INTO new_post_id;
    
    RETURN QUERY SELECT 
        true as success,
        new_post_id as post_id,
        NULL::TEXT as error_message,
        0 as remaining_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.can_user_post_recruitment TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_recruitment_post_with_cooldown TO authenticated;

-- Add comment to document the cooldown policy
COMMENT ON FUNCTION public.can_user_post_recruitment IS 'Checks if a user can post based on 1-hour cooldown period';
COMMENT ON FUNCTION public.create_recruitment_post_with_cooldown IS 'Creates a recruitment post with 1-hour cooldown enforcement';