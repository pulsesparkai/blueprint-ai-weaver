-- Create blueprint_templates table to replace hardcoded templates
ALTER TABLE public.blueprint_templates 
ADD COLUMN preview_image TEXT,
ADD COLUMN instructions TEXT,
ADD COLUMN parameters JSONB DEFAULT '[]',
ADD COLUMN use_cases TEXT[],
ADD COLUMN estimated_time TEXT DEFAULT '15 min';

-- Update existing templates with parameters and instructions
UPDATE public.blueprint_templates 
SET 
  instructions = 'This template creates a customer support bot that takes user queries, retrieves relevant documentation, builds context, and generates helpful responses.',
  parameters = '[
    {"name": "supportModel", "type": "select", "label": "LLM Model", "defaultValue": "gpt-4o-mini", "options": ["gpt-4o-mini", "gpt-4o", "claude-3.5-sonnet"], "description": "Choose the LLM model for generating responses"},
    {"name": "temperature", "type": "number", "label": "Response Creativity", "defaultValue": 0.3, "description": "Lower values for more consistent responses (0.0-1.0)"},
    {"name": "maxTokens", "type": "number", "label": "Max Response Length", "defaultValue": 500, "description": "Maximum tokens in the response"},
    {"name": "vectorStore", "type": "select", "label": "Knowledge Base", "defaultValue": "pinecone", "options": ["pinecone", "weaviate", "qdrant"], "description": "Vector database for storing support documentation"}
  ]',
  use_cases = '{"Customer support automation", "FAQ chatbots", "Help desk systems", "Technical support", "Product inquiries"}',
  estimated_time = '15 min'
WHERE name = 'Customer Support Bot';

-- Create integration_types table for available integrations
CREATE TABLE public.integration_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  tier TEXT DEFAULT 'free',
  is_oauth BOOLEAN DEFAULT false,
  config_fields JSONB DEFAULT '[]',
  credential_fields JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on integration_types
ALTER TABLE public.integration_types ENABLE ROW LEVEL SECURITY;

-- Create policy for integration_types (read-only for all authenticated users)
CREATE POLICY "Integration types are viewable by authenticated users" 
ON public.integration_types 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Insert initial integration types
INSERT INTO public.integration_types (id, name, description, icon, category, tier, is_oauth, config_fields, credential_fields) VALUES
('pinecone', 'Pinecone', 'Managed vector database service', '🌲', 'vector-db', 'free', false, 
 '[{"key": "indexName", "label": "Index Name", "type": "text", "placeholder": "my-index"}, {"key": "environment", "label": "Environment", "type": "select", "options": ["us-west1-gcp", "us-east1-gcp", "eu-west1-gcp"]}]',
 '[{"key": "apiKey", "label": "API Key", "type": "password", "placeholder": "Your Pinecone API key"}]'),
('notion', 'Notion', 'Pages and databases as knowledge bases', '🔲', 'knowledge', 'pro', true,
 '[{"key": "dataTypes", "label": "Data Types", "type": "multi-select", "options": ["pages", "databases"], "defaultValue": ["pages"]}]',
 '[]'),
('zapier', 'Zapier', 'Webhook triggers and automations', '⚡', 'automation', 'enterprise', false,
 '[{"key": "triggerEvents", "label": "Trigger Events", "type": "multi-select", "options": ["blueprint_saved", "simulation_completed", "optimization_applied"], "defaultValue": ["blueprint_saved"]}]',
 '[{"key": "webhookUrl", "label": "Webhook URL", "type": "text", "placeholder": "https://hooks.zapier.com/hooks/catch/..."}]');

-- Create real-time functionality for templates
ALTER TABLE public.blueprint_templates REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blueprint_templates;

-- Create real-time functionality for integration types
ALTER TABLE public.integration_types REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_types;