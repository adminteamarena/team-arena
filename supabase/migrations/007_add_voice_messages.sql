-- Migration to add voice message support to match_chat table
-- Add voice_url and voice_duration columns for voice messages

-- Add voice_url column for storing voice message URLs
ALTER TABLE match_chat 
ADD COLUMN voice_url text;

-- Add voice_duration column for storing voice message duration in seconds
ALTER TABLE match_chat 
ADD COLUMN voice_duration integer;

-- Update the message_type check constraint to include 'voice'
ALTER TABLE match_chat 
DROP CONSTRAINT IF EXISTS match_chat_message_type_check;

ALTER TABLE match_chat 
ADD CONSTRAINT match_chat_message_type_check 
CHECK (message_type IN ('text', 'system', 'quick_action', 'voice'));

-- Create index for voice messages for better performance
CREATE INDEX IF NOT EXISTS idx_match_chat_voice_messages 
ON match_chat (match_id, message_type) 
WHERE message_type = 'voice';

-- Add comment to document the voice message feature
COMMENT ON COLUMN match_chat.voice_url IS 'URL to the voice message audio file stored in Supabase storage';
COMMENT ON COLUMN match_chat.voice_duration IS 'Duration of the voice message in seconds';

-- Create a function to clean up voice message files when chat messages are deleted
CREATE OR REPLACE FUNCTION cleanup_voice_message_files()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the deletion for debugging
    RAISE NOTICE 'Cleaning up voice message file for message ID: %', OLD.id;
    
    -- Note: In a real implementation, you might want to delete the actual file from storage
    -- This would require a Supabase Edge Function or similar mechanism
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clean up voice files on message deletion
DROP TRIGGER IF EXISTS cleanup_voice_files_trigger ON match_chat;
CREATE TRIGGER cleanup_voice_files_trigger
    BEFORE DELETE ON match_chat
    FOR EACH ROW
    WHEN (OLD.message_type = 'voice' AND OLD.voice_url IS NOT NULL)
    EXECUTE FUNCTION cleanup_voice_message_files(); 