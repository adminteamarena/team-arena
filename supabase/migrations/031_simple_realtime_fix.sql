-- Simple real-time fix - just ensure basic permissions are in place

-- Verify the policies were created successfully
SELECT 
    'Policies created' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('match_participants', 'matches')
AND policyname = 'Allow realtime select for all';

-- Ensure basic SELECT permissions
GRANT SELECT ON public.match_participants TO anon, authenticated;
GRANT SELECT ON public.matches TO anon, authenticated;

-- Final verification
SELECT 
    'Real-time setup complete' as status,
    'Check debug panel in app' as next_step;