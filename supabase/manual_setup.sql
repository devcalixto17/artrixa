
-- ==========================================
-- 1. SISTEMA DE CONTADOR DE VISITAS
-- ==========================================

-- Criar a tabela para as estatísticas
CREATE TABLE IF NOT EXISTS public.site_stats (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    value BIGINT DEFAULT 0
);

-- Inserir o contador inicial (ajuste o valor se necessário)
INSERT INTO public.site_stats (name, value)
VALUES ('visits', 0)
ON CONFLICT (name) DO NOTHING;

-- Função para incrementar as visitas de forma segura
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

-- Segurança RLS para as estatísticas
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-only access to site_stats" ON public.site_stats;
CREATE POLICY "Allow public read-only access to site_stats"
ON public.site_stats FOR SELECT
USING (true);


-- ==========================================
-- 2. SISTEMA DE KICK (EXPULSÃO)
-- ==========================================

-- Função para o usuário confirmar que foi kickado (limpa o painel do fundador)
CREATE OR REPLACE FUNCTION public.acknowledge_user_kick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_moderations
    SET is_active = false
    WHERE user_id = auth.uid()
    AND moderation_type = 'kick'
    AND is_active = true;
END;
$$;
