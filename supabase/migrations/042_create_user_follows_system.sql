-- Create user follows system for Instagram-like following functionality
-- This migration creates the follows table and related functionality

-- Create the user_follows table to track who follows whom
CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Prevent users from following themselves
ALTER TABLE public.user_follows 
ADD CONSTRAINT prevent_self_follow CHECK (follower_id != following_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON public.user_follows(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_follows table
-- Anyone can view follows (for public follower/following lists)
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
CREATE POLICY "Anyone can view follows" ON public.user_follows
    FOR SELECT USING (true);

-- Users can only create follows where they are the follower
DROP POLICY IF EXISTS "Users can follow others" ON public.user_follows;
CREATE POLICY "Users can follow others" ON public.user_follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can only delete follows where they are the follower (unfollow)
DROP POLICY IF EXISTS "Users can unfollow others" ON public.user_follows;
CREATE POLICY "Users can unfollow others" ON public.user_follows
    FOR DELETE USING (auth.uid() = follower_id);

-- Function to update follower counts when follows are added/removed
CREATE OR REPLACE FUNCTION public.update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment follower count for the user being followed
        UPDATE public.users 
        SET followers_count = COALESCE(followers_count, 0) + 1 
        WHERE id = NEW.following_id;
        
        -- Increment following count for the user who is following
        UPDATE public.users 
        SET following_count = COALESCE(following_count, 0) + 1 
        WHERE id = NEW.follower_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement follower count for the user being unfollowed
        UPDATE public.users 
        SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0) 
        WHERE id = OLD.following_id;
        
        -- Decrement following count for the user who is unfollowing
        UPDATE public.users 
        SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0) 
        WHERE id = OLD.follower_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update follower counts
DROP TRIGGER IF EXISTS trigger_update_follower_counts ON public.user_follows;
CREATE TRIGGER trigger_update_follower_counts
    AFTER INSERT OR DELETE ON public.user_follows
    FOR EACH ROW EXECUTE FUNCTION public.update_follower_counts();

-- Function to get followers for a user
CREATE OR REPLACE FUNCTION public.get_user_followers(target_user_id UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    username VARCHAR,
    full_name VARCHAR,
    avatar_url TEXT,
    bio TEXT,
    followers_count INTEGER,
    following_count INTEGER,
    matches_played INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    is_following BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.bio,
        u.followers_count,
        u.following_count,
        u.matches_played,
        u.created_at,
        EXISTS(
            SELECT 1 FROM public.user_follows uf2 
            WHERE uf2.follower_id = auth.uid() 
            AND uf2.following_id = u.id
        ) as is_following
    FROM public.users u
    INNER JOIN public.user_follows uf ON uf.follower_id = u.id
    WHERE uf.following_id = target_user_id
    ORDER BY uf.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get following for a user
CREATE OR REPLACE FUNCTION public.get_user_following(target_user_id UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    username VARCHAR,
    full_name VARCHAR,
    avatar_url TEXT,
    bio TEXT,
    followers_count INTEGER,
    following_count INTEGER,
    matches_played INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    is_following BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.bio,
        u.followers_count,
        u.following_count,
        u.matches_played,
        u.created_at,
        EXISTS(
            SELECT 1 FROM public.user_follows uf2 
            WHERE uf2.follower_id = auth.uid() 
            AND uf2.following_id = u.id
        ) as is_following
    FROM public.users u
    INNER JOIN public.user_follows uf ON uf.following_id = u.id
    WHERE uf.follower_id = target_user_id
    ORDER BY uf.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user A follows user B
CREATE OR REPLACE FUNCTION public.is_following(follower_user_id UUID, following_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM public.user_follows 
        WHERE follower_id = follower_user_id 
        AND following_id = following_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to follow a user
CREATE OR REPLACE FUNCTION public.follow_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- Check if user is trying to follow themselves
    IF current_user_id = target_user_id THEN
        RAISE EXCEPTION 'Cannot follow yourself';
    END IF;
    
    -- Check if already following
    IF EXISTS(SELECT 1 FROM public.user_follows WHERE follower_id = current_user_id AND following_id = target_user_id) THEN
        RETURN FALSE; -- Already following
    END IF;
    
    -- Insert the follow relationship
    INSERT INTO public.user_follows (follower_id, following_id)
    VALUES (current_user_id, target_user_id);
    
    RETURN TRUE; -- Successfully followed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unfollow a user
CREATE OR REPLACE FUNCTION public.unfollow_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    -- Delete the follow relationship
    DELETE FROM public.user_follows 
    WHERE follower_id = current_user_id 
    AND following_id = target_user_id;
    
    -- Return true if a row was deleted (was following), false otherwise
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh the existing follower/following counts to ensure accuracy
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM public.users LOOP
        -- Update followers count
        UPDATE public.users 
        SET followers_count = (
            SELECT COUNT(*) FROM public.user_follows 
            WHERE following_id = user_record.id
        )
        WHERE id = user_record.id;
        
        -- Update following count
        UPDATE public.users 
        SET following_count = (
            SELECT COUNT(*) FROM public.user_follows 
            WHERE follower_id = user_record.id
        )
        WHERE id = user_record.id;
    END LOOP;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_followers TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_following TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_following TO authenticated;
GRANT EXECUTE ON FUNCTION public.follow_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.unfollow_user TO authenticated;