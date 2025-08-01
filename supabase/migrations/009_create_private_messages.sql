-- Create private conversations and messages system
-- This migration adds support for direct user-to-user messaging

-- Create private_conversations table
CREATE TABLE IF NOT EXISTS public.private_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_one_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    participant_two_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure users can't create multiple conversations with each other
    CONSTRAINT private_conversations_unique_participants 
    CHECK (participant_one_id != participant_two_id),
    
    -- Unique constraint to prevent duplicate conversations
    CONSTRAINT private_conversations_participants_unique 
    UNIQUE (participant_one_id, participant_two_id)
);

-- Create private_messages table
CREATE TABLE IF NOT EXISTS public.private_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'image')),
    voice_url TEXT,
    voice_duration INTEGER,
    image_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_read_status table to track what each user has read
CREATE TABLE IF NOT EXISTS public.conversation_read_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_message_id UUID REFERENCES public.private_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one read status per user per conversation
    CONSTRAINT conversation_read_status_unique 
    UNIQUE (conversation_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_private_conversations_participant_one ON public.private_conversations(participant_one_id);
CREATE INDEX IF NOT EXISTS idx_private_conversations_participant_two ON public.private_conversations(participant_two_id);
CREATE INDEX IF NOT EXISTS idx_private_conversations_updated_at ON public.private_conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_private_messages_conversation_id ON public.private_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender_id ON public.private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON public.private_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_is_read ON public.private_messages(is_read);

CREATE INDEX IF NOT EXISTS idx_conversation_read_status_conversation_id ON public.conversation_read_status(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_read_status_user_id ON public.conversation_read_status(user_id);

-- Enable Row Level Security
ALTER TABLE public.private_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_read_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for private_conversations
CREATE POLICY "Users can view conversations they're part of" ON public.private_conversations
    FOR SELECT USING (
        auth.uid() = participant_one_id OR auth.uid() = participant_two_id
    );

CREATE POLICY "Users can create conversations" ON public.private_conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant_one_id OR auth.uid() = participant_two_id
    );

-- RLS Policies for private_messages
CREATE POLICY "Users can view messages in their conversations" ON public.private_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.private_conversations pc
            WHERE pc.id = conversation_id 
            AND (pc.participant_one_id = auth.uid() OR pc.participant_two_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages to their conversations" ON public.private_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.private_conversations pc
            WHERE pc.id = conversation_id 
            AND (pc.participant_one_id = auth.uid() OR pc.participant_two_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own message read status" ON public.private_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.private_conversations pc
            WHERE pc.id = conversation_id 
            AND (pc.participant_one_id = auth.uid() OR pc.participant_two_id = auth.uid())
        )
    );

-- RLS Policies for conversation_read_status
CREATE POLICY "Users can view their own read status" ON public.conversation_read_status
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own read status" ON public.conversation_read_status
    FOR ALL USING (auth.uid() = user_id);

-- Create function to get or create conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user_one_id UUID, user_two_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    sorted_user_one UUID;
    sorted_user_two UUID;
BEGIN
    -- Sort user IDs to ensure consistent ordering
    IF user_one_id < user_two_id THEN
        sorted_user_one := user_one_id;
        sorted_user_two := user_two_id;
    ELSE
        sorted_user_one := user_two_id;
        sorted_user_two := user_one_id;
    END IF;
    
    -- Try to find existing conversation
    SELECT id INTO conversation_id
    FROM public.private_conversations
    WHERE participant_one_id = sorted_user_one AND participant_two_id = sorted_user_two;
    
    -- If not found, create new conversation
    IF conversation_id IS NULL THEN
        INSERT INTO public.private_conversations (participant_one_id, participant_two_id)
        VALUES (sorted_user_one, sorted_user_two)
        RETURNING id INTO conversation_id;
        
        -- Initialize read status for both participants
        INSERT INTO public.conversation_read_status (conversation_id, user_id)
        VALUES 
            (conversation_id, sorted_user_one),
            (conversation_id, sorted_user_two);
    END IF;
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update conversation timestamp when new message is sent
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.private_conversations
    SET updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update conversation timestamp
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON public.private_messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(conv_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update read status
    INSERT INTO public.conversation_read_status (conversation_id, user_id, last_read_at)
    VALUES (conv_id, user_id, NOW())
    ON CONFLICT (conversation_id, user_id)
    DO UPDATE SET 
        last_read_at = NOW(),
        updated_at = NOW();
    
    -- Mark all messages in conversation as read for this user
    UPDATE public.private_messages
    SET is_read = TRUE
    WHERE conversation_id = conv_id 
    AND sender_id != user_id
    AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.private_conversations TO authenticated;
GRANT ALL ON public.private_messages TO authenticated; 
GRANT ALL ON public.conversation_read_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_as_read TO authenticated; 