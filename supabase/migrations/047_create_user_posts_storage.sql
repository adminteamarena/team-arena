-- Create storage bucket for user posts
-- This migration creates a storage bucket for user-uploaded photos

-- Create user-posts storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-posts',
  'user-posts',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- RLS Policies for user-posts bucket
-- Allow users to upload their own images
CREATE POLICY "Users can upload their own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-posts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view all images (public bucket)
CREATE POLICY "Users can view all images" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-posts');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-posts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own images metadata
CREATE POLICY "Users can update their own images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-posts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );