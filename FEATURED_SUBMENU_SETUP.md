# Configuração de Submenus em Destaque (ZOMBIE/CLASSIC)

## Resumo das Alterações

Este documento descreve como configurar os submenus em destaque (ZOMBIE, CLASSIC e GLOBAL) para organizar melhor as publicações de plugins.

### O que foi implementado:

1. **Campo `featured_submenu_id`** na tabela `downloads`
   - Tipo: UUID com referência para `custom_submenus`
   - Permite vincular uma publicação a uma página em destaque (ZOMBIE, CLASSIC ou GLOBAL)

2. **Formulários atualizados** (CreateDownload.tsx e EditDownload.tsx)
   - Novo campo "Página em Destaque (Opcional)"
   - Dropdown com opções: ZOMBIE, CLASSIC ou GLOBAL
   - Campo é opcional - publicações sem seleção aparecem em todo o site

3. **Rich Text Editor para Comandos**
   - Seção de comandos agora usa RichTextEditor (como a descrição)
   - Usuários podem formatar com cores, fontes, tamanhos e estilos diferentes
   - Comandos ainda são armazenados como HTML

4. **Lógica de filtragem** (CustomPage.tsx)
   - ZOMBIE, CLASSIC e GLOBAL agora filtram apenas suas publicações designadas
   - Outras páginas continuam mostrando todas as publicações

## Passo 1: Executar a Migração SQL

Você precisa executar o SQL abaixo no Supabase Dashboard ou CLI:

### Opção A: Supabase Dashboard
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Crie uma nova query
5. Cole o SQL abaixo:

```sql
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

-- Create GLOBAL submenu under Plugins page
INSERT INTO custom_submenus (name, slug, parent_page_id, display_order, created_at)
SELECT 
  'GLOBAL',
  'global',
  cp.id,
  2,
  NOW()
FROM custom_pages cp
WHERE cp.slug = 'plugins'
AND NOT EXISTS (
  SELECT 1 FROM custom_submenus cs 
  WHERE cs.slug = 'global' AND cs.parent_page_id = cp.id
);
```

### Opção B: Supabase CLI (local)
Se você estiver usando Supabase CLI:

```bash
# Estando na raiz do projeto
supabase migration new add_featured_submenu

# Copiar o conteúdo do arquivo supabase/migrations/20260701_zombie_classic_submenus.sql para o arquivo criado

# Executar as migrações
supabase migration up
```

## Passo 2: Verificar a Configuração

Após executar a migração, verifique se:

1. A coluna `featured_submenu_id` foi adicionada à tabela `downloads`
2. A página "Plugins" foi criada (slug: `plugins`)
3. Os submenus "ZOMBIE", "CLASSIC" e "GLOBAL" foram criados

### Query para verificar:

```sql
-- Verificar coluna
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'downloads' AND column_name = 'featured_submenu_id';

-- Verificar página Plugins
SELECT * FROM custom_pages WHERE slug = 'plugins';

-- Verificar submenus
SELECT * FROM custom_submenus WHERE slug IN ('zombie', 'classic', 'global');
```

## Passo 3: Usar a Nova Funcionalidade

Após a migração estar completa:

1. **Criar novo download/publicação**:
   - Vá em "Criar Nova Publicação"
   - Preencha os campos normalmente
   - **Novo**: Use o Rich Text Editor para formatar os **Comandos** (cores, fonts, tamanhos)
   - No campo "Página em Destaque (Opcional)", selecione ZOMBIE, CLASSIC ou GLOBAL
   - Clique em "Publicar"

2. **Editar publicação existente**:
   - Vá na publicação
   - Clique em "Editar"
   - Modifique os comandos com formatação se necessário
   - Modifique o campo "Página em Destaque" se necessário
   - Clique em "Atualizar"

3. **Ver publicações por página de destaque**:
   - Páginas ZOMBIE, CLASSIC e GLOBAL agora mostram apenas suas publicações designadas
   - Publicações ainda aparecem em:
     - Listagem geral de downloads
     - Suas categorias/submenus originais
     - Perfil do usuário

## Notas Importantes

- **Campo Opcional**: Os usuários NÃO precisam selecionar uma página em destaque
- **Não exclui de outros lugares**: Se uma publicação é marcada como ZOMBIE, CLASSIC ou GLOBAL, ela ainda aparece em todas as outras páginas
- **Apenas filtra em destaque**: As páginas ZOMBIE, CLASSIC e GLOBAL APENAS mostram publicações com seus IDs designados
- **Rich Text para Comandos**: Comandos agora suportam formatação como descrições - use cores, fonts e tamanhos!

## Troubleshooting

### "Página em Destaque" não aparece no formulário
- Verifique se a migração foi executada com sucesso
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Recarregue a página

### Publicações não aparecem em ZOMBIE/CLASSIC
- Verifique se o `featured_submenu_id` está preenchido para a publicação
- Confirme que os submenus ZOMBIE e CLASSIC foram criados com os slugs corretos

### Erro ao criar publicação
- Verifique se a coluna `featured_submenu_id` foi adicionada à tabela downloads
- Verifique se a permissão de INSERT em custom_submenus está habilitada
