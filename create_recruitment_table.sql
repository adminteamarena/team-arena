-- Create recruitment_posts table
-- Run this SQL in your Supabase SQL editor to create the recruitment posts table

CREATE TABLE IF NOT EXISTS recruitment_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sport TEXT DEFAULT 'General',
    location TEXT DEFAULT 'Global',
    is_urgent BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE recruitment_posts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all recruitment posts" ON recruitment_posts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own recruitment posts" ON recruitment_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recruitment posts" ON recruitment_posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recruitment posts" ON recruitment_posts
    FOR DELETE USING (auth.uid() = user_id);