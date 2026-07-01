-- Criar tabela para assinaturas VIP
CREATE TABLE public.vip_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mercadopago_subscription_id text,
  mercadopago_payer_id text,
  status text NOT NULL DEFAULT 'pending',
  plan_name text NOT NULL DEFAULT 'VIP DIAMANTE',
  price_cents integer NOT NULL DEFAULT 1990,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vip_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscriptions"
  ON public.vip_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only fundador can manage all subscriptions"
  ON public.vip_subscriptions FOR ALL
  USING (has_role(auth.uid(), 'fundador'::app_role));

CREATE POLICY "System can insert subscriptions"
  ON public.vip_subscriptions FOR INSERT
  WITH CHECK (true);

-- Criar tabela para posts exclusivos VIP
CREATE TABLE public.vip_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vip_posts ENABLE ROW LEVEL SECURITY;

-- RLS: Apenas VIPs e fundador podem ver posts VIP
CREATE POLICY "VIP posts viewable by VIPs and fundador"
  ON public.vip_posts FOR SELECT
  USING (
    has_role(auth.uid(), 'vip_diamante'::app_role) OR
    has_role(auth.uid(), 'fundador'::app_role)
  );

-- RLS: Apenas fundador pode criar/editar/deletar posts VIP
CREATE POLICY "Only fundador can manage VIP posts"
  ON public.vip_posts FOR ALL
  USING (has_role(auth.uid(), 'fundador'::app_role));

-- Criar índices
CREATE INDEX idx_vip_subscriptions_user_id ON public.vip_subscriptions(user_id);
CREATE INDEX idx_vip_subscriptions_status ON public.vip_subscriptions(status);
CREATE INDEX idx_vip_posts_created_at ON public.vip_posts(created_at DESC);

-- Criar insígnia VIP DIAMANTE
INSERT INTO public.badges (name, description, icon, color, is_automatic)
VALUES ('VIP Diamante', 'Membro VIP exclusivo do site', '💎', '#00D9FF', false)
ON CONFLICT DO NOTHING;