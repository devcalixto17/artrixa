ALTER TABLE public.custom_pages ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE public.custom_submenus ADD COLUMN IF NOT EXISTS external_url TEXT;