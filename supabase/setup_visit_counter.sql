
-- 1. Criar a tabela para armazenar as estatísticas
CREATE TABLE IF NOT EXISTS public.site_stats (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    value BIGINT DEFAULT 0
);

-- 2. Inserir o contador inicial de visitas (com o valor que você pediu)
INSERT INTO public.site_stats (name, value)
VALUES ('visits', 293775)
ON CONFLICT (name) DO NOTHING;

-- 3. Criar a função (RPC) para incrementar as visitas de forma segura
-- Essa função garante que mesmo com muitos acessos simultâneos, o contador não erre.
CREATE OR REPLACE FUNCTION public.increment_site_visits()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_value BIGINT;
BEGIN
    INSERT INTO public.site_stats (name, value)
    VALUES ('visits', 1)
    ON CONFLICT (name) DO UPDATE
    SET value = site_stats.value + 1
    RETURNING value INTO new_value;
    
    RETURN new_value;
END;
$$;

-- 4. Habilitar o Row Level Security (RLS) por segurança
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;

-- 5. Criar política para permitir que qualquer pessoa veja o contador
-- (Necessário para o contador aparecer no rodapé)
DROP POLICY IF EXISTS "Allow public read-only access to site_stats" ON public.site_stats;
CREATE POLICY "Allow public read-only access to site_stats"
ON public.site_stats FOR SELECT
USING (true);
