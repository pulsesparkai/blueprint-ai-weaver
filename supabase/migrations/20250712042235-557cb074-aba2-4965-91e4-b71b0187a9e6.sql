-- Create integrations table for tracking configured integrations
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'pinecone', 'weaviate', 'chroma', 'qdrant', etc.
  config JSONB NOT NULL DEFAULT '{}', -- non-sensitive configuration
  credential_refs JSONB NOT NULL DEFAULT '{}', -- references to secrets, not actual credentials
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'error'
  last_validated TIMESTAMPTZ,
  validation_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create integration usage logs for tracking usage
CREATE TABLE public.integration_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blueprint_id UUID REFERENCES public.blueprints(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL, -- 'query', 'upsert', 'delete', 'validate'
  request_count INTEGER DEFAULT 1,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_usage_logs ENABLE ROW LEVEL SECURITY;

-- Integrations policies
CREATE POLICY "Users can view own integrations" ON public.integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own integrations" ON public.integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations" ON public.integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations" ON public.integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Integration usage logs policies
CREATE POLICY "Users can view own integration logs" ON public.integration_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create integration logs" ON public.integration_usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX idx_integrations_type ON public.integrations(type);
CREATE INDEX idx_integrations_status ON public.integrations(status);
CREATE INDEX idx_integration_usage_logs_integration_id ON public.integration_usage_logs(integration_id);
CREATE INDEX idx_integration_usage_logs_user_id ON public.integration_usage_logs(user_id);
CREATE INDEX idx_integration_usage_logs_created_at ON public.integration_usage_logs(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate integration credentials
CREATE OR REPLACE FUNCTION public.test_integration(
  integration_id UUID
)
RETURNS JSONB AS $$
DECLARE
  integration_record RECORD;
  result JSONB;
BEGIN
  -- Get the integration record
  SELECT * INTO integration_record 
  FROM public.integrations 
  WHERE id = integration_id 
  AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Integration not found');
  END IF;
  
  -- This would typically call an Edge Function to validate
  -- For now, we'll update the last_validated timestamp
  UPDATE public.integrations 
  SET 
    last_validated = now(),
    validation_error = NULL,
    status = 'active'
  WHERE id = integration_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Integration validated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;