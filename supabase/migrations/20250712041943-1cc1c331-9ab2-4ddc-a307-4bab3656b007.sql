-- Create storage bucket for exported files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exported-blueprints', 'exported-blueprints', true);

-- Create policies for exported files bucket
CREATE POLICY "Users can upload their exported files"
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'exported-blueprints' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their exported files"
ON storage.objects FOR SELECT 
USING (bucket_id = 'exported-blueprints' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view exported files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'exported-blueprints');

CREATE POLICY "Users can delete their exported files"
ON storage.objects FOR DELETE 
USING (bucket_id = 'exported-blueprints' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create export logs table for tracking exports
CREATE TABLE public.export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_format TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  download_url TEXT,
  export_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for export logs
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

-- Export logs policies
CREATE POLICY "Users can view own export logs" ON public.export_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create export logs" ON public.export_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_export_logs_user_id ON public.export_logs(user_id);
CREATE INDEX idx_export_logs_blueprint_id ON public.export_logs(blueprint_id);
CREATE INDEX idx_export_logs_created_at ON public.export_logs(created_at);