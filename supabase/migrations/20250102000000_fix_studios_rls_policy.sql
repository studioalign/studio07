-- Fix Studios RLS Policy to work with current schema
-- The old policy references a non-existent 'owners' table
-- The new policy should reference the 'users' table directly

-- Drop the old policy that references the non-existent owners table
DROP POLICY IF EXISTS "Owners can manage own studio" ON public.studios;

-- Create new policy that works with the current schema where studios.owner_id references users.id
CREATE POLICY "Studio owners can manage studios" ON public.studios
AS PERMISSIVE
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Also ensure service role can bypass RLS for admin operations
CREATE POLICY "Service role can manage all studios" ON public.studios
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true); 