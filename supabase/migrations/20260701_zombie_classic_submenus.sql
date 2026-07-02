-- Add featured_submenu_id column to downloads table
ALTER TABLE downloads ADD COLUMN featured_submenu_id UUID REFERENCES custom_submenus(id) ON DELETE SET NULL;

-- Create Plugins page if it doesn't exist
INSERT INTO custom_pages (title, slug, content, status, created_at)
SELECT 'Plugins', 'plugins', 'Página de Plugins do servidor', 'published', NOW()
WHERE NOT EXISTS (SELECT 1 FROM custom_pages WHERE slug = 'plugins');

-- Create ZOMBIE submenu under Plugins page
INSERT INTO custom_submenus (name, slug, parent_page_id, display_order, created_at)
SELECT 
  'ZOMBIE',
  'zombie',
  cp.id,
  0,
  NOW()
FROM custom_pages cp
WHERE cp.slug = 'plugins'
AND NOT EXISTS (
  SELECT 1 FROM custom_submenus cs 
  WHERE cs.slug = 'zombie' AND cs.parent_page_id = cp.id
);

-- Create CLASSIC submenu under Plugins page
INSERT INTO custom_submenus (name, slug, parent_page_id, display_order, created_at)
SELECT 
  'CLASSIC',
  'classic',
  cp.id,
  1,
  NOW()
FROM custom_pages cp
WHERE cp.slug = 'plugins'
AND NOT EXISTS (
  SELECT 1 FROM custom_submenus cs 
  WHERE cs.slug = 'classic' AND cs.parent_page_id = cp.id
);
