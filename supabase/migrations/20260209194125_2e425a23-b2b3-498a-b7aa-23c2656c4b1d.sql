-- Add support-related permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('respond_support', 'Responder tickets de suporte', 'support'),
  ('view_support_tickets', 'Visualizar tickets de suporte', 'support'),
  ('close_support_tickets', 'Encerrar tickets de suporte', 'support');

-- Grant all support permissions to fundador, admin, staff by default
INSERT INTO public.role_permissions (role_type, role_name, permission_id)
SELECT 'app_role', 'fundador', id FROM public.permissions WHERE category = 'support';

INSERT INTO public.role_permissions (role_type, role_name, permission_id)
SELECT 'app_role', 'admin', id FROM public.permissions WHERE category = 'support';

INSERT INTO public.role_permissions (role_type, role_name, permission_id)
SELECT 'app_role', 'staff', id FROM public.permissions WHERE category = 'support';
