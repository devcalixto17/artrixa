-- Add status for approval workflow and media support
ALTER TABLE public.downloads 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_downloads_status ON public.downloads(status);
CREATE INDEX IF NOT EXISTS idx_downloads_author ON public.downloads(author_id);
CREATE INDEX IF NOT EXISTS idx_downloads_category ON public.downloads(category_id);

-- Update RLS policy for downloads to only show approved posts (or own posts, or admin viewing)
DROP POLICY IF EXISTS "Downloads are viewable by everyone" ON public.downloads;

CREATE POLICY "Downloads viewable based on status" 
ON public.downloads 
FOR SELECT 
USING (
  status = 'approved' 
  OR auth.uid() = author_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'fundador'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
);

-- Insert default categories if not exist
INSERT INTO public.categories (name, slug, icon) VALUES
  ('Plugins', 'plugins', 'Puzzle'),
  ('Skins de Player', 'skins-player', 'User'),
  ('Skins de Armas', 'skins-armas', 'Target'),
  ('Mods', 'mods', 'Wrench'),
  ('Mapas', 'mapas', 'Map'),
  ('Ferramentas', 'ferramentas', 'Settings')
ON CONFLICT (slug) DO NOTHING;