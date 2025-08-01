# Storage Setup Guide for Voice Messages

## Issue
The voice message upload is failing because the storage buckets need proper RLS (Row Level Security) policies to allow authenticated users to upload files.

## Solution
Since the migration couldn't create the RLS policies automatically, you need to set them up manually in the Supabase dashboard.

## Steps to Fix

### 1. Open Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to **Storage** in the left sidebar

### 2. Configure voice_messages Bucket
- Click on the **voice_messages** bucket
- Click on **Policies** tab
- Click **New Policy**

### 3. Create Upload Policy
Create a policy with these settings:
- **Name**: `Allow authenticated users to upload voice messages`
- **Policy Type**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
bucket_id = 'voice_messages' AND auth.role() = 'authenticated'
```

### 4. Create Read Policy
Create another policy:
- **Name**: `Allow anyone to read voice messages`
- **Policy Type**: `SELECT`
- **Target roles**: `anon, authenticated`
- **Policy definition**:
```sql
bucket_id = 'voice_messages'
```

### 5. Configure avatars Bucket (if needed)
Repeat the same steps for the **avatars** bucket:

**Upload Policy**:
- **Name**: `Allow authenticated users to upload to avatars`
- **Policy Type**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition**:
```sql
bucket_id = 'avatars' AND auth.role() = 'authenticated'
```

**Read Policy**:
- **Name**: `Allow anyone to read avatars`
- **Policy Type**: `SELECT`
- **Target roles**: `anon, authenticated`
- **Policy definition**:
```sql
bucket_id = 'avatars'
```

## Alternative: Quick Fix via SQL
If you prefer to use SQL, you can run these commands in the Supabase SQL editor:

```sql
-- Enable RLS on storage.objects (if not already enabled)
-- Note: This might need to be done via dashboard if permission issues persist

-- Create policies for voice_messages bucket
CREATE POLICY "Allow authenticated users to upload voice messages" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice_messages');

CREATE POLICY "Allow anyone to read voice messages" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'voice_messages');

-- Create policies for avatars bucket  
CREATE POLICY "Allow authenticated users to upload to avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow anyone to read avatars" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars');
```

## Testing
After setting up the policies:
1. Refresh your React app
2. Try recording a voice message
3. Check the browser console for any remaining errors
4. Verify the voice message appears in chat with play controls

## Troubleshooting
- If policies don't save: Check if you have proper admin permissions
- If upload still fails: Verify the bucket names match exactly (`voice_messages`)
- If authentication issues: Make sure users are properly logged in

The voice message feature should work correctly once these policies are in place! 