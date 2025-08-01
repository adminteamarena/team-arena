-- Create storage buckets for voice messages and avatars
-- This migration sets up the necessary storage infrastructure

-- Create avatars bucket for profile pictures and voice messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg']
) ON CONFLICT (id) DO NOTHING;

-- Create voice_messages bucket specifically for voice messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'voice_messages',
    'voice_messages',
    true,
    5242880, -- 5MB limit for voice messages
    ARRAY['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg']
) ON CONFLICT (id) DO NOTHING; 