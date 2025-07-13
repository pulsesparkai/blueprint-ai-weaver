-- ============================================================
-- PHASE 1-4: COMPLETE AUTHENTICATION & TEAM COLLABORATION SYSTEM
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create enums for roles and subscription tiers
CREATE TYPE public.team_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE public.subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid');
CREATE TYPE public.audit_action AS ENUM ('create', 'update', 'delete', 'invite', 'remove', 'login', 'logout', 'access');

-- ============================================================
-- PHASE 1: FOUNDATION & USER MANAGEMENT
-- ============================================================

-- Enhanced profiles table with onboarding flow
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company TEXT,
  job_title TEXT,
  timezone TEXT DEFAULT 'UTC',
  is_onboarded BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_status subscription_status DEFAULT 'active',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces table (default workspace for each user)
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_personal BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PHASE 2: TEAM COLLABORATION
-- ============================================================

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_status subscription_status DEFAULT 'active',
  stripe_customer_id TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive')),
  UNIQUE(team_id, user_id)
);

-- Team invitations table
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64url'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, email)
);

-- Update blueprints table to include team context
ALTER TABLE public.blueprints 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"view": "team", "edit": "admin", "delete": "owner"}';

-- ============================================================
-- PHASE 3: BILLING & SUBSCRIPTIONS
-- ============================================================

-- Subscriptions table for detailed billing tracking
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  tier subscription_tier NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL))
);

-- Usage tracking table for API calls and billing
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'api_call', 'execution', 'storage'
  resource_id UUID, -- blueprint_id, simulation_id, etc.
  quantity INTEGER DEFAULT 1,
  cost_cents INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing limits and quotas
CREATE TABLE public.billing_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE NOT NULL,
  resource_type TEXT NOT NULL,
  quota_limit INTEGER NOT NULL,
  quota_used INTEGER DEFAULT 0,
  reset_period TEXT DEFAULT 'monthly' CHECK (reset_period IN ('daily', 'weekly', 'monthly', 'yearly')),
  last_reset TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscription_id, resource_type)
);

-- ============================================================
-- PHASE 4: SECURITY & ADMINISTRATION
-- ============================================================

-- API keys table for programmatic access
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions JSONB DEFAULT '[]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session management table
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs for security and compliance
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  resource_type TEXT, -- 'blueprint', 'team', 'user', etc.
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Two-factor authentication backup codes
CREATE TABLE public.two_factor_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(subscription_tier, subscription_status);

-- Team indexes
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON public.team_members(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(invitation_token);

-- Blueprint indexes
CREATE INDEX IF NOT EXISTS idx_blueprints_team ON public.blueprints(team_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_workspace ON public.blueprints(workspace_id);

-- Usage and billing indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_team_date ON public.usage_logs(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);

-- Security indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON public.audit_logs(user_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_backup_codes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- Workspaces policies
CREATE POLICY "Users can view own workspaces" ON public.workspaces FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can manage own workspaces" ON public.workspaces FOR ALL USING (auth.uid() = owner_id);

-- Teams policies
CREATE POLICY "Users can view their teams" ON public.teams FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
);
CREATE POLICY "Team owners can manage teams" ON public.teams FOR ALL USING (auth.uid() = owner_id);

-- Team members policies
CREATE POLICY "Users can view team members of their teams" ON public.team_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid())
);
CREATE POLICY "Team admins can manage members" ON public.team_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  )
);

-- Team invitations policies
CREATE POLICY "Users can view invitations for their teams" ON public.team_invitations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_invitations.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  )
);
CREATE POLICY "Team admins can manage invitations" ON public.team_invitations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = team_invitations.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  )
);

-- Blueprints policies (update existing)
DROP POLICY IF EXISTS "Users can view own blueprints" ON public.blueprints;
DROP POLICY IF EXISTS "Users can view public blueprints" ON public.blueprints;
DROP POLICY IF EXISTS "Users can create own blueprints" ON public.blueprints;
DROP POLICY IF EXISTS "Users can update own blueprints" ON public.blueprints;
DROP POLICY IF EXISTS "Users can delete own blueprints" ON public.blueprints;

