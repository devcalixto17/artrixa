
-- 1. vip_subscriptions: restrict INSERT to authenticated user inserting own row
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.vip_subscriptions;
CREATE POLICY "Users can insert own subscription"
ON public.vip_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. downloads bucket: enforce folder = uid on upload
DROP POLICY IF EXISTS "Authenticated users can upload download files" ON storage.objects;
CREATE POLICY "Users can upload own download files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'downloads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Remove broad SELECT (listing) on public buckets.
-- Files in public buckets remain accessible via direct URL through the CDN;
-- only listing is removed.
DROP POLICY IF EXISTS "Anyone can view download files" ON storage.objects;
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;

-- 4. Revoke EXECUTE from anon/authenticated on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_award_badges() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_download_badges() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_assign_verified_badge() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
