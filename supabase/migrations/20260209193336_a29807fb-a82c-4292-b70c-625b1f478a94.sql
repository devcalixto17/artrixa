
-- Insert the "Membro Verificado" badge
INSERT INTO public.badges (name, icon, color, description, is_automatic, automatic_criteria, background_color)
VALUES ('Membro Verificado', 'Shield', '#00cc66', 'Insígnia atribuída automaticamente ao se registrar no site.', true, 'on_register', '#0a2e1a')
ON CONFLICT DO NOTHING;

-- Create a function to auto-assign "Membro Verificado" badge on new profile creation
CREATE OR REPLACE FUNCTION public.auto_assign_verified_badge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _badge_id uuid;
BEGIN
  SELECT id INTO _badge_id FROM public.badges WHERE name = 'Membro Verificado' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (NEW.user_id, _badge_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_auto_assign_verified_badge ON public.profiles;
CREATE TRIGGER trigger_auto_assign_verified_badge
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_verified_badge();
