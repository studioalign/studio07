-- Seed data for testing
-- Note: Replace the UUIDs below with actual auth.uid() values when testing with real users

-- Create test users
INSERT INTO public.users (id, role, name, email, studio_id)
VALUES
  (
    'c9c1b5b2-f455-4abc-9cd4-39b9e4e2008e',
    'owner',
    'Test Owner',
    'owner@test.com',
    NULL
  ),
  (
    'd3c5e7f8-9abc-4def-8123-456789abcdef',
    'teacher',
    'Test Teacher 1',
    'teacher1@test.com',
    'f452e0d9-7654-4cab-a456-e7812f34a011'
  ),
  (
    'e4d6f8g9-0123-4567-89ab-cdef01234567',
    'teacher',
    'Test Teacher 2',
    'teacher2@test.com',
    'f452e0d9-7654-4cab-a456-e7812f34a011'
  ),
  (
    'f5a6b7c8-9012-4456-7890-123456789abc',
    'parent',
    'Test Parent 1',
    'parent1@test.com',
    'f452e0d9-7654-4cab-a456-e7812f34a011'
  ),
  (
    'a6b7c8d9-0123-4567-8901-23456789abcd',
    'parent',
    'Test Parent 2',
    'parent2@test.com',
    'f452e0d9-7654-4cab-a456-e7812f34a011'
  );

-- Create test studio
INSERT INTO public.studios (id, owner_id, name, address, phone, email)
VALUES (
  'f452e0d9-7654-4cab-a456-e7812f34a011',
  'c9c1b5b2-f455-4abc-9cd4-39b9e4e2008e',
  'Test Dance Studio',
  '123 Test Street',
  '555-0123',
  'studio@test.com'
);

-- Create test locations
INSERT INTO public.locations (id, studio_id, name, address)
VALUES
  (
    'a1b2c3d4-e5f6-4789-0123-456789abcdef',
    'f452e0d9-7654-4cab-a456-e7812f34a011',
    'Main Studio',
    '123 Test Street, Room 1'
  ),
  (
    'b2c3d4e5-f6a7-4901-2345-6789abcdef01',
    'f452e0d9-7654-4cab-a456-e7812f34a011',
    'Practice Room',
    '123 Test Street, Room 2'
  );

-- Create test students
INSERT INTO public.students (id, parent_id, studio_id, name, date_of_birth)
VALUES
  (
    'b7c8d9e0-1234-4678-9012-3456789abcde',
    'f5a6b7c8-9012-4456-7890-123456789abc',
    'f452e0d9-7654-4cab-a456-e7812f34a011',
    'Test Student 1',
    '2015-01-01'
  ),
  (
    'c8d9e0f1-2345-4789-0123-456789abcdef',
    'f5a6b7c8-9012-4456-7890-123456789abc',
    'f452e0d9-7654-4cab-a456-e7812f34a011',
    'Test Student 2',
    '2016-02-02'
  ),
  (
    'd9e0f1a2-3456-4890-1234-56789abcdef0',
    'a6b7c8d9-0123-4567-8901-23456789abcd',
    'f452e0d9-7654-4cab-a456-e7812f34a011',
    'Test Student 3',
    '2014-03-03'
  );

-- Create test classes
INSERT INTO public.classes (
  id, studio_id, name, teacher_id, start_time, end_time,
  day_of_week, is_recurring, date, location_id, end_date
)
VALUES
  (
    'e0f1a2b3-4567-4901-2345-6789abcdef01',
    'f452e0d9-7654-4cab-a456-e7812f34a011',
    'Ballet Beginners',
    'd3c5e7f8-9abc-4def-8123-456789abcdef',
    '09:00:00',
    '10:00:00',
    1, -- Monday
    true,
    '2024-01-01',
    'a1b2c3d4-e5f6-4789-0123-456789abcdef',
    '2024-12-31'
  ),
  (
    'f1a2b3c4-5678-4012-3456-789abcdef012',
    'f452e0d9-7654-4cab-a456-e7812f34a011',
    'Jazz Intermediate',
    'e4d6f8g9-0123-4567-89ab-cdef01234567',
    '14:00:00',
    '15:30:00',
    3, -- Wednesday
    true,
    '2024-01-03',
    'b2c3d4e5-f6a7-4901-2345-6789abcdef01',
    '2024-12-31'
  );

