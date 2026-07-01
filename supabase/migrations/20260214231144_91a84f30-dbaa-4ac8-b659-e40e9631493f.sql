-- Add unique constraint on user_id for upsert to work
ALTER TABLE public.vip_subscriptions ADD CONSTRAINT vip_subscriptions_user_id_key UNIQUE (user_id);