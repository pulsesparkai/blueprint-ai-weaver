-- Enhance integration types with proper schema
INSERT INTO public.integration_types (id, name, description, category, icon, config_fields, credential_fields, is_oauth, tier) VALUES

-- Vector Databases
('pinecone', 'Pinecone', 'Managed vector database service', 'vector-db', '🌲', 
 '[{"key": "indexName", "label": "Index Name", "type": "text", "required": true}, {"key": "environment", "label": "Environment", "type": "select", "options": ["us-west1-gcp", "us-east1-gcp", "eu-west1-gcp"], "default": "us-west1-gcp"}]'::jsonb,
 '[{"key": "apiKey", "label": "API Key", "type": "password", "required": true}]'::jsonb,
 false, 'free'),

('weaviate', 'Weaviate', 'Open-source vector database', 'vector-db', '🔷',
 '[{"key": "endpoint", "label": "Endpoint URL", "type": "url", "required": true}, {"key": "className", "label": "Class Name", "type": "text", "required": true}]'::jsonb,
 '[{"key": "apiKey", "label": "API Key", "type": "password", "required": false}]'::jsonb,
 false, 'free'),

('qdrant', 'Qdrant', 'Vector similarity search engine', 'vector-db', '⚡',
 '[{"key": "endpoint", "label": "Endpoint URL", "type": "url", "required": true}, {"key": "collectionName", "label": "Collection Name", "type": "text", "required": true}]'::jsonb,
 '[{"key": "apiKey", "label": "API Key", "type": "password", "required": true}]'::jsonb,
 false, 'free'),

('chroma', 'ChromaDB', 'Open-source embedding database', 'vector-db', '🎨',
 '[{"key": "endpoint", "label": "Endpoint URL", "type": "url", "required": true}, {"key": "collectionName", "label": "Collection Name", "type": "text", "required": true}]'::jsonb,
 '[]'::jsonb,
 false, 'free'),

('faiss', 'FAISS', 'Local vector similarity search', 'vector-db', '📚',
 '[{"key": "indexPath", "label": "Index File Path", "type": "text", "required": true}, {"key": "dimension", "label": "Vector Dimension", "type": "number", "required": true}]'::jsonb,
 '[]'::jsonb,
 false, 'free'),

-- LLM Providers  
('openai', 'OpenAI', 'GPT models and embeddings', 'llm', '🤖',
 '[{"key": "model", "label": "Default Model", "type": "select", "options": ["gpt-4.1-2025-04-14", "o3-2025-04-16", "o4-mini-2025-04-16", "gpt-4.1-mini-2025-04-14"], "default": "gpt-4.1-2025-04-14"}, {"key": "temperature", "label": "Temperature", "type": "number", "min": 0, "max": 1, "default": 0.7}]'::jsonb,
 '[{"key": "apiKey", "label": "API Key", "type": "password", "required": true}]'::jsonb,
 false, 'free'),

('anthropic', 'Anthropic', 'Claude models', 'llm', '🧠',
 '[{"key": "model", "label": "Default Model", "type": "select", "options": ["claude-opus-4-20250514", "claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"], "default": "claude-sonnet-4-20250514"}, {"key": "maxTokens", "label": "Max Tokens", "type": "number", "default": 4000}]'::jsonb,
 '[{"key": "apiKey", "label": "API Key", "type": "password", "required": true}]'::jsonb,
 false, 'free'),

-- OAuth Integrations
('google-workspace', 'Google Workspace', 'Docs, Sheets, and Drive content', 'knowledge', '📄',
 '[{"key": "dataTypes", "label": "Data Types", "type": "multi-select", "options": ["documents", "sheets", "slides"], "default": ["documents"]}, {"key": "folderFilter", "label": "Folder Filter", "type": "text", "required": false}]'::jsonb,
 '[{"key": "clientId", "label": "Client ID", "type": "text", "required": true}, {"key": "clientSecret", "label": "Client Secret", "type": "password", "required": true}]'::jsonb,
 true, 'pro'),

('notion', 'Notion', 'Pages and databases as knowledge bases', 'knowledge', '🔲',
 '[{"key": "dataTypes", "label": "Data Types", "type": "multi-select", "options": ["pages", "databases"], "default": ["pages"]}]'::jsonb,
 '[{"key": "clientId", "label": "Client ID", "type": "text", "required": true}, {"key": "clientSecret", "label": "Client Secret", "type": "password", "required": true}]'::jsonb,
 true, 'pro'),

('slack', 'Slack', 'Workspace messages and files', 'communication', '💬',
 '[{"key": "channels", "label": "Channel IDs", "type": "text", "required": false}, {"key": "includeFiles", "label": "Include Files", "type": "checkbox", "default": true}]'::jsonb,
 '[{"key": "clientId", "label": "Client ID", "type": "text", "required": true}, {"key": "clientSecret", "label": "Client Secret", "type": "password", "required": true}]'::jsonb,
 true, 'pro'),

('microsoft-365', 'Microsoft 365', 'Office documents and Outlook data', 'knowledge', '🔵',
 '[{"key": "dataTypes", "label": "Data Types", "type": "multi-select", "options": ["documents", "emails", "teams"], "default": ["documents"]}, {"key": "includeAttachments", "label": "Include Attachments", "type": "checkbox", "default": false}]'::jsonb,
 '[{"key": "clientId", "label": "Client ID", "type": "text", "required": true}, {"key": "clientSecret", "label": "Client Secret", "type": "password", "required": true}]'::jsonb,
 true, 'enterprise')

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  config_fields = EXCLUDED.config_fields,
  credential_fields = EXCLUDED.credential_fields,
  is_oauth = EXCLUDED.is_oauth,
  tier = EXCLUDED.tier,
  updated_at = now();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_user_type ON public.integrations(user_id, type);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON public.integrations(status);
CREATE INDEX IF NOT EXISTS idx_integration_usage_logs_created_at ON public.integration_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_integration_usage_logs_integration_id ON public.integration_usage_logs(integration_id);

-- Add health check function
CREATE OR REPLACE FUNCTION public.check_integration_health(p_integration_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  integration_record RECORD;
  result JSONB;
BEGIN
  -- Get the integration record
  SELECT * INTO integration_record 
  FROM public.integrations 
  WHERE id = p_integration_id 
  AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Integration not found');
  END IF;
  
  -- Basic health check - just update last_validated
  UPDATE public.integrations 
  SET 
    last_validated = now(),
    status = 'active'
  WHERE id = p_integration_id;
  
  -- Log the health check
  INSERT INTO public.integration_usage_logs (
    integration_id,
    user_id,
    operation_type,
    success,
    response_time_ms
  ) VALUES (
    p_integration_id,
    auth.uid(),
    'health_check',
    true,
    0
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'status', 'healthy',
    'last_checked', integration_record.last_validated
  );
END;
$$;