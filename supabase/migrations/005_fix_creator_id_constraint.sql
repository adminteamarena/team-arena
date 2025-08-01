-- Fix the creator_id constraint issue for backward compatibility
-- This ensures both creator_id and organizer_id are populated

-- Drop the NOT NULL constraint on creator_id temporarily
ALTER TABLE public.matches ALTER COLUMN creator_id DROP NOT NULL;

-- Create a function to sync creator_id and organizer_id
CREATE OR REPLACE FUNCTION sync_match_creator_organizer()
RETURNS TRIGGER AS $$
BEGIN
    -- If organizer_id is provided but creator_id is not, copy organizer_id to creator_id
    IF NEW.organizer_id IS NOT NULL AND NEW.creator_id IS NULL THEN
        NEW.creator_id = NEW.organizer_id;
    END IF;
    
    -- If creator_id is provided but organizer_id is not, copy creator_id to organizer_id
    IF NEW.creator_id IS NOT NULL AND NEW.organizer_id IS NULL THEN
        NEW.organizer_id = NEW.creator_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync the fields
DROP TRIGGER IF EXISTS sync_creator_organizer_trigger ON public.matches;
CREATE TRIGGER sync_creator_organizer_trigger
    BEFORE INSERT OR UPDATE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION sync_match_creator_organizer();

-- Update existing records to ensure both fields are populated
UPDATE public.matches 
SET creator_id = organizer_id 
WHERE creator_id IS NULL AND organizer_id IS NOT NULL;

UPDATE public.matches 
SET organizer_id = creator_id 
WHERE organizer_id IS NULL AND creator_id IS NOT NULL;

-- Now make both fields NOT NULL after they're synchronized
ALTER TABLE public.matches ALTER COLUMN creator_id SET NOT NULL;
ALTER TABLE public.matches ALTER COLUMN organizer_id SET NOT NULL; 