-- Alter matches table to be compatible with React app expectations
-- This migration modifies the existing matches table structure

-- Add new columns that the app expects to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS title VARCHAR(100),
ADD COLUMN IF NOT EXISTS sport_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS date VARCHAR(20), -- YYYY-MM-DD format as expected by app
ADD COLUMN IF NOT EXISTS time VARCHAR(10), -- HH:MM format as expected by app
ADD COLUMN IF NOT EXISTS team_format VARCHAR(20), -- 1v1, 2v2, etc.
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'upcoming',
ADD COLUMN IF NOT EXISTS ready_check_started BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ready_check_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS weather_condition VARCHAR(20) DEFAULT 'indoor';

-- Copy data from old columns to new columns if they exist and new columns are empty
UPDATE public.matches 
SET 
    organizer_id = creator_id,
    title = match_name,
    sport_type = game_type,
    status = match_status
WHERE organizer_id IS NULL OR title IS NULL OR sport_type IS NULL OR status IS NULL;

-- Add constraints for the new status column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'matches_status_check'
    ) THEN
        ALTER TABLE public.matches 
        ADD CONSTRAINT matches_status_check 
        CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled'));
    END IF;
END $$;

-- Make required fields NOT NULL after copying data
ALTER TABLE public.matches 
ALTER COLUMN organizer_id SET NOT NULL,
ALTER COLUMN title SET NOT NULL,
ALTER COLUMN sport_type SET NOT NULL;

-- Update match_participants table to be compatible with the app
-- First, add new columns without primary key constraint
ALTER TABLE public.match_participants 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS position_number INTEGER,
ADD COLUMN IF NOT EXISTS team_side VARCHAR(1) CHECK (team_side IN ('A', 'B')),
ADD COLUMN IF NOT EXISTS is_ready BOOLEAN DEFAULT FALSE;

-- Update existing records to have unique IDs if they don't have them
UPDATE public.match_participants 
SET id = uuid_generate_v4() 
WHERE id IS NULL;

-- Now make id NOT NULL
ALTER TABLE public.match_participants 
ALTER COLUMN id SET NOT NULL;

-- Drop the existing primary key constraint
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'match_participants_pkey' 
        AND table_name = 'match_participants'
    ) THEN
        ALTER TABLE public.match_participants DROP CONSTRAINT match_participants_pkey;
    END IF;
END $$;

-- Add the new primary key
ALTER TABLE public.match_participants ADD PRIMARY KEY (id);

-- Create unique constraints for positioning if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'match_participants_user_unique' 
        AND table_name = 'match_participants'
    ) THEN
        ALTER TABLE public.match_participants 
        ADD CONSTRAINT match_participants_user_unique UNIQUE(match_id, user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'match_participants_position_unique' 
        AND table_name = 'match_participants'
    ) THEN
        ALTER TABLE public.match_participants 
        ADD CONSTRAINT match_participants_position_unique UNIQUE(match_id, position_number, team_side);
    END IF;
END $$;

-- Create match_chat table if it doesn't exist (for app compatibility)
CREATE TABLE IF NOT EXISTS public.match_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'quick_action')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Add missing columns to users table for app compatibility
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Update follower_count to followers_count if the data exists
UPDATE public.users 
SET followers_count = follower_count 
WHERE followers_count IS NULL AND follower_count IS NOT NULL;

-- Create or replace profiles view for app compatibility
CREATE OR REPLACE VIEW public.profiles AS
SELECT 
    id,
    id as user_id,
    username,
    COALESCE(
        full_name,
        CASE 
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
            THEN first_name || ' ' || last_name
            WHEN first_name IS NOT NULL 
            THEN first_name
            WHEN last_name IS NOT NULL 
            THEN last_name
            ELSE username
        END
    ) as full_name,
    bio,
    COALESCE(avatar_url, profile_picture_url) as avatar_url,
    COALESCE(followers_count, follower_count, 0) as followers_count,
    COALESCE(following_count, 0) as following_count,
    COALESCE(matches_played, 0) as matches_played,
    created_at,
    updated_at
