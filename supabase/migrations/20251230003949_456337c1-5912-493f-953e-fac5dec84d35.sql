-- Create downloads storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('downloads', 'downloads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for downloads bucket
CREATE POLICY "Anyone can view download files"
ON storage.objects FOR SELECT
USING (bucket_id = 'downloads');

CREATE POLICY "Authenticated users can upload download files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'downloads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own download files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'downloads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own download files"
ON storage.objects FOR DELETE
USING (bucket_id = 'downloads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create download tracking table (counts per user)
CREATE TABLE public.download_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  download_id UUID NOT NULL REFERENCES public.downloads(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, download_id)
);

-- Enable RLS
ALTER TABLE public.download_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for download_tracking
CREATE POLICY "Users can view their own download history"
ON public.download_tracking FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert tracking"
ON public.download_tracking FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);