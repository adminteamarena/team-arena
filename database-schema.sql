-- Team Arena Database Schema
-- Enhanced Match System with Real-time Chat and Seat Selection

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  bio text,
  avatar_url text,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  matches_played integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create matches table if it doesn't exist
CREATE TABLE IF NOT EXISTS matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  sport_type text NOT NULL,
  location text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  max_players integer DEFAULT 10,
  team_format text DEFAULT '5v5',
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  organizer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  description text,
  ready_check_started boolean DEFAULT false,
  ready_check_deadline timestamp,
  weather_condition text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Match participants table
CREATE TABLE IF NOT EXISTS match_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  position_number integer, -- 1-10 for team positioning
  team_side text CHECK (team_side IN ('A', 'B')), -- Team A or B
  is_ready boolean DEFAULT false,
  joined_at timestamp DEFAULT now(),
  UNIQUE(match_id, position_number),
  UNIQUE(match_id, user_id) -- Prevent duplicate participation
);

-- Match chat messages
CREATE TABLE IF NOT EXISTS match_chat (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'quick_action', 'voice')),
  voice_url text,
  voice_duration integer,
  created_at timestamp DEFAULT now()
);

-- Add fields to existing matches table (if they don't exist)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS max_players integer DEFAULT 10;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_format text DEFAULT '5v5';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ready_check_started boolean DEFAULT false;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ready_check_deadline timestamp;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS weather_condition text;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_user_id ON match_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_match_chat_match_id ON match_chat(match_id);
CREATE INDEX IF NOT EXISTS idx_match_chat_created_at ON match_chat(created_at);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_chat ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for matches
CREATE POLICY "Matches are viewable by everyone" ON matches
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create matches" ON matches
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their matches" ON matches
  FOR UPDATE USING (auth.uid() = organizer_id);

-- RLS Policies for match_participants
CREATE POLICY "Match participants are viewable by everyone" ON match_participants
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join matches" ON match_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON match_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave matches they joined" ON match_participants
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for match_chat
CREATE POLICY "Chat messages are viewable by match participants" ON match_chat
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM match_participants
      WHERE match_participants.match_id = match_chat.match_id
      AND match_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Match participants can send messages" ON match_chat
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM match_participants
      WHERE match_participants.match_id = match_chat.match_id
      AND match_participants.user_id = auth.uid()
    )
  );

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Insert some sample data for testing
INSERT INTO matches (title, sport_type, location, date, time, max_players, team_format, organizer_id, description, weather_condition)
VALUES 
  ('Sunday Football Championship', 'Football', 'Central Park Field A', '2024-01-15', '15:00', 10, '5v5', 
   (SELECT id FROM auth.users LIMIT 1), 'Competitive 5v5 match for experienced players', 'sunny'),
  ('Basketball Tournament', 'Basketball', 'Sports Complex Court 1', '2024-01-16', '18:00', 10, '5v5', 
   (SELECT id FROM auth.users LIMIT 1), 'Indoor basketball tournament', 'indoor'),
  ('Tennis Doubles Match', 'Tennis', 'Tennis Club Courts', '2024-01-17', '10:00', 4, '2v2', 
   (SELECT id FROM auth.users LIMIT 1), 'Doubles match for intermediate players', 'cloudy')
ON CONFLICT DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 