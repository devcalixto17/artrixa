-- Adicionar suporte para submenus aninhados
ALTER TABLE public.custom_submenus 
ADD COLUMN parent_submenu_id UUID REFERENCES public.custom_submenus(id) ON DELETE CASCADE;

-- Adicionar índice para performance de buscas recursivas
CREATE INDEX IF NOT EXISTS idx_custom_submenus_parent_submenu ON public.custom_submenus(parent_submenu_id);

-- Comentário: A coluna parent_page_id continua sendo útil para agrupar tudo em uma consulta rápida,
-- mas parent_submenu_id define a hierarquia real.
