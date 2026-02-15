-- Adicionar colunas para suporte a rotas de sistema
ALTER TABLE custom_pages ADD COLUMN IF NOT EXISTS system_path TEXT;
ALTER TABLE custom_pages ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Limpar dados de teste (opcional, mas recomendado para evitar duplicidade se rodar de novo)
-- DELETE FROM custom_submenus WHERE parent_page_id IN (SELECT id FROM custom_pages WHERE is_system = true);
-- DELETE FROM custom_pages WHERE is_system = true;

-- Inserir Páginas de Sistema
INSERT INTO custom_pages (title, slug, content, status, is_pinned_header, display_order, is_system, system_path)
VALUES 
('Início', 'inicio', '', 'published', true, 10, true, '/'),
('Plugins', 'plugins', '', 'published', true, 20, true, '/categoria/plugins'),
('Skins', 'skins', '', 'published', true, 30, true, '/skins'),
('Mods', 'mods', '', 'published', true, 40, true, '/categoria/mods'),
('Downloads', 'downloads', '', 'published', true, 50, true, '/downloads'),
('Área VIP', 'vip', '', 'published', true, 60, true, '/vip')
ON CONFLICT (slug) DO UPDATE 
SET system_path = EXCLUDED.system_path, is_system = EXCLUDED.is_system;

-- Inserir Submenus de Skins (Vinculando à página 'Skins')
DO $$
DECLARE
    skins_id UUID;
BEGIN
    SELECT id INTO skins_id FROM custom_pages WHERE slug = 'skins' LIMIT 1;

    IF skins_id IS NOT NULL THEN
        INSERT INTO custom_submenus (parent_page_id, name, slug, display_order)
        VALUES 
        (skins_id, 'Skins de Armas', 'skins-armas', 10),
        (skins_id, 'Skins de Facas', 'skins-facas', 20),
        (skins_id, 'Skins de Player', 'skins-player', 30),
        (skins_id, 'Skins de Zombies', 'skins-zombies', 40)
        ON CONFLICT (parent_page_id, slug) DO NOTHING;
    END IF;
END $$;
