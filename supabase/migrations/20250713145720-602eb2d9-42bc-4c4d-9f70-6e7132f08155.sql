-- Database Performance Optimization Indexes
-- Add indexes for common query patterns

-- Blueprints table indexes
CREATE INDEX IF NOT EXISTS idx_blueprints_user_id ON public.blueprints(user_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_team_id ON public.blueprints(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blueprints_created_at ON public.blueprints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blueprints_updated_at ON public.blueprints(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_blueprints_public ON public.blueprints(is_public) WHERE is_public = true;

-- Simulation logs indexes for performance monitoring
CREATE INDEX IF NOT EXISTS idx_simulation_logs_user_id ON public.simulation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_logs_blueprint_id ON public.simulation_logs(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_simulation_logs_started_at ON public.simulation_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_simulation_logs_status ON public.simulation_logs(status);

-- Execution logs indexes
CREATE INDEX IF NOT EXISTS idx_execution_logs_user_id ON public.execution_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_blueprint_id ON public.execution_logs(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_executed_at ON public.execution_logs(executed_at DESC);

-- Integration usage logs indexes
CREATE INDEX IF NOT EXISTS idx_integration_usage_logs_user_id ON public.integration_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_usage_logs_integration_id ON public.integration_usage_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_usage_logs_created_at ON public.integration_usage_logs(created_at DESC);

-- Team collaboration indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON public.team_members(status) WHERE status = 'active';

-- Blueprint versions indexes
CREATE INDEX IF NOT EXISTS idx_blueprint_versions_blueprint_id ON public.blueprint_versions(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_versions_created_at ON public.blueprint_versions(created_at DESC);

-- Collaboration sessions indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_blueprint_id ON public.collaboration_sessions(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_last_seen ON public.collaboration_sessions(last_seen DESC);

-- Security and monitoring indexes
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON public.security_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON public.security_logs(severity);

-- Rate limiting indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON public.rate_limits(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_address ON public.rate_limits(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON public.rate_limits(window_end);

-- Data retention policies
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up old simulation logs (older than 6 months)
  DELETE FROM public.simulation_logs 
  WHERE started_at < now() - INTERVAL '6 months';
  
  -- Clean up old execution logs (older than 3 months)
  DELETE FROM public.execution_logs 
  WHERE executed_at < now() - INTERVAL '3 months';
  
  -- Clean up old security logs (older than 90 days)
  DELETE FROM public.security_logs 
  WHERE created_at < now() - INTERVAL '90 days';
  
  -- Clean up old rate limit records (older than 7 days)
  DELETE FROM public.rate_limits 
  WHERE window_end < now() - INTERVAL '7 days';
  
  -- Clean up expired sessions
  DELETE FROM public.blueprint_sessions 
  WHERE expires_at < now();
  
  -- Clean up expired shares
  DELETE FROM public.blueprint_shares 
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  -- Clean up expired credentials
  DELETE FROM public.integration_credentials 
  WHERE expires_at < now();
END;
$$;

-- Create function for GDPR data export
CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data jsonb;
BEGIN
  -- Only allow users to export their own data
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT jsonb_build_object(
    'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = p_user_id),
    'blueprints', (SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]') FROM public.blueprints b WHERE b.user_id = p_user_id),
    'integrations', (SELECT COALESCE(jsonb_agg(to_jsonb(i)), '[]') FROM public.integrations i WHERE i.user_id = p_user_id),
    'execution_logs', (SELECT COALESCE(jsonb_agg(to_jsonb(el)), '[]') FROM public.execution_logs el WHERE el.user_id = p_user_id),
    'simulation_logs', (SELECT COALESCE(jsonb_agg(to_jsonb(sl)), '[]') FROM public.simulation_logs sl WHERE sl.user_id = p_user_id),
    'export_timestamp', now()
  ) INTO user_data;
  
  -- Log the data export request
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    metadata
  ) VALUES (
    p_user_id,
    'access',
    'data_export',
    jsonb_build_object('exported_at', now())
  );
  
  RETURN user_data;
END;
$$;

-- Create function for GDPR data deletion
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to delete their own data
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Log the deletion request
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    metadata
  ) VALUES (
    p_user_id,
    'delete',
    'user_data',
    jsonb_build_object('deleted_at', now())
  );
  
  -- Delete user data in correct order (respecting foreign keys)
  DELETE FROM public.simulation_metrics WHERE simulation_id IN (
    SELECT id FROM public.simulation_logs WHERE user_id = p_user_id
  );
  DELETE FROM public.simulation_logs WHERE user_id = p_user_id;
  DELETE FROM public.execution_logs WHERE user_id = p_user_id;
  DELETE FROM public.integration_usage_logs WHERE user_id = p_user_id;
  DELETE FROM public.optimization_history WHERE user_id = p_user_id;
  DELETE FROM public.optimized_blueprints WHERE user_id = p_user_id;
  DELETE FROM public.rag_analyses WHERE user_id = p_user_id;
  DELETE FROM public.export_logs WHERE user_id = p_user_id;
  DELETE FROM public.node_comments WHERE user_id = p_user_id;
  DELETE FROM public.collaboration_sessions WHERE user_id = p_user_id;
  DELETE FROM public.blueprint_versions WHERE created_by = p_user_id;
  DELETE FROM public.blueprint_shares WHERE created_by = p_user_id;
  DELETE FROM public.blueprint_sessions WHERE user_id = p_user_id;
  DELETE FROM public.blueprints WHERE user_id = p_user_id;
  DELETE FROM public.integrations WHERE user_id = p_user_id;
  DELETE FROM public.integration_credentials WHERE user_id = p_user_id;
  DELETE FROM public.encrypted_credentials WHERE user_id = p_user_id;
  DELETE FROM public.api_keys WHERE user_id = p_user_id;
  DELETE FROM public.two_factor_backup_codes WHERE user_id = p_user_id;
  DELETE FROM public.user_sessions WHERE user_id = p_user_id;
  DELETE FROM public.team_members WHERE user_id = p_user_id;
  DELETE FROM public.teams WHERE owner_id = p_user_id;
  DELETE FROM public.workspaces WHERE owner_id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
  
  RETURN true;
END;
$$;