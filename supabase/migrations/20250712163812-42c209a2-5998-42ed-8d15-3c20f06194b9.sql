-- Add security and rate limiting features

-- Create extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypted credentials storage
CREATE TABLE public.encrypted_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  encrypted_data TEXT NOT NULL, -- PGP encrypted API keys
  key_hash TEXT NOT NULL, -- Hash for key identification
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, service_name, key_hash)
);

-- Enable RLS
ALTER TABLE public.encrypted_credentials ENABLE ROW LEVEL SECURITY;

-- Policies for encrypted credentials
CREATE POLICY "Users can manage own credentials" ON public.encrypted_credentials
FOR ALL USING (user_id = auth.uid());

-- Rate limiting table
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_address INET,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies for rate limits (admin only)
CREATE POLICY "Service can manage rate limits" ON public.rate_limits
FOR ALL USING (true); -- Edge functions use service role

-- Input sanitization log
CREATE TABLE public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_address INET,
  endpoint TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('rate_limit', 'injection_attempt', 'invalid_input', 'encryption_error')),
  details JSONB,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Policies for security logs (admin only)
CREATE POLICY "Service can manage security logs" ON public.security_logs
FOR ALL USING (true); -- Edge functions use service role

-- Function to encrypt API keys
CREATE OR REPLACE FUNCTION public.encrypt_api_key(
  p_user_id UUID,
  p_service_name TEXT,
  p_api_key TEXT,
  p_passphrase TEXT
)
RETURNS UUID AS $$
DECLARE
  credential_id UUID;
  encrypted_key TEXT;
  key_hash TEXT;
BEGIN
  -- Generate hash for key identification
  key_hash := encode(digest(p_api_key, 'sha256'), 'hex');
  
  -- Encrypt the API key using PGP
  encrypted_key := pgp_sym_encrypt(p_api_key, p_passphrase);
  
  -- Store encrypted credential
  INSERT INTO public.encrypted_credentials (
    user_id,
    service_name,
    encrypted_data,
    key_hash,
    expires_at
  )
  VALUES (
    p_user_id,
    p_service_name,
    encrypted_key,
    key_hash,
    now() + INTERVAL '1 year'
  )
  ON CONFLICT (user_id, service_name, key_hash)
  DO UPDATE SET
    encrypted_data = EXCLUDED.encrypted_data,
    expires_at = EXCLUDED.expires_at,
    updated_at = now()
  RETURNING id INTO credential_id;
  
  RETURN credential_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt API keys
CREATE OR REPLACE FUNCTION public.decrypt_api_key(
  p_user_id UUID,
  p_service_name TEXT,
  p_passphrase TEXT
)
RETURNS TEXT AS $$
DECLARE
  encrypted_key TEXT;
  decrypted_key TEXT;
BEGIN
  -- Get the most recent non-expired credential
  SELECT encrypted_data INTO encrypted_key
  FROM public.encrypted_credentials
  WHERE user_id = p_user_id 
    AND service_name = p_service_name
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Decrypt the API key
  decrypted_key := pgp_sym_decrypt(encrypted_key, p_passphrase);
  
  RETURN decrypted_key;
