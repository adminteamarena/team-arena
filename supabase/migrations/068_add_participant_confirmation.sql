-- Add confirmation status field to match_participants table
ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS is_confirmed boolean DEFAULT false;

-- Add comment to document the field
COMMENT ON COLUMN match_participants.is_confirmed IS 'Whether the participant has confirmed their spot in the match';

-- Create index for faster queries on confirmation status
CREATE INDEX IF NOT EXISTS idx_match_participants_confirmed ON match_participants(is_confirmed);