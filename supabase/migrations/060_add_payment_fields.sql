-- Add payment fields to matches table
-- This migration adds payment/free toggle functionality

-- Add payment-related columns to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price_per_person DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'MAD';

-- Add constraint to ensure price is positive when match is paid
ALTER TABLE public.matches 
ADD CONSTRAINT matches_paid_price_check 
CHECK (
  (is_paid = FALSE AND price_per_person = 0.00) OR 
  (is_paid = TRUE AND price_per_person > 0.00)
);

-- Add index for payment status filtering
CREATE INDEX IF NOT EXISTS idx_matches_is_paid ON public.matches(is_paid);
CREATE INDEX IF NOT EXISTS idx_matches_price_per_person ON public.matches(price_per_person);

-- Update the matches view if it exists
DROP VIEW IF EXISTS public.match_details_view;
CREATE OR REPLACE VIEW public.match_details_view AS
SELECT 
    m.*,
    u.username as organizer_username,
    u.full_name as organizer_full_name,
    u.avatar_url as organizer_avatar_url,
    COUNT(mp.id) as participant_count
FROM public.matches m
LEFT JOIN public.users u ON m.organizer_id = u.id
LEFT JOIN public.match_participants mp ON m.id = mp.match_id
GROUP BY m.id, u.username, u.full_name, u.avatar_url;