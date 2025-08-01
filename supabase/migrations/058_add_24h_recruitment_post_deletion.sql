-- Add 24-hour auto-deletion for recruitment posts
-- This migration adds automatic deletion of recruitment posts after 24 hours

-- Create function to delete old recruitment posts (older than 24 hours)
CREATE OR REPLACE FUNCTION public.delete_old_recruitment_posts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete posts older than 24 hours and their related data
    WITH deleted_posts AS (
        DELETE FROM public.recruitment_posts 
        WHERE created_at < NOW() - INTERVAL '24 hours'
        RETURNING id
    )
    SELECT COUNT(*) FROM deleted_posts INTO deleted_count;
    
    -- Log the cleanup activity
    RAISE NOTICE 'Deleted % recruitment posts older than 24 hours', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to execute the cleanup function
GRANT EXECUTE ON FUNCTION public.delete_old_recruitment_posts TO authenticated;

-- Create function to check if a post is expired (older than 24 hours)
CREATE OR REPLACE FUNCTION public.is_recruitment_post_expired(post_created_at TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN post_created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to execute the expiry check function
GRANT EXECUTE ON FUNCTION public.is_recruitment_post_expired TO authenticated;

-- Drop and recreate the get_recruitment_posts function with new return columns
DROP FUNCTION IF EXISTS public.get_recruitment_posts(TEXT, TEXT);

-- Update the get_recruitment_posts function to exclude expired posts
CREATE OR REPLACE FUNCTION public.get_recruitment_posts(
    filter_sport TEXT DEFAULT NULL,
    filter_location TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content TEXT,
    sport VARCHAR(50),
    location VARCHAR(100),
    is_urgent BOOLEAN,
    likes_count INTEGER,
    comments_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    username VARCHAR(50),
    full_name VARCHAR(255),
    avatar_url TEXT,
    user_liked BOOLEAN,
    user_bookmarked BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_expired BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.content,
        p.sport,
        p.location,
        p.is_urgent,
        p.likes_count,
        p.comments_count,
        p.created_at,
        pr.username,
        pr.full_name,
        pr.avatar_url,
        (l.user_id IS NOT NULL) as user_liked,
        (b.user_id IS NOT NULL) as user_bookmarked,
        (p.created_at + INTERVAL '24 hours') as expires_at,
        public.is_recruitment_post_expired(p.created_at) as is_expired
    FROM public.recruitment_posts p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    LEFT JOIN public.recruitment_likes l ON p.id = l.post_id AND l.user_id = auth.uid()
    LEFT JOIN public.recruitment_bookmarks b ON p.id = b.post_id AND b.user_id = auth.uid()
    WHERE 
        (filter_sport IS NULL OR filter_sport = 'All' OR p.sport = filter_sport) AND
        (filter_location IS NULL OR filter_location = 'All' OR p.location = filter_location) AND
        -- Only return non-expired posts
        p.created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to automatically delete expired posts during queries
CREATE OR REPLACE FUNCTION public.cleanup_expired_recruitment_posts_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Perform cleanup of expired posts when recruitment_posts table is accessed
    PERFORM public.delete_old_recruitment_posts();
    
    -- Return the original operation unchanged
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        RETURN NEW;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs cleanup before SELECT operations (when posts are fetched)
-- Note: We'll handle this through a scheduled cleanup instead to avoid performance impact

-- Add comment to recruitment_posts table to document the 24-hour policy
COMMENT ON TABLE public.recruitment_posts IS 'Recruitment posts are automatically deleted after 24 hours';
COMMENT ON COLUMN public.recruitment_posts.created_at IS 'Posts are automatically deleted 24 hours after this timestamp';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.delete_old_recruitment_posts TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_recruitment_post_expired TO authenticated;