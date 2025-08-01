-- Test trigger functionality by creating a manual test function
-- This will help us understand if the notification creation is working

-- Create a manual test function to simulate match join/leave notifications
CREATE OR REPLACE FUNCTION public.test_notification_triggers(
    test_user_id UUID,
    test_match_id UUID
) RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    notification_id UUID;
BEGIN
    -- Test 1: Try to create a simple notification manually
    BEGIN
        notification_id := public.create_notification(
            test_user_id,
            'match_joined',
            'Test Join Notification',
            'This is a test notification for joining a match',
            test_match_id,
            test_user_id,
            jsonb_build_object('test', true)
        );
        result := result || 'SUCCESS: Created test join notification with ID: ' || notification_id::TEXT || E'\n';
    EXCEPTION WHEN OTHERS THEN
        result := result || 'ERROR: Failed to create test join notification: ' || SQLERRM || E'\n';
    END;
    
    -- Test 2: Try to create a leave notification manually
    BEGIN
        notification_id := public.create_notification(
            test_user_id,
            'match_left',
            'Test Leave Notification',
            'This is a test notification for leaving a match',
            test_match_id,
            test_user_id,
            jsonb_build_object('test', true)
        );
        result := result || 'SUCCESS: Created test leave notification with ID: ' || notification_id::TEXT || E'\n';
    EXCEPTION WHEN OTHERS THEN
        result := result || 'ERROR: Failed to create test leave notification: ' || SQLERRM || E'\n';
    END;
    
    -- Test 3: Check if the triggers exist
    DECLARE
        trigger_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO trigger_count
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        AND event_object_table = 'match_participants'
        AND trigger_name IN ('notify_match_joined_trigger', 'notify_match_left_trigger');
        
        result := result || 'INFO: Found ' || trigger_count || ' triggers on match_participants table' || E'\n';
    END;
    
    -- Test 4: Check if the functions exist
    DECLARE
        function_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO function_count
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name IN ('notify_match_joined', 'notify_match_left');
        
        result := result || 'INFO: Found ' || function_count || ' trigger functions' || E'\n';
    END;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to manually test the join trigger
CREATE OR REPLACE FUNCTION public.test_join_trigger(
    test_user_id UUID,
    test_match_id UUID
) RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    function_exists BOOLEAN := FALSE;
BEGIN
    -- Check if the trigger functions exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'notify_match_joined'
    ) INTO function_exists;
    
    IF function_exists THEN
        result := result || 'SUCCESS: notify_match_joined function exists' || E'\n';
    ELSE
        result := result || 'ERROR: notify_match_joined function does not exist' || E'\n';
    END IF;
    
    -- Check if the leave trigger function exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'notify_match_left'
    ) INTO function_exists;
    
    IF function_exists THEN
        result := result || 'SUCCESS: notify_match_left function exists' || E'\n';
    ELSE
        result := result || 'ERROR: notify_match_left function does not exist' || E'\n';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a simple query function to check recent notifications
CREATE OR REPLACE FUNCTION public.check_recent_notifications(
    target_user_id UUID DEFAULT NULL,
    limit_count INTEGER DEFAULT 10
) RETURNS TABLE(
    id UUID,
    user_id UUID,
    type VARCHAR,
    title VARCHAR,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF target_user_id IS NULL THEN
        RETURN QUERY
        SELECT n.id, n.user_id, n.type, n.title, n.message, n.created_at
        FROM public.notifications n
        ORDER BY n.created_at DESC
        LIMIT limit_count;
    ELSE
        RETURN QUERY
        SELECT n.id, n.user_id, n.type, n.title, n.message, n.created_at
        FROM public.notifications n
        WHERE n.user_id = target_user_id
        ORDER BY n.created_at DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 