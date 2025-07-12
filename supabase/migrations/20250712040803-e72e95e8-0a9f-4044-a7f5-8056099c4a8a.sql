-- Create blueprint sessions table for caching active sessions
CREATE TABLE public.blueprint_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  session_data JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, blueprint_id)
);

-- Create execution logs table for storing graph execution history
CREATE TABLE public.execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  input_data JSONB NOT NULL DEFAULT '{}',
  execution_results JSONB NOT NULL DEFAULT '[]',
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blueprint_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

-- Blueprint sessions policies
CREATE POLICY "Users can view own sessions" ON public.blueprint_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON public.blueprint_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.blueprint_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.blueprint_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Execution logs policies
CREATE POLICY "Users can view own execution logs" ON public.execution_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create execution logs" ON public.execution_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_blueprint_sessions_updated_at
  BEFORE UPDATE ON public.blueprint_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_blueprint_sessions_user_id ON public.blueprint_sessions(user_id);
CREATE INDEX idx_blueprint_sessions_expires_at ON public.blueprint_sessions(expires_at);
CREATE INDEX idx_execution_logs_blueprint_id ON public.execution_logs(blueprint_id);
CREATE INDEX idx_execution_logs_user_id ON public.execution_logs(user_id);
CREATE INDEX idx_execution_logs_executed_at ON public.execution_logs(executed_at);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.blueprint_sessions 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;