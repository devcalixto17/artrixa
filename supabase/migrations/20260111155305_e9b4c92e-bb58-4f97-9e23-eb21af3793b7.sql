-- =============================================
-- SISTEMA AVANÇADO DE PERMISSÕES POR CARGO
-- =============================================

-- Tabela de cargos customizáveis (além dos enums fixos)
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  display_order INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Lista de permissões disponíveis no sistema
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- ex: 'ban_users', 'mute_users', 'approve_posts'
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- ex: 'moderation', 'content', 'vip'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Relaciona cargos com permissões (tanto app_role quanto custom_roles)
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_type TEXT NOT NULL CHECK (role_type IN ('app_role', 'custom_role')),
  role_name TEXT, -- para app_role (fundador, admin, etc)
  custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  granted_by UUID,
  UNIQUE(role_type, role_name, permission_id),
  UNIQUE(role_type, custom_role_id, permission_id)
);

-- Usuários podem ter cargos customizados
CREATE TABLE public.user_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  custom_role_id UUID REFERENCES public.custom_roles(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID,
  UNIQUE(user_id, custom_role_id)
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies para custom_roles
CREATE POLICY "Custom roles viewable by everyone"
ON public.custom_roles FOR SELECT
USING (true);

CREATE POLICY "Only fundador can manage custom roles"
ON public.custom_roles FOR ALL
USING (has_role(auth.uid(), 'fundador'));

-- RLS Policies para permissions
CREATE POLICY "Permissions viewable by everyone"
ON public.permissions FOR SELECT
USING (true);

CREATE POLICY "Only fundador can manage permissions"
ON public.permissions FOR ALL
USING (has_role(auth.uid(), 'fundador'));

-- RLS Policies para role_permissions
CREATE POLICY "Role permissions viewable by everyone"
ON public.role_permissions FOR SELECT
USING (true);

CREATE POLICY "Only fundador can manage role permissions"
ON public.role_permissions FOR ALL
USING (has_role(auth.uid(), 'fundador'));

-- RLS Policies para user_custom_roles
CREATE POLICY "User custom roles viewable by everyone"
ON public.user_custom_roles FOR SELECT
USING (true);

CREATE POLICY "Only fundador can manage user custom roles"
ON public.user_custom_roles FOR ALL
USING (has_role(auth.uid(), 'fundador'));

-- Inserir permissões padrão do sistema
INSERT INTO public.permissions (name, description, category) VALUES
-- Moderação
('ban_users', 'Banir usuários do site', 'moderation'),
('mute_users', 'Silenciar usuários (impedir comentários)', 'moderation'),
('kick_users', 'Expulsar usuários temporariamente', 'moderation'),
('warn_users', 'Enviar avisos para usuários', 'moderation'),
-- Conteúdo
('approve_posts', 'Aprovar publicações pendentes', 'content'),
('reject_posts', 'Rejeitar publicações pendentes', 'content'),
('edit_any_post', 'Editar qualquer publicação', 'content'),
('delete_any_post', 'Excluir qualquer publicação', 'content'),
('publish_instant', 'Publicar sem aprovação', 'content'),
-- VIP
('access_vip_area', 'Acessar área VIP', 'vip'),
('create_vip_posts', 'Criar posts na área VIP', 'vip'),
-- Usuários
('manage_badges', 'Gerenciar insígnias de usuários', 'users'),
('manage_roles', 'Atribuir/remover cargos de usuários', 'users'),
('send_private_messages', 'Enviar mensagens privadas', 'users'),
-- Administração
('manage_categories', 'Gerenciar categorias do site', 'admin'),
('manage_permissions', 'Configurar permissões de cargos', 'admin'),
('manage_custom_roles', 'Criar e editar cargos personalizados', 'admin'),
('view_admin_panel', 'Acessar painel administrativo', 'admin');

-- Atribuir TODAS as permissões ao cargo 'fundador' por padrão
INSERT INTO public.role_permissions (role_type, role_name, permission_id, granted_by)
SELECT 'app_role', 'fundador', id, NULL FROM public.permissions;

-- Atribuir permissões ao cargo 'admin'
INSERT INTO public.role_permissions (role_type, role_name, permission_id, granted_by)
SELECT 'app_role', 'admin', id, NULL FROM public.permissions 
WHERE name IN ('approve_posts', 'reject_posts', 'edit_any_post', 'delete_any_post', 
               'warn_users', 'view_admin_panel', 'manage_badges');

-- Atribuir permissões ao cargo 'staff'
INSERT INTO public.role_permissions (role_type, role_name, permission_id, granted_by)
SELECT 'app_role', 'staff', id, NULL FROM public.permissions 
WHERE name IN ('approve_posts', 'reject_posts', 'create_vip_posts', 'access_vip_area');

-- Atribuir permissões ao cargo 'vip_diamante'
INSERT INTO public.role_permissions (role_type, role_name, permission_id, granted_by)
SELECT 'app_role', 'vip_diamante', id, NULL FROM public.permissions 
WHERE name IN ('access_vip_area', 'publish_instant');

-- Função para verificar se usuário tem permissão
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _permission_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica permissões via app_role
  IF EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_type = 'app_role' AND rp.role_name = ur.role::text
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.name = _permission_name
  ) THEN
    RETURN true;
  END IF;
  
  -- Verifica permissões via custom_role
  IF EXISTS (
    SELECT 1
    FROM user_custom_roles ucr
    JOIN role_permissions rp ON rp.role_type = 'custom_role' AND rp.custom_role_id = ucr.custom_role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ucr.user_id = _user_id AND p.name = _permission_name
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;