-- Allow Fundador to approve (UPDATE) and reject (DELETE) any download

-- Replace UPDATE policy
DROP POLICY IF EXISTS "Authors and admins can update downloads" ON public.downloads;
CREATE POLICY "Authors, admins and fundador can update downloads"
ON public.downloads
FOR UPDATE
USING (
  (auth.uid() = author_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'fundador'::app_role)
)
WITH CHECK (
  (auth.uid() = author_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'fundador'::app_role)
);

-- Replace DELETE policy
DROP POLICY IF EXISTS "Authors and admins can delete downloads" ON public.downloads;
CREATE POLICY "Authors, admins and fundador can delete downloads"
ON public.downloads
FOR DELETE
USING (
  (auth.uid() = author_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'fundador'::app_role)
);
