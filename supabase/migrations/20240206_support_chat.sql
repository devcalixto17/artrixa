-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    assigned_to UUID REFERENCES auth.users(id)
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_staff_reply BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Policies for specific roles
-- Helper function to check if user is staff
CREATE OR REPLACE FUNCTION public.is_staff(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = is_staff.user_id 
    AND role IN ('fundador', 'admin', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for support_tickets
CREATE POLICY "Users can view own tickets" 
ON support_tickets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets" 
ON support_tickets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all tickets" 
ON support_tickets FOR SELECT 
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can update all tickets" 
ON support_tickets FOR UPDATE 
USING (is_staff(auth.uid()));

-- Policies for support_messages
CREATE POLICY "Users can view messages for own tickets" 
ON support_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM support_tickets 
        WHERE support_tickets.id = support_messages.ticket_id 
        AND support_tickets.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages for own tickets" 
ON support_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM support_tickets 
        WHERE support_tickets.id = support_messages.ticket_id 
        AND support_tickets.user_id = auth.uid()
    )
);

CREATE POLICY "Staff can view all messages" 
ON support_messages FOR SELECT 
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can insert messages" 
ON support_messages FOR INSERT 
WITH CHECK (is_staff(auth.uid()));

-- Add realtime
alter publication supabase_realtime add table support_messages;
alter publication supabase_realtime add table support_tickets;
