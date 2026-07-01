-- Migration to allow linking downloads to custom submenus and custom pages
ALTER TABLE public.downloads
ADD COLUMN submenu_id UUID REFERENCES public.custom_submenus(id) ON DELETE SET NULL,
ADD COLUMN custom_page_id UUID REFERENCES public.custom_pages(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_downloads_submenu_id ON public.downloads(submenu_id);
CREATE INDEX idx_downloads_custom_page_id ON public.downloads(custom_page_id);

-- Comments
COMMENT ON COLUMN public.downloads.submenu_id IS 'Secondary category reference to a dynamic submenu';
COMMENT ON COLUMN public.downloads.custom_page_id IS 'Secondary category reference to a dynamic page';
