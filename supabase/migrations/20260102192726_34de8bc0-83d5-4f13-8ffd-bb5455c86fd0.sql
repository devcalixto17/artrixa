-- Create moderation table for user punishments (ban, mute, kick)
CREATE TABLE public.user_moderations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  moderation_type TEXT NOT NULL CHECK (moderation_type IN ('ban', 'mute', 'kick')),
  reason TEXT NOT NULL,
  applied_by UUID NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_permanent BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_moderations ENABLE ROW LEVEL SECURITY;

-- Policies for user_moderations
CREATE POLICY "User moderations are viewable by everyone"
ON public.user_moderations
FOR SELECT
USING (true);

CREATE POLICY "Only fundador can insert user moderations"
ON public.user_moderations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'fundador'::app_role));

CREATE POLICY "Only fundador can update user moderations"
ON public.user_moderations
FOR UPDATE
USING (has_role(auth.uid(), 'fundador'::app_role));

CREATE POLICY "Only fundador can delete user moderations"
ON public.user_moderations
FOR DELETE
USING (has_role(auth.uid(), 'fundador'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_user_moderations_user_id ON public.user_moderations(user_id);
CREATE INDEX idx_user_moderations_active ON public.user_moderations(is_active, expires_at);

-- Update RLS policies for user_roles to allow fundador to manage roles
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

CREATE POLICY "Fundador and admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'fundador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Fundador and admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'fundador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Fundador and admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'fundador'::app_role) OR has_role(auth.uid(), 'admin'::app_role));