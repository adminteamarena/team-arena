-- Create recruitment interactions tables for likes and comments
-- This replaces the localStorage system with proper database storage

-- Recruitment post likes table
CREATE TABLE IF NOT EXISTS recruitment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL, -- Can reference either recruitment_posts.id or user_posts.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id) -- Prevent duplicate likes
);

-- Recruitment post comments table  
CREATE TABLE IF NOT EXISTS recruitment_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL, -- Can reference either recruitment_posts.id or user_posts.id
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recruitment post bookmarks table
CREATE TABLE IF NOT EXISTS recruitment_bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL, -- Can reference either recruitment_posts.id or user_posts.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id) -- Prevent duplicate bookmarks
);

-- Enable Row Level Security
ALTER TABLE recruitment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_comments ENABLE ROW LEVEL SECURITY;  
ALTER TABLE recruitment_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recruitment_likes
DO $$ BEGIN
    CREATE POLICY "Users can view all recruitment likes" ON recruitment_likes
        FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert their own recruitment likes" ON recruitment_likes
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own recruitment likes" ON recruitment_likes
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policies for recruitment_comments
DO $$ BEGIN
    CREATE POLICY "Users can view all recruitment comments" ON recruitment_comments
        FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert their own recruitment comments" ON recruitment_comments
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own recruitment comments" ON recruitment_comments
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own recruitment comments" ON recruitment_comments
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policies for recruitment_bookmarks
DO $$ BEGIN
    CREATE POLICY "Users can view their own recruitment bookmarks" ON recruitment_bookmarks
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert their own recruitment bookmarks" ON recruitment_bookmarks
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own recruitment bookmarks" ON recruitment_bookmarks
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recruitment_likes_post_id ON recruitment_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_likes_user_id ON recruitment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_comments_post_id ON recruitment_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_comments_user_id ON recruitment_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_bookmarks_post_id ON recruitment_bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_bookmarks_user_id ON recruitment_bookmarks(user_id);