EXCEPTION
  WHEN OTHERS THEN
    -- Log decryption error
    INSERT INTO public.security_logs (
      user_id,
      endpoint,
      event_type,
      details,
      severity
    )
    VALUES (
      p_user_id,
      'decrypt_api_key',
      'encryption_error',
      jsonb_build_object('service_name', p_service_name, 'error', SQLERRM),
      'high'
    );
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_ip_address INET,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
  is_blocked BOOLEAN DEFAULT FALSE;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Check if user is currently blocked
  SELECT EXISTS(
    SELECT 1 FROM public.rate_limits
    WHERE (user_id = p_user_id OR ip_address = p_ip_address)
      AND endpoint = p_endpoint
      AND blocked_until IS NOT NULL
      AND blocked_until > now()
  ) INTO is_blocked;
  
  IF is_blocked THEN
    RETURN FALSE;
  END IF;
  
  -- Count requests in current window
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND endpoint = p_endpoint
    AND window_start >= (now() - (p_window_minutes || ' minutes')::INTERVAL);
  
  -- Update or insert rate limit record
  INSERT INTO public.rate_limits (
    user_id,
    ip_address,
    endpoint,
    request_count,
    window_start,
    window_end,
    blocked_until
  )
  VALUES (
    p_user_id,
    p_ip_address,
    p_endpoint,
    1,
    now(),
    now() + (p_window_minutes || ' minutes')::INTERVAL,
    CASE WHEN current_count >= p_max_requests 
         THEN now() + INTERVAL '15 minutes'
         ELSE NULL 
    END
  )
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET
    request_count = rate_limits.request_count + 1,
    blocked_until = CASE 
      WHEN rate_limits.request_count >= p_max_requests 
      THEN now() + INTERVAL '15 minutes'
      ELSE rate_limits.blocked_until 
    END,
    updated_at = now();
  
  -- Log rate limit violations
  IF current_count >= p_max_requests THEN
    INSERT INTO public.security_logs (
      user_id,
      ip_address,
      endpoint,
      event_type,
      details,
      severity
    )
    VALUES (
      p_user_id,
      p_ip_address,
      p_endpoint,
      'rate_limit',
      jsonb_build_object(
        'request_count', current_count + 1,
        'max_requests', p_max_requests,
        'window_minutes', p_window_minutes
      ),
      'medium'
    );
    
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sanitize and validate input
CREATE OR REPLACE FUNCTION public.sanitize_input(
  p_input TEXT,
  p_max_length INTEGER DEFAULT 10000,
  p_allow_html BOOLEAN DEFAULT FALSE
)
RETURNS TEXT AS $$
DECLARE
  sanitized_input TEXT;
  suspicious_patterns TEXT[] := ARRAY[
    '(?i)<script[^>]*>.*?</script>',
    '(?i)javascript:',
    '(?i)vbscript:',
    '(?i)on\w+\s*=',
    '(?i)expression\s*\(',
    '(?i)@import',
    '(?i)behaviour\s*:',
    '(?i)-moz-binding',
    '(?i)data:text/html',
    '\bUNION\b.*\bSELECT\b',
    '\bDROP\b.*\bTABLE\b',
    '\bINSERT\b.*\bINTO\b',
    '\bDELETE\b.*\bFROM\b',
    '\bUPDATE\b.*\bSET\b'
  ];
  pattern TEXT;
BEGIN
  -- Check input length
  IF length(p_input) > p_max_length THEN
    RAISE EXCEPTION 'Input exceeds maximum length of % characters', p_max_length;
  END IF;
  
  -- Start with the original input
  sanitized_input := p_input;
  
  -- Check for suspicious patterns
  FOREACH pattern IN ARRAY suspicious_patterns
  LOOP
    IF sanitized_input ~* pattern THEN
      -- Log potential injection attempt
      INSERT INTO public.security_logs (
        endpoint,
        event_type,
        details,
        severity
      )
      VALUES (
        'input_sanitization',
        'injection_attempt',
        jsonb_build_object(
          'pattern_matched', pattern,
          'input_sample', left(p_input, 200)
        ),
        'high'
      );
      
      RAISE EXCEPTION 'Input contains potentially malicious content';
    END IF;
  END LOOP;
  
  -- Basic HTML sanitization if not allowing HTML
  IF NOT p_allow_html THEN
    sanitized_input := regexp_replace(sanitized_input, '<[^>]*>', '', 'g');
  END IF;
  
  -- Remove null bytes and control characters
  sanitized_input := regexp_replace(sanitized_input, '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g');
  
  RETURN sanitized_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_end < now() - INTERVAL '24 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old security logs
CREATE OR REPLACE FUNCTION public.cleanup_security_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.security_logs 
  WHERE created_at < now() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;