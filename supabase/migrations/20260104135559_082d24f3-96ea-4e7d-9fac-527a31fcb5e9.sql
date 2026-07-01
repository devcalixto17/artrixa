-- Add background_color column to badges table
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#1a1a2e';

-- Add missing skin categories
INSERT INTO public.categories (name, slug, icon) 
VALUES 
  ('Skins de Facas', 'skins-facas', 'Knife'),
  ('Skins de Zombies', 'skins-zombies', 'Skull')
ON CONFLICT (slug) DO NOTHING;

-- Add download_url column to vip_posts for VIP downloads
ALTER TABLE public.vip_posts ADD COLUMN IF NOT EXISTS download_url text;
ALTER TABLE public.vip_posts ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}';

-- Add unique constraint to user_badges if not exists (for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_badges_user_badge_unique'
  ) THEN
    ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_badge_unique UNIQUE (user_id, badge_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;