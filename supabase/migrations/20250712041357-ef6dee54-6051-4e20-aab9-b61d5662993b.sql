-- Create optimized blueprints table for storing optimization results
CREATE TABLE public.optimized_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  optimized_nodes JSONB NOT NULL DEFAULT '[]',
  optimized_edges JSONB NOT NULL DEFAULT '[]',
  optimization_metrics JSONB NOT NULL DEFAULT '{}',
  optimization_strategies JSONB NOT NULL DEFAULT '[]',
  token_savings_percent DECIMAL(5, 2) DEFAULT 0,
  performance_improvement_percent DECIMAL(5, 2) DEFAULT 0,
  optimization_type TEXT DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);

-- Create optimization history table for tracking optimization attempts
CREATE TABLE public.optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  optimization_type TEXT NOT NULL,
  strategies_applied JSONB NOT NULL DEFAULT '[]',
  before_metrics JSONB NOT NULL DEFAULT '{}',
  after_metrics JSONB NOT NULL DEFAULT '{}',
  improvements JSONB NOT NULL DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.optimized_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_history ENABLE ROW LEVEL SECURITY;

-- Optimized blueprints policies
CREATE POLICY "Users can view own optimized blueprints" ON public.optimized_blueprints
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create optimized blueprints" ON public.optimized_blueprints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own optimized blueprints" ON public.optimized_blueprints
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own optimized blueprints" ON public.optimized_blueprints
  FOR DELETE USING (auth.uid() = user_id);

-- Optimization history policies
CREATE POLICY "Users can view own optimization history" ON public.optimization_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create optimization history" ON public.optimization_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_optimized_blueprints_original_id ON public.optimized_blueprints(original_blueprint_id);
CREATE INDEX idx_optimized_blueprints_user_id ON public.optimized_blueprints(user_id);
CREATE INDEX idx_optimized_blueprints_created_at ON public.optimized_blueprints(created_at);
CREATE INDEX idx_optimization_history_blueprint_id ON public.optimization_history(blueprint_id);
CREATE INDEX idx_optimization_history_user_id ON public.optimization_history(user_id);
CREATE INDEX idx_optimization_history_created_at ON public.optimization_history(created_at);

-- Function to apply optimized blueprint to original
CREATE OR REPLACE FUNCTION public.apply_optimization(
  optimization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  optimization_record RECORD;
BEGIN
  -- Get the optimization record
  SELECT * INTO optimization_record 
  FROM public.optimized_blueprints 
  WHERE id = optimization_id 
  AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Optimization not found or access denied';
  END IF;
  
  -- Update the original blueprint with optimized nodes and edges
  UPDATE public.blueprints 
  SET 
    nodes = optimization_record.optimized_nodes,
    edges = optimization_record.optimized_edges,
    updated_at = now()
  WHERE id = optimization_record.original_blueprint_id 
  AND user_id = auth.uid();
  
  -- Mark optimization as applied
  UPDATE public.optimized_blueprints 
  SET applied_at = now() 
  WHERE id = optimization_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;