FROM public.users;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_matches_organizer_id ON public.matches(organizer_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(date);
CREATE INDEX IF NOT EXISTS idx_matches_sport_type ON public.matches(sport_type);
CREATE INDEX IF NOT EXISTS idx_match_participants_match_id ON public.match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_user_id ON public.match_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_match_chat_match_id ON public.match_chat(match_id);
CREATE INDEX IF NOT EXISTS idx_match_chat_created_at ON public.match_chat(created_at DESC);

-- Enable Row Level Security on new tables
ALTER TABLE public.match_chat ENABLE ROW LEVEL SECURITY;

-- Update RLS policies to use new column names
DROP POLICY IF EXISTS "Anyone can view public matches" ON public.matches;
CREATE POLICY "Anyone can view public matches" ON public.matches
    FOR SELECT USING (NOT is_private OR organizer_id = auth.uid() OR 
                     EXISTS (SELECT 1 FROM public.match_participants mp 
                            WHERE mp.match_id = id AND mp.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create matches" ON public.matches;
CREATE POLICY "Users can create matches" ON public.matches
    FOR INSERT WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Match organizers can update matches" ON public.matches;
CREATE POLICY "Match organizers can update matches" ON public.matches
    FOR UPDATE USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Match organizers can delete matches" ON public.matches;
CREATE POLICY "Match organizers can delete matches" ON public.matches
    FOR DELETE USING (auth.uid() = organizer_id);

-- Create RLS policies for match_chat
DROP POLICY IF EXISTS "Users can view match chat if they're participants" ON public.match_chat;
CREATE POLICY "Users can view match chat if they're participants" ON public.match_chat
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.match_participants mp 
               WHERE mp.match_id = match_id AND mp.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can send messages to matches they're in" ON public.match_chat;
CREATE POLICY "Users can send messages to matches they're in" ON public.match_chat
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (SELECT 1 FROM public.match_participants mp 
               WHERE mp.match_id = match_id AND mp.user_id = auth.uid())
    );

-- Update existing functions to use new column names
CREATE OR REPLACE FUNCTION public.compute_scheduled_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Convert date and time to timestamp if both fields exist
    IF NEW.date IS NOT NULL AND NEW.time IS NOT NULL THEN
        NEW.scheduled_date = (NEW.date || ' ' || NEW.time)::timestamp with time zone;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS compute_scheduled_date_trigger ON public.matches;
CREATE TRIGGER compute_scheduled_date_trigger
    BEFORE INSERT OR UPDATE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.compute_scheduled_date();

-- Update the match creation function to use new column names
CREATE OR REPLACE FUNCTION public.create_match_chat_room()
RETURNS TRIGGER AS $$
DECLARE
    room_id UUID;
BEGIN
    -- Create chat room for the match
    INSERT INTO public.chat_rooms (room_name, room_type, match_id, created_by)
    VALUES (NEW.title || ' Chat', 'match_group', NEW.id, NEW.organizer_id)
    RETURNING id INTO room_id;
    
    -- Update match with chat room id
    UPDATE public.matches SET chat_room_id = room_id WHERE id = NEW.id;
    
    -- Add organizer as admin participant
    INSERT INTO public.chat_participants (room_id, user_id, participant_role)
    VALUES (room_id, NEW.organizer_id, 'admin');
    
    -- Add organizer as match participant with position and team
    INSERT INTO public.match_participants (match_id, user_id, position_number, team_side)
    VALUES (NEW.id, NEW.organizer_id, 1, 'A')
    ON CONFLICT (match_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_match_created ON public.matches;
CREATE TRIGGER on_match_created
    AFTER INSERT ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.create_match_chat_room();

-- Create trigger for match_chat timestamps
DROP TRIGGER IF EXISTS update_match_chat_updated_at ON public.match_chat;
CREATE TRIGGER update_match_chat_updated_at BEFORE UPDATE ON public.match_chat
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 