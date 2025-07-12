-- Create storage bucket for RAG dataset uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('rag-datasets', 'rag-datasets', false);

-- Create policies for dataset uploads
CREATE POLICY "Users can upload their own RAG datasets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'rag-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own RAG datasets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'rag-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own RAG datasets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'rag-datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table for RAG analysis results
CREATE TABLE public.rag_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  blueprint_id UUID,
  dataset_filename TEXT NOT NULL,
  dataset_size INTEGER NOT NULL,
  analysis_results JSONB NOT NULL DEFAULT '{}',
  optimal_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (blueprint_id) REFERENCES public.blueprints(id) ON DELETE CASCADE
);

-- Enable RLS on rag_analyses
ALTER TABLE public.rag_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for rag_analyses
CREATE POLICY "Users can create own RAG analyses" 
ON public.rag_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own RAG analyses" 
ON public.rag_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own RAG analyses" 
ON public.rag_analyses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own RAG analyses" 
ON public.rag_analyses 
FOR DELETE 
USING (auth.uid() = user_id);