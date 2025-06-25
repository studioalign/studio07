-- Create user invitations table for tracking invitation tokens
CREATE TABLE IF NOT EXISTS public.user_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL CHECK (role IN ('teacher', 'parent')),
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitation_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_invitations_studio_id ON user_invitations(studio_id);
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX idx_user_invitations_expires_at ON user_invitations(expires_at);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_invitations
CREATE POLICY "Studio owners can manage invitations" ON user_invitations
    FOR ALL USING (
        studio_id IN (
            SELECT studio_id FROM public.users WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    -- Generate a secure random token
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user invitation
CREATE OR REPLACE FUNCTION create_user_invitation(
    p_studio_id UUID,
    p_email TEXT,
    p_role user_role,
    p_invited_by UUID,
    p_token TEXT
)
RETURNS TABLE(
    invitation_id UUID,
    invitation_token TEXT
) AS $$
DECLARE
    v_token TEXT;
    v_invitation_id UUID;
BEGIN
    -- Verify the inviter is a studio owner
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = p_invited_by 
        AND studio_id = p_studio_id 
        AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Only studio owners can send invitations';
    END IF;

    -- Check if user already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'User with this email already exists';
    END IF;

    -- Check if there's already a pending invitation
    IF EXISTS (
        SELECT 1 FROM public.user_invitations 
        WHERE email = p_email 
        AND studio_id = p_studio_id 
        AND expires_at > NOW() 
        AND used_at IS NULL
    ) THEN
        RAISE EXCEPTION 'An invitation for this email already exists';
    END IF;
    
    -- Create invitation
    INSERT INTO public.user_invitations (studio_id, email, role, invited_by, invitation_token)
    VALUES (p_studio_id, p_email, p_role, p_invited_by, p_token)
    RETURNING id INTO v_invitation_id;
    
    RETURN QUERY SELECT v_invitation_id, p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate invitation token
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token TEXT)
RETURNS TABLE(
    studio_id UUID,
    email TEXT,
    role user_role,
    studio_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.studio_id,
        i.email,
        i.role,
        s.name as studio_name
    FROM public.user_invitations i
    JOIN public.studios s ON i.studio_id = s.id
    WHERE i.invitation_token = p_token
    AND i.expires_at > NOW()
    AND i.used_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark invitation as used
CREATE OR REPLACE FUNCTION mark_invitation_used(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.user_invitations 
    SET used_at = NOW()
    WHERE invitation_token = p_token
    AND expires_at > NOW()
    AND used_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add billing_setup_complete column to studios table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'studios' 
        AND column_name = 'billing_setup_complete'
    ) THEN
        ALTER TABLE studios ADD COLUMN billing_setup_complete BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- Function to check if studio has completed billing setup
CREATE OR REPLACE FUNCTION check_billing_setup_complete(p_studio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.studio_subscriptions
        WHERE studio_id = p_studio_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function to handle invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_studio_id uuid;
  v_role public.user_role;
  v_name text;
  v_invitation_token text;
  v_invitation_valid boolean := false;
BEGIN
  -- Log the incoming data
  RAISE NOTICE 'New user data: id=%, email=%, metadata=%', NEW.id, NEW.email, NEW.raw_user_meta_data;
  
  -- Extract invitation token if present
  v_invitation_token := NEW.raw_user_meta_data->>'invitation_token';
  
  -- If invitation token is provided, validate it
  IF v_invitation_token IS NOT NULL THEN
    -- Validate invitation
    RAISE WARNING 'Validating invitation token: %', v_invitation_token;
    SELECT studio_id, role INTO v_studio_id, v_role
    FROM public.validate_invitation_token(v_invitation_token);
    RAISE WARNING 'Validated invitation token: %', v_studio_id;
    
    IF v_studio_id IS NOT NULL THEN
      v_invitation_valid := true;
      -- Mark invitation as used
      PERFORM public.mark_invitation_used(v_invitation_token);
      RAISE WARNING 'Valid invitation found for studio: %, role: %', v_studio_id, v_role;
    ELSE
      RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;
  ELSE
    -- No invitation token - only allow owner role
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'owner'::public.user_role);
    
    IF v_role != 'owner' THEN
      RAISE EXCEPTION 'Direct signup is only allowed for studio owners. Teachers and parents must be invited.';
    END IF;
    
    v_studio_id := NULL; -- Owners don't have studio_id initially
  END IF;
  
  -- Extract name
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  RAISE WARNING 'Extracted name: %', v_name;

  INSERT INTO public.users (
    id,
    name,
    email,
    studio_id,
    role
  )
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_studio_id,
    v_role
  );
  
  RAISE NOTICE 'Successfully inserted user with id: %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log any errors that occur
  RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
  RAISE;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE user_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invitation_token() TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_invitation(UUID, TEXT, user_role, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invitation_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_invitation_used(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_billing_setup_complete(UUID) TO authenticated; 