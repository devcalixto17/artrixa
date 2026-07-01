CREATE OR REPLACE FUNCTION public.is_staff(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = is_staff.user_id 
    AND role IN ('fundador', 'admin', 'staff')
  );
END;
$function$;