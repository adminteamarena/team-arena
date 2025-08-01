-- Fix the get_user_posts function to handle varchar types correctly
-- This migration fixes the data type mismatch error

-- Drop and recreate the function with correct return types
DROP FUNCTION IF EXISTS public.get_user_posts(UUID);

CREATE OR REPLACE FUNCTION public.get_user_posts(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    image_url TEXT,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    username VARCHAR(50),
    full_name VARCHAR(255),
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.image_url,
        p.caption,
        p.created_at,
        p.updated_at,
        pr.username,
        pr.full_name,
        pr.avatar_url
    FROM public.user_posts p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    WHERE p.user_id = target_user_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_posts TO authenticated;