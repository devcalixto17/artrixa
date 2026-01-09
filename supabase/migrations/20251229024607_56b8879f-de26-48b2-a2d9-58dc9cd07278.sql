-- Create badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#FFD700',
  is_automatic BOOLEAN NOT NULL DEFAULT false,
  automatic_criteria TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges junction table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  awarded_by UUID,
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badges are viewable by everyone
CREATE POLICY "Badges are viewable by everyone"
ON public.badges
FOR SELECT
USING (true);

-- Only fundadors can manage badges
CREATE POLICY "Only fundadors can manage badges"
ON public.badges
FOR ALL
USING (has_role(auth.uid(), 'fundador'));

-- User badges are viewable by everyone
CREATE POLICY "User badges are viewable by everyone"
ON public.user_badges
FOR SELECT
USING (true);

-- Only fundadors can insert user badges
CREATE POLICY "Only fundadors can insert user badges"
ON public.user_badges
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'fundador'));

-- Only fundadors can delete user badges
CREATE POLICY "Only fundadors can delete user badges"
ON public.user_badges
FOR DELETE
USING (has_role(auth.uid(), 'fundador'));

-- Insert default automatic badges
INSERT INTO public.badges (name, description, icon, color, is_automatic, automatic_criteria) VALUES
('Veterano', 'Registrado há mais de 1 ano', 'Award', '#FFD700', true, 'registered_1_year'),
('Contribuidor', '10+ downloads postados', 'Trophy', '#C0C0C0', true, 'downloads_10'),
('Pioneiro', 'Um dos primeiros membros', 'Star', '#CD7F32', false, NULL),
('VIP', 'Membro especial', 'Crown', '#9B59B6', false, NULL);

-- Create function to auto-award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  veteran_badge_id UUID;
  contributor_badge_id UUID;
  user_download_count INTEGER;
  user_created_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get badge IDs
  SELECT id INTO veteran_badge_id FROM badges WHERE automatic_criteria = 'registered_1_year';
  SELECT id INTO contributor_badge_id FROM badges WHERE automatic_criteria = 'downloads_10';
  
  -- Check for Veterano badge (1 year membership)
  SELECT created_at INTO user_created_at FROM profiles WHERE user_id = NEW.user_id;
  IF user_created_at IS NOT NULL AND user_created_at < now() - interval '1 year' THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (NEW.user_id, veteran_badge_id)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to check download count badges
CREATE OR REPLACE FUNCTION public.check_download_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contributor_badge_id UUID;
  user_download_count INTEGER;
BEGIN
  SELECT id INTO contributor_badge_id FROM badges WHERE automatic_criteria = 'downloads_10';
  
  SELECT COUNT(*) INTO user_download_count FROM downloads WHERE author_id = NEW.author_id;
  
  IF user_download_count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (NEW.author_id, contributor_badge_id)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for download badges
CREATE TRIGGER on_download_created
  AFTER INSERT ON public.downloads
  FOR EACH ROW
  EXECUTE FUNCTION public.check_download_badges();