
CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  media_urls TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suggestions viewable by everyone" ON public.suggestions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create suggestions" ON public.suggestions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can update own suggestions" ON public.suggestions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own or fundador can delete any" ON public.suggestions FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'fundador'::app_role));

CREATE TABLE public.suggestion_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suggestion_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suggestion comments viewable by everyone" ON public.suggestion_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.suggestion_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Users can delete own comments or fundador" ON public.suggestion_comments FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'fundador'::app_role));
