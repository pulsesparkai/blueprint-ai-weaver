-- Create table for temporary encrypted credential storage
CREATE TABLE public.integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_ref TEXT NOT NULL UNIQUE,
  encrypted_data TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

-- Integration credentials policies
CREATE POLICY "Users can access own credentials" ON public.integration_credentials
  FOR ALL USING (auth.uid() = user_id);

-- Create index for performance and cleanup
CREATE INDEX idx_integration_credentials_user_id ON public.integration_credentials(user_id);
CREATE INDEX idx_integration_credentials_expires_at ON public.integration_credentials(expires_at);
CREATE INDEX idx_integration_credentials_credential_ref ON public.integration_credentials(credential_ref);

-- Function to clean up expired credentials
CREATE OR REPLACE FUNCTION public.cleanup_expired_credentials()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.integration_credentials 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;