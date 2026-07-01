
-- 1. Downloads author spoofing fix
DROP POLICY IF EXISTS "Authenticated users can insert downloads" ON public.downloads;
CREATE POLICY "Users can insert downloads as themselves"
ON public.downloads FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

-- 2. Restrict user_moderations to subject user + staff
DROP POLICY IF EXISTS "User moderations are viewable by everyone" ON public.user_moderations;
CREATE POLICY "Users see own moderations, staff see all"
ON public.user_moderations FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'fundador'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'staff'::app_role)
);

-- 3. Restrict role_permissions reads to authenticated users
DROP POLICY IF EXISTS "Role permissions viewable by everyone" ON public.role_permissions;
CREATE POLICY "Role permissions viewable by authenticated"
ON public.role_permissions FOR SELECT
TO authenticated
USING (true);

-- 4. Fix mutable search_path
CREATE OR REPLACE FUNCTION public.increment_site_visits()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_value BIGINT;
BEGIN
    INSERT INTO public.site_stats (name, value)
    VALUES ('visits', 1)
    ON CONFLICT (name) DO UPDATE
    SET value = site_stats.value + 1
    RETURNING value INTO new_value;
    RETURN new_value;
END;
$function$;

CREATE OR REPLACE FUNCTION public.acknowledge_user_kick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.user_moderations
    SET is_active = false
    WHERE user_id = auth.uid()
      AND moderation_type = 'kick'
      AND is_active = true;
END;
$function$;
