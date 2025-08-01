-- Create recruitment posts system for team finding
-- This migration creates tables and functions for recruitment posts

-- Create recruitment_posts table
CREATE TABLE IF NOT EXISTS public.recruitment_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 200),
    sport VARCHAR(50) NOT NULL,
    location VARCHAR(100) NOT NULL,
    is_urgent BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recruitment_replies table for comments
CREATE TABLE IF NOT EXISTS public.recruitment_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.recruitment_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recruitment_likes table for tracking likes
CREATE TABLE IF NOT EXISTS public.recruitment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.recruitment_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Create recruitment_bookmarks table for tracking bookmarks
CREATE TABLE IF NOT EXISTS public.recruitment_bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.recruitment_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recruitment_posts_user_id ON public.recruitment_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_posts_created_at ON public.recruitment_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recruitment_posts_sport ON public.recruitment_posts(sport);
CREATE INDEX IF NOT EXISTS idx_recruitment_posts_location ON public.recruitment_posts(location);
CREATE INDEX IF NOT EXISTS idx_recruitment_replies_post_id ON public.recruitment_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_likes_post_id ON public.recruitment_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_bookmarks_user_id ON public.recruitment_bookmarks(user_id);

-- Enable RLS on all tables
ALTER TABLE public.recruitment_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recruitment_posts
-- Users can view all posts
CREATE POLICY "Users can view all recruitment posts" ON public.recruitment_posts
    FOR SELECT USING (true);

-- Users can insert their own posts
CREATE POLICY "Users can insert their own recruitment posts" ON public.recruitment_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own recruitment posts" ON public.recruitment_posts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own recruitment posts" ON public.recruitment_posts
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recruitment_replies
-- Users can view all replies
CREATE POLICY "Users can view all recruitment replies" ON public.recruitment_replies
    FOR SELECT USING (true);

-- Users can insert their own replies
CREATE POLICY "Users can insert their own recruitment replies" ON public.recruitment_replies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own replies
CREATE POLICY "Users can update their own recruitment replies" ON public.recruitment_replies
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own replies
CREATE POLICY "Users can delete their own recruitment replies" ON public.recruitment_replies
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recruitment_likes
-- Users can view all likes
CREATE POLICY "Users can view all recruitment likes" ON public.recruitment_likes
    FOR SELECT USING (true);

-- Users can manage their own likes
CREATE POLICY "Users can manage their own recruitment likes" ON public.recruitment_likes
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for recruitment_bookmarks
-- Users can view their own bookmarks
CREATE POLICY "Users can view their own recruitment bookmarks" ON public.recruitment_bookmarks
    FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their own bookmarks
CREATE POLICY "Users can manage their own recruitment bookmarks" ON public.recruitment_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- Function to get recruitment posts with profile info and interaction counts
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
    user_bookmarked BOOLEAN
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
        (b.user_id IS NOT NULL) as user_bookmarked
    FROM public.recruitment_posts p
    LEFT JOIN public.profiles pr ON p.user_id = pr.id
    LEFT JOIN public.recruitment_likes l ON p.id = l.post_id AND l.user_id = auth.uid()
    LEFT JOIN public.recruitment_bookmarks b ON p.id = b.post_id AND b.user_id = auth.uid()
    WHERE 
        (filter_sport IS NULL OR filter_sport = 'All' OR p.sport = filter_sport) AND
        (filter_location IS NULL OR filter_location = 'All' OR p.location = filter_location)
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new recruitment post
CREATE OR REPLACE FUNCTION public.create_recruitment_post(
    p_content TEXT,
    p_sport VARCHAR(50),
    p_location VARCHAR(100),
    p_is_urgent BOOLEAN DEFAULT FALSE
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
    
    INSERT INTO public.recruitment_posts (user_id, content, sport, location, is_urgent)
    VALUES (current_user_id, p_content, p_sport, p_location, p_is_urgent)
    RETURNING id INTO new_post_id;
    
    RETURN new_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle like on a recruitment post
CREATE OR REPLACE FUNCTION public.toggle_recruitment_like(post_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    like_exists BOOLEAN;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM public.recruitment_likes 
        WHERE recruitment_likes.post_id = toggle_recruitment_like.post_id 
        AND user_id = current_user_id
    ) INTO like_exists;
    
    IF like_exists THEN
        DELETE FROM public.recruitment_likes 
        WHERE recruitment_likes.post_id = toggle_recruitment_like.post_id 
        AND user_id = current_user_id;
        
        UPDATE public.recruitment_posts 
        SET likes_count = likes_count - 1 
        WHERE id = toggle_recruitment_like.post_id;
        
        RETURN FALSE;
    ELSE
        INSERT INTO public.recruitment_likes (post_id, user_id)
        VALUES (toggle_recruitment_like.post_id, current_user_id);
        
        UPDATE public.recruitment_posts 
        SET likes_count = likes_count + 1 
        WHERE id = toggle_recruitment_like.post_id;
        
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle bookmark on a recruitment post
CREATE OR REPLACE FUNCTION public.toggle_recruitment_bookmark(post_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    bookmark_exists BOOLEAN;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM public.recruitment_bookmarks 
        WHERE recruitment_bookmarks.post_id = toggle_recruitment_bookmark.post_id 
        AND user_id = current_user_id
    ) INTO bookmark_exists;
    
    IF bookmark_exists THEN
        DELETE FROM public.recruitment_bookmarks 
        WHERE recruitment_bookmarks.post_id = toggle_recruitment_bookmark.post_id 
        AND user_id = current_user_id;
        
        RETURN FALSE;
    ELSE
        INSERT INTO public.recruitment_bookmarks (post_id, user_id)
        VALUES (toggle_recruitment_bookmark.post_id, current_user_id);
        
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a reply to a recruitment post
CREATE OR REPLACE FUNCTION public.add_recruitment_reply(
    p_post_id UUID,
    p_content TEXT
)
RETURNS UUID AS $$
DECLARE
    new_reply_id UUID;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    INSERT INTO public.recruitment_replies (post_id, user_id, content)
    VALUES (p_post_id, current_user_id, p_content)
    RETURNING id INTO new_reply_id;
    
    UPDATE public.recruitment_posts 
    SET comments_count = comments_count + 1 
    WHERE id = p_post_id;
    
    RETURN new_reply_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get replies for a recruitment post
CREATE OR REPLACE FUNCTION public.get_recruitment_replies(p_post_id UUID)
RETURNS TABLE (
    id UUID,
    post_id UUID,
    user_id UUID,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    username VARCHAR(50),
    full_name VARCHAR(255),
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.post_id,
        r.user_id,
        r.content,
        r.created_at,
        pr.username,
        pr.full_name,
        pr.avatar_url
    FROM public.recruitment_replies r
    LEFT JOIN public.profiles pr ON r.user_id = pr.id
    WHERE r.post_id = p_post_id
    ORDER BY r.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_replies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_bookmarks TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_recruitment_posts TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_recruitment_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_recruitment_like TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_recruitment_bookmark TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_recruitment_reply TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recruitment_replies TO authenticated;

-- Enable realtime for recruitment tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_bookmarks;