CREATE POLICY "Users can view accessible blueprints" ON public.blueprints FOR SELECT USING (
  user_id = auth.uid() 
  OR is_public = true
  OR (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = blueprints.team_id AND tm.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create blueprints" ON public.blueprints FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND (team_id IS NULL OR EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = blueprints.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin', 'member')
  ))
);

CREATE POLICY "Users can update accessible blueprints" ON public.blueprints FOR UPDATE USING (
  user_id = auth.uid()
  OR (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = blueprints.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin', 'member')
  ))
);

CREATE POLICY "Users can delete own blueprints" ON public.blueprints FOR DELETE USING (
  user_id = auth.uid()
  OR (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = blueprints.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  ))
);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (
  user_id = auth.uid()
  OR (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = subscriptions.team_id AND tm.user_id = auth.uid()
  ))
);

-- Usage logs policies
CREATE POLICY "Users can view own usage" ON public.usage_logs FOR SELECT USING (
  user_id = auth.uid()
  OR (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = usage_logs.team_id AND tm.user_id = auth.uid()
  ))
);

-- API keys policies
CREATE POLICY "Users can manage own API keys" ON public.api_keys FOR ALL USING (
  user_id = auth.uid()
  OR (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = api_keys.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role IN ('owner', 'admin')
  ))
);

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON public.user_sessions FOR ALL USING (user_id = auth.uid());

-- Audit logs policies
CREATE POLICY "Users can view relevant audit logs" ON public.audit_logs FOR SELECT USING (
  user_id = auth.uid()
  OR (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = audit_logs.team_id AND tm.user_id = auth.uid()
  ))
);

-- Two-factor backup codes policies
CREATE POLICY "Users can manage own backup codes" ON public.two_factor_backup_codes FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workspace_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email_confirmed_at IS NOT NULL
  );

  -- Create personal workspace
  INSERT INTO public.workspaces (name, description, owner_id, is_personal)
  VALUES (
    'Personal Workspace',
    'Your personal workspace for private projects',
    NEW.id,
    TRUE
  )
  RETURNING id INTO workspace_id;

  -- Create audit log entry
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    NEW.id,
    'create',
    'user',
    NEW.id,
    jsonb_build_object('email', NEW.email, 'workspace_id', workspace_id)
  );

  RETURN NEW;
END;
$$;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id, old_values, ip_address
    )
    VALUES (
      auth.uid(),
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      inet_client_addr()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id, old_values, new_values, ip_address
    )
    VALUES (
      auth.uid(),
      'update',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      inet_client_addr()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id, new_values, ip_address
    )
    VALUES (
      auth.uid(),
      'create',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW),
      inet_client_addr()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Add audit triggers to important tables
CREATE TRIGGER audit_teams_changes AFTER INSERT OR UPDATE OR DELETE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_team_members_changes AFTER INSERT OR UPDATE OR DELETE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_blueprints_changes AFTER INSERT OR UPDATE OR DELETE ON public.blueprints FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

-- Function to check if user has team permission
CREATE OR REPLACE FUNCTION public.has_team_permission(
  _team_id UUID,
  _user_id UUID,
  _required_role team_role DEFAULT 'member'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = _team_id
    AND tm.user_id = _user_id
    AND tm.status = 'active'
    AND (
      CASE _required_role
        WHEN 'viewer' THEN tm.role IN ('viewer', 'member', 'admin', 'owner')
        WHEN 'member' THEN tm.role IN ('member', 'admin', 'owner')
        WHEN 'admin' THEN tm.role IN ('admin', 'owner')
        WHEN 'owner' THEN tm.role = 'owner'
      END
    )
  );
$$;

-- Function to get user's team role
CREATE OR REPLACE FUNCTION public.get_user_team_role(
  _team_id UUID,
  _user_id UUID
)
RETURNS team_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tm.role FROM public.team_members tm
  WHERE tm.team_id = _team_id
  AND tm.user_id = _user_id
  AND tm.status = 'active';
$$;