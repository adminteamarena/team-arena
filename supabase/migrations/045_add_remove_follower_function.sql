-- Add function to remove a follower (opposite of follow)
-- This allows users to remove people from their followers list

-- Function to remove a follower
CREATE OR REPLACE FUNCTION public.remove_follower(follower_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- Check if user is trying to remove themselves
    IF current_user_id = follower_user_id THEN
        RAISE EXCEPTION 'Cannot remove yourself';
    END IF;
    
    -- Delete the follow relationship where follower_user_id follows current_user_id
    DELETE FROM public.user_follows 
    WHERE follower_id = follower_user_id 
    AND following_id = current_user_id;
    
    -- Return true if a row was deleted (was following), false otherwise
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on remove follower function
GRANT EXECUTE ON FUNCTION public.remove_follower TO authenticated;