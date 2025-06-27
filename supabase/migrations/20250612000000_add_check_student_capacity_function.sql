CREATE OR REPLACE FUNCTION public.check_student_capacity(p_studio_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_student_count integer;
    current_max_students integer;
    can_add boolean;
BEGIN
    -- Get current student count
    SELECT public.get_studio_student_count(p_studio_id) INTO current_student_count;

    -- Get current subscription max students
    SELECT s.max_students INTO current_max_students
    FROM public.studio_subscriptions s
    WHERE s.studio_id = p_studio_id
    AND s.status = 'active'
    OR s.status = 'trialing'
    LIMIT 1;

    -- If no subscription (current_max_students is NULL), they cannot add students.
    -- If they have a subscription, check count against max.
    can_add := current_max_students IS NOT NULL AND current_student_count < current_max_students;

    RETURN jsonb_build_object(
        'can_add', can_add,
        'current_students', current_student_count,
        'max_students', COALESCE(current_max_students, 0)
    );
END;
$$; 