-- Create private_messages table for founder to user messaging
CREATE TABLE public.private_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages sent to them
CREATE POLICY "Users can view their received messages"
ON public.private_messages
FOR SELECT
USING (auth.uid() = recipient_id);

-- Policy: Users can view messages they sent
CREATE POLICY "Users can view messages they sent"
ON public.private_messages
FOR SELECT
USING (auth.uid() = sender_id);

-- Policy: Fundadores can insert messages
CREATE POLICY "Fundadores can send messages"
ON public.private_messages
FOR INSERT
WITH CHECK (
    auth.uid() = sender_id 
    AND public.has_role(auth.uid(), 'fundador')
);

-- Policy: Recipients can update (mark as read)
CREATE POLICY "Recipients can mark messages as read"
ON public.private_messages
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Add index for faster lookups
CREATE INDEX idx_private_messages_recipient ON public.private_messages(recipient_id);
CREATE INDEX idx_private_messages_sender ON public.private_messages(sender_id);