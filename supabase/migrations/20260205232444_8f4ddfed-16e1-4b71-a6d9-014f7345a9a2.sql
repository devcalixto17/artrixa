
-- Allow recipients to delete their own private messages
CREATE POLICY "Recipients can delete their own messages"
ON public.private_messages
FOR DELETE
USING (auth.uid() = recipient_id);

-- Allow fundador to delete any messages they sent
CREATE POLICY "Fundador can delete messages they sent"
ON public.private_messages
FOR DELETE
USING (auth.uid() = sender_id AND has_role(auth.uid(), 'fundador'::app_role));

-- Allow fundador to update messages they sent (edit)
CREATE POLICY "Fundador can update messages they sent"
ON public.private_messages
FOR UPDATE
USING (auth.uid() = sender_id AND has_role(auth.uid(), 'fundador'::app_role))
WITH CHECK (auth.uid() = sender_id AND has_role(auth.uid(), 'fundador'::app_role));
