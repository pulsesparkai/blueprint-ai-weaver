-- Add team collaboration features

-- Blueprint sharing system
CREATE TABLE public.blueprint_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('public', 'private', 'team')),
  access_level TEXT NOT NULL CHECK (access_level IN ('view', 'edit', 'admin')),
  expires_at TIMESTAMPTZ,
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64url'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blueprint_shares ENABLE ROW LEVEL SECURITY;

-- Policies for blueprint shares
CREATE POLICY "Users can create shares for own blueprints" ON public.blueprint_shares
FOR INSERT WITH CHECK (
  created_by = auth.uid() AND 
  EXISTS (SELECT 1 FROM public.blueprints WHERE id = blueprint_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view shares they created" ON public.blueprint_shares
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can update shares they created" ON public.blueprint_shares
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete shares they created" ON public.blueprint_shares
FOR DELETE USING (created_by = auth.uid());

-- Node comments system
CREATE TABLE public.node_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  comment_text TEXT NOT NULL,
  x_position FLOAT,
  y_position FLOAT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.node_comments ENABLE ROW LEVEL SECURITY;

-- Policies for node comments
CREATE POLICY "Users can create comments on accessible blueprints" ON public.node_comments
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  (
    EXISTS (SELECT 1 FROM public.blueprints WHERE id = blueprint_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.blueprint_shares WHERE blueprint_id = node_comments.blueprint_id AND access_level IN ('edit', 'admin'))
  )
);

CREATE POLICY "Users can view comments on accessible blueprints" ON public.node_comments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.blueprints WHERE id = blueprint_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.blueprint_shares WHERE blueprint_id = node_comments.blueprint_id)
);

CREATE POLICY "Users can update own comments" ON public.node_comments
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Blueprint owners can resolve comments" ON public.node_comments
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.blueprints WHERE id = blueprint_id AND user_id = auth.uid())
);

-- Version history system
CREATE TABLE public.blueprint_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  change_summary TEXT,
  created_by UUID NOT NULL,
  created_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blueprint_id, version_number)
);

-- Enable RLS
ALTER TABLE public.blueprint_versions ENABLE ROW LEVEL SECURITY;

-- Policies for version history
CREATE POLICY "Users can create versions for accessible blueprints" ON public.blueprint_versions
FOR INSERT WITH CHECK (
  created_by = auth.uid() AND
  (
    EXISTS (SELECT 1 FROM public.blueprints WHERE id = blueprint_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.blueprint_shares WHERE blueprint_id = blueprint_versions.blueprint_id AND access_level IN ('edit', 'admin'))
  )
);

CREATE POLICY "Users can view versions of accessible blueprints" ON public.blueprint_versions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.blueprints WHERE id = blueprint_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.blueprint_shares WHERE blueprint_id = blueprint_versions.blueprint_id)
);

-- Team management (Enterprise only)
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by UUID NOT NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('invited', 'active', 'inactive')) DEFAULT 'invited',
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Policies for teams (Enterprise only)
CREATE POLICY "Team owners can manage their teams" ON public.teams
FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Team members can view their teams" ON public.team_members
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);

CREATE POLICY "Team owners can manage members" ON public.team_members
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND owner_id = auth.uid())
);

-- Real-time collaboration sessions
CREATE TABLE public.collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  cursor_position JSONB,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('active', 'idle', 'offline')) DEFAULT 'active',
  UNIQUE(blueprint_id, user_id)
);

-- Enable RLS
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for collaboration sessions
CREATE POLICY "Users can manage own collaboration sessions" ON public.collaboration_sessions
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view sessions on accessible blueprints" ON public.collaboration_sessions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.blueprints WHERE id = blueprint_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.blueprint_shares WHERE blueprint_id = collaboration_sessions.blueprint_id)
);

-- Functions for version management
CREATE OR REPLACE FUNCTION public.create_blueprint_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.blueprint_versions (
    blueprint_id,
    version_number,
    title,
    description,
    nodes,
    edges,
    change_summary,
    created_by,
    created_by_email
  )
  VALUES (
    NEW.id,
    COALESCE(
      (SELECT MAX(version_number) + 1 FROM public.blueprint_versions WHERE blueprint_id = NEW.id),
      1
    ),
    NEW.title,
    NEW.description,
    NEW.nodes,
    NEW.edges,
    'Auto-saved version',
    NEW.user_id,
    (SELECT email FROM public.profiles WHERE id = NEW.user_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-versioning
CREATE TRIGGER blueprint_version_trigger
  AFTER UPDATE ON public.blueprints
  FOR EACH ROW
  WHEN (OLD.nodes IS DISTINCT FROM NEW.nodes OR OLD.edges IS DISTINCT FROM NEW.edges)
  EXECUTE FUNCTION public.create_blueprint_version();

-- Function to cleanup expired shares
CREATE OR REPLACE FUNCTION public.cleanup_expired_shares()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.blueprint_shares 
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update collaboration session
CREATE OR REPLACE FUNCTION public.update_collaboration_session(
  p_blueprint_id UUID,
  p_cursor_position JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.collaboration_sessions (
    blueprint_id,
    user_id,
    user_email,
    user_name,
    cursor_position,
    last_seen,
    status
  )
  VALUES (
    p_blueprint_id,
    auth.uid(),
    (SELECT email FROM public.profiles WHERE id = auth.uid()),
    (SELECT full_name FROM public.profiles WHERE id = auth.uid()),
    p_cursor_position,
    now(),
    'active'
  )
  ON CONFLICT (blueprint_id, user_id)
  DO UPDATE SET
    cursor_position = EXCLUDED.cursor_position,
    last_seen = now(),
    status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;