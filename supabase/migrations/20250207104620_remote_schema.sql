alter table "public"."channel_members" drop constraint "channel_members_user_id_fkey";
alter table "public"."class_channels" drop constraint "class_channels_created_by_fkey";
alter table "public"."invoices" alter column "parent_id" set not null;
alter table "public"."locations" disable row level security;
alter table "public"."studios" disable row level security;
alter table "public"."channel_members" add constraint "channel_members_user_id_fkey1" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;
alter table "public"."channel_members" validate constraint "channel_members_user_id_fkey1";
alter table "public"."class_channels" add constraint "class_channels_created_by_fkey1" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE not valid;
alter table "public"."class_channels" validate constraint "class_channels_created_by_fkey1";
alter table "public"."class_instances" add constraint "class_instances_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES users(id) not valid;
alter table "public"."class_instances" validate constraint "class_instances_teacher_id_fkey";
alter table "public"."conversation_participants" add constraint "conversation_participants_user_id_fkey1" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;
alter table "public"."conversation_participants" validate constraint "conversation_participants_user_id_fkey1";
alter table "public"."invoices" add constraint "invoices_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE not valid;
alter table "public"."invoices" validate constraint "invoices_parent_id_fkey";
set check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.add_admin_to_the_channel()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$BEGIN
  -- Add teacher as admin (users with teacher role)
  INSERT INTO channel_members (channel_id, user_id, role)
  SELECT 
    NEW.id,
    u.id,
    'admin'
  FROM classes c
  JOIN users u ON c.teacher_id = u.id
  WHERE c.id = NEW.class_id
    AND u.role = 'teacher'
  ON CONFLICT DO NOTHING;

  -- Add parents as members
  INSERT INTO channel_members (channel_id, user_id, role)
  SELECT 
    NEW.id,
    u.id,
    'member'
  FROM class_students cs
  JOIN students s ON cs.student_id = s.id
  JOIN users u ON s.parent_id = u.id
  WHERE cs.class_id = NEW.class_id
    AND u.role = 'parent'
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;$function$;
