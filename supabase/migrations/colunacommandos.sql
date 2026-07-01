-- Adiciona a coluna de comandos (texto, opcional) na tabela downloads
ALTER TABLE public.downloads
  ADD COLUMN IF NOT EXISTS commands text;

-- Força o PostgREST a recarregar o cache do schema imediatamente
NOTIFY pgrst, 'reload schema';
