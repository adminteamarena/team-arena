-- Create user posts system for Instagram-style photo sharing
-- This migration creates tables and functions for user posts and photos

-- Create user_posts table
CREATE TABLE IF NOT EXISTS public.user_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON public.user_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_created_at ON public.user_posts(created_at DESC);

-- Enable RLS on user_posts
ALTER TABLE public.user_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_posts
-- Users can view all posts (public)
CREATE POLICY "Users can view all posts" ON public.user_posts
    FOR SELECT USING (true);

-- Users can insert their own posts
CREATE POLICY "Users can insert their own posts" ON public.user_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts" ON public.user_posts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts" ON public.user_posts
    FOR DELETE USING (auth.uid() = user_id);

-- Function to get user posts with profile info
CREATE OR REPLACE FUNCTION public.get_user_posts(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    image_url TEXT,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    username TEXT,
    full_name TEXT,
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

-- Function to create a new post
CREATE OR REPLACE FUNCTION public.create_user_post(
    p_image_url TEXT,
    p_caption TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_post_id UUID;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    INSERT INTO public.user_posts (user_id, image_url, caption)
    VALUES (current_user_id, p_image_url, p_caption)
    RETURNING id INTO new_post_id;
    
    RETURN new_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a post
CREATE OR REPLACE FUNCTION public.delete_user_post(post_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    DELETE FROM public.user_posts 
    WHERE id = post_id AND user_id = current_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_posts TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_posts TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_post TO authenticated;

-- Enable realtime for user_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_posts;