-- Create simulation logs table for storing simulation history
CREATE TABLE public.simulation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  input_query TEXT NOT NULL,
  llm_provider TEXT NOT NULL,
  pipeline_config JSONB NOT NULL DEFAULT '{}',
  execution_steps JSONB NOT NULL DEFAULT '[]',
  final_output TEXT,
  metrics JSONB NOT NULL DEFAULT '{}',
  context_window JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER
);

-- Create simulation metrics table for tracking token usage and costs
CREATE TABLE public.simulation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES public.simulation_logs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  model_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simulation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_metrics ENABLE ROW LEVEL SECURITY;

-- Simulation logs policies
CREATE POLICY "Users can view own simulation logs" ON public.simulation_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create simulation logs" ON public.simulation_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulation logs" ON public.simulation_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Simulation metrics policies
CREATE POLICY "Users can view own simulation metrics" ON public.simulation_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.simulation_logs 
      WHERE id = simulation_metrics.simulation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create simulation metrics" ON public.simulation_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.simulation_logs 
      WHERE id = simulation_metrics.simulation_id 
      AND user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_simulation_logs_user_id ON public.simulation_logs(user_id);
CREATE INDEX idx_simulation_logs_blueprint_id ON public.simulation_logs(blueprint_id);
CREATE INDEX idx_simulation_logs_session_id ON public.simulation_logs(session_id);
CREATE INDEX idx_simulation_logs_started_at ON public.simulation_logs(started_at);
CREATE INDEX idx_simulation_metrics_simulation_id ON public.simulation_metrics(simulation_id);
CREATE INDEX idx_simulation_metrics_created_at ON public.simulation_metrics(created_at);

-- Function to calculate simulation duration and update completion
CREATE OR REPLACE FUNCTION public.complete_simulation(
  sim_id UUID,
  final_result TEXT DEFAULT NULL,
  error_msg TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.simulation_logs 
  SET 
    completed_at = now(),
    execution_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000,
    final_output = COALESCE(final_result, final_output),
    error_message = error_msg,
    status = CASE 
      WHEN error_msg IS NOT NULL THEN 'error'
      ELSE 'completed'
    END
  WHERE id = sim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;