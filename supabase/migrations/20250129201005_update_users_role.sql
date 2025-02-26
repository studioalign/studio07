-- First, alter the users table to change role column type
ALTER TABLE public.users 
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE user_role USING role::user_role;
-- Set the default back with the correct type
ALTER TABLE public.users 
  ALTER COLUMN role SET DEFAULT 'owner'::user_role;
-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
-- Drop and recreate the function with explicit signature
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
-- Recreate the function with role support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_studio_id uuid;
  v_role user_role;
  v_name text;
BEGIN
  -- Log the incoming data
  RAISE NOTICE 'New user data: id=%, email=%, metadata=%', NEW.id, NEW.email, NEW.raw_user_meta_data;
  
  -- Extract and validate role
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'owner'::user_role);
  RAISE NOTICE 'Extracted role: %', v_role;
  
  -- Extract name
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  RAISE NOTICE 'Extracted name: %', v_name;
  
  -- Try to get studio_id from metadata
  BEGIN
    v_studio_id := (NEW.raw_user_meta_data->>'studio_id')::uuid;
    RAISE NOTICE 'Parsed studio_id: %', v_studio_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error parsing studio_id: %', SQLERRM;
    v_studio_id := NULL;
  END;

  -- Validate studio_id based on role
  IF v_role = 'owner'::user_role AND v_studio_id IS NOT NULL THEN
    RAISE NOTICE 'Owner role detected, setting studio_id to NULL';
    v_studio_id := NULL;
  ELSIF v_role IN ('teacher'::user_role, 'parent'::user_role) AND v_studio_id IS NULL THEN
    RAISE EXCEPTION 'studio_id is required for role %', v_role;
  END IF;

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
-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
