-- ==========================================
-- ESTRUTURA PARA PÁGINAS DINÂMICAS E SUBMENUS
-- ==========================================

-- 1. Tabela de Páginas Customizadas
CREATE TABLE IF NOT EXISTS public.custom_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT DEFAULT '', -- Conteúdo da página (Markdown/HTML)
    is_pinned_header BOOLEAN DEFAULT FALSE, -- Fixar no Header
    status TEXT DEFAULT 'draft' CHECK (status IN ('published', 'draft')), -- Status: Publicada ou Rascunho
    display_order INTEGER DEFAULT 0, -- Ordem no Header
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Submenus
CREATE TABLE IF NOT EXISTS public.custom_submenus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_page_id UUID REFERENCES public.custom_pages(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(parent_page_id, slug) -- Slug único dentro da página pai
);

-- 3. Habilitar RLS (Segurança de Linha)
ALTER TABLE public.custom_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_submenus ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso

-- Qualquer pessoa pode ler páginas publicadas
CREATE POLICY "Leitura pública de páginas publicadas" ON public.custom_pages
    FOR SELECT USING (status = 'published');

-- Apenas Fundadores podem gerenciar (CRUD) páginas
CREATE POLICY "Fundadores gerenciam páginas" ON public.custom_pages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'fundador'
        )
    );

-- Qualquer pessoa pode ler submenus de páginas publicadas
CREATE POLICY "Leitura pública de submenus" ON public.custom_submenus
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.custom_pages
            WHERE id = custom_submenus.parent_page_id AND status = 'published'
        )
    );

-- Apenas Fundadores podem gerenciar submenus
CREATE POLICY "Fundadores gerenciam submenus" ON public.custom_submenus
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'fundador'
        )
    );

-- 5. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_custom_pages_slug ON public.custom_pages(slug);
CREATE INDEX IF NOT EXISTS idx_custom_submenus_parent_page_id ON public.custom_submenus(parent_page_id);

-- 6. Exemplos de INSERT (Opcional)
-- INSERT INTO public.custom_pages (title, slug, content, is_pinned_header, status) 
-- VALUES ('Sobre Nós', 'sobre-nos', '# Bem-vindo', true, 'published');
