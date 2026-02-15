-- Migration to allow linking downloads to custom submenus
ALTER TABLE public.downloads
ADD COLUMN submenu_id UUID REFERENCES public.custom_submenus(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_downloads_submenu_id ON public.downloads(submenu_id);

-- Optional: Add a comment to the column
COMMENT ON COLUMN public.downloads.submenu_id IS 'Secondary category reference to a dynamic submenu created in the Founder Panel';