-- Enroll students in classes
INSERT INTO public.class_students (class_id, student_id)
VALUES
  (
    'e0f1a2b3-4567-4901-2345-6789abcdef01',
    'b7c8d9e0-1234-4678-9012-3456789abcde'
  ),
  (
    'e0f1a2b3-4567-4901-2345-6789abcdef01',
    'c8d9e0f1-2345-4789-0123-456789abcdef'
  ),
  (
    'f1a2b3c4-5678-4012-3456-789abcdef012',
    'd9e0f1a2-3456-4890-1234-56789abcdef0'
  );

-- Create test pricing plans
INSERT INTO public.pricing_plans (
  id, studio_id, name, description, amount, interval, active
)
VALUES
  (
    'a2b3c4d5-6789-4123-4567-89abcdef0123',
    'f452e0d9-7654-4cab-a456-e7812f34a011',
    'Monthly Basic',
    'Basic monthly plan for one class per week',
    50.00,
    'monthly',
    true
  ),
  (
    'b3c4d5e6-7890-4234-5678-9abcdef01234',
    'f452e0d9-7654-4cab-a456-e7812f34a011',
    'Term Package',
    'Full term package with multiple classes',
    400.00,
    'term',
    true
  );

-- Create test plan enrollments
INSERT INTO public.plan_enrollments (
  id, plan_id, student_id, start_date, end_date, status
)
VALUES
  (
    'c4d5e6f7-8901-4345-6789-0abcdef01234',
    'a2b3c4d5-6789-4123-4567-89abcdef0123',
    'b7c8d9e0-1234-4678-9012-3456789abcde',
    '2024-01-01',
    '2024-12-31',
    'active'
  ),
  (
    'd5e6f7a8-9012-4456-7890-1bcdef012345',
    'b3c4d5e6-7890-4234-5678-9abcdef01234',
    'c8d9e0f1-2345-4789-0123-456789abcdef',
    '2024-01-01',
    '2024-12-31',
    'active'
  );

-- Create test invoices
INSERT INTO public.invoices (
  id, studio_id, parent_id, number, status, due_date,
  subtotal, tax, total, notes
)
VALUES
  (
    'e6f7a8b9-0123-4567-8901-2cdef0123456',
    'f452e0d9-7654-4cab-a456-e7812f34a011',
    'f5a6b7c8-9012-4456-7890-123456789abc',
    'INV-2024-000001',
    'sent',
    '2024-02-01',
    100.00,
    10.00,
    110.00,
    'Monthly fees for January 2024'
  );

-- Create test invoice items
INSERT INTO public.invoice_items (
  id, invoice_id, student_id, description,
  quantity, unit_price, subtotal, tax, total, type,
  plan_enrollment_id
)
VALUES
  (
    'f7a8b9c0-1234-4678-9012-3def01234567',
    'e6f7a8b9-0123-4567-8901-2cdef0123456',
    'b7c8d9e0-1234-4678-9012-3456789abcde',
    'Monthly Basic Plan - January 2024',
    1,
    50.00,
    50.00,
    5.00,
    55.00,
    'tuition',
    'c4d5e6f7-8901-4345-6789-0abcdef01234'
  ),
  (
    'a8b9c0d1-2345-4789-0123-4ef012345678',
    'e6f7a8b9-0123-4567-8901-2cdef0123456',
    'c8d9e0f1-2345-4789-0123-456789abcdef',
    'Term Package - First Payment',
    1,
    50.00,
    50.00,
    5.00,
    55.00,
    'tuition',
    'd5e6f7a8-9012-4456-7890-1bcdef012345'
  ); 