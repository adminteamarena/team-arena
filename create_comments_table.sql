-- Run this SQL directly in your Supabase SQL Editor to create the missing recruitment_comments table

-- Create recruitment_comments table
CREATE TABLE IF NOT EXISTS recruitment_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE recruitment_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all recruitment comments" ON recruitment_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own recruitment comments" ON recruitment_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recruitment comments" ON recruitment_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recruitment comments" ON recruitment_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recruitment_comments_post_id ON recruitment_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_comments_user_id ON recruitment_comments(user_id);