create sequence "public"."function_logs_id_seq";

drop trigger if exists "trigger_add_admin" on "public"."class_channels";

drop trigger if exists "increment_unread_messages" on "public"."messages";

drop trigger if exists "update_conversation_timestamp" on "public"."messages";

drop policy "Members can create posts" on "public"."channel_posts";

drop policy "Users can edit their own messages" on "public"."messages";

drop policy "Users can send messages" on "public"."messages";

drop policy "Users can view messages in their conversations" on "public"."messages";

drop policy "Members can create comments" on "public"."post_comments";

drop policy "Channel admins can manage members" on "public"."channel_members";

drop policy "Authors can manage media" on "public"."post_media";

alter table "public"."class_channels" drop constraint "class_channels_class_id_fkey";

alter table "public"."messages" drop constraint "messages_sender_id_fkey";

drop function if exists "public"."add_admin_to_the_channel"();

drop function if exists "public"."add_channel_members"();

drop index if exists "public"."idx_class_channels_class";

drop index if exists "public"."idx_class_channels_class_id";

drop index if exists "public"."idx_messages_conversation";

drop index if exists "public"."idx_messages_sender";

create table "public"."document_recipients" (
    "id" uuid not null default uuid_generate_v4(),
    "document_id" uuid not null,
    "user_id" uuid not null,
    "viewed_at" timestamp with time zone,
    "signed_at" timestamp with time zone,
    "signature" text,
    "last_reminder_sent" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."documents" (
    "id" uuid not null default uuid_generate_v4(),
    "studio_id" uuid not null,
    "name" text not null,
    "description" text,
    "file_url" text not null,
    "requires_signature" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid not null,
    "expires_at" timestamp with time zone,
    "status" text not null default 'active'::text,
    "archived_at" timestamp with time zone
);


create table "public"."drop_in_bookings" (
    "id" uuid not null default uuid_generate_v4(),
    "class_id" uuid not null,
    "student_id" uuid not null,
    "parent_id" uuid not null,
    "payment_status" character varying(50) not null default 'pending'::character varying,
    "payment_amount" numeric(10,2) not null,
    "payment_method_id" uuid,
    "stripe_payment_id" character varying(255),
    "created_at" timestamp with time zone not null default now(),
    "studio_id" uuid,
    "stripe_payment_method_id" text,
    "updated_at" timestamp with time zone default now()
);


create table "public"."function_logs" (
    "id" integer not null default nextval('function_logs_id_seq'::regclass),
    "function_name" text not null,
    "message" text not null,
    "details" jsonb,
    "status" text not null,
    "created_at" timestamp with time zone default now()
);


create table "public"."notifications" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "studio_id" uuid not null,
    "type" character varying not null,
    "title" character varying not null,
    "message" text not null,
    "priority" character varying default 'medium'::character varying,
    "entity_id" uuid,
    "entity_type" character varying,
    "link" character varying,
    "details" jsonb,
    "read" boolean default false,
    "dismissed" boolean default false,
    "requires_action" boolean default false,
    "email_required" boolean default false,
    "email_sent" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "email_sent_at" timestamp with time zone,
    "email_success" boolean default false
);


create table "public"."user_preferences" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "email_class_updates" boolean default true,
    "email_messages" boolean default true,
    "email_billing" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_preferences" enable row level security;

alter table "public"."channel_posts" disable row level security;

alter table "public"."class_channels" drop column "class_id";

alter table "public"."class_channels" add column "studio_id" uuid not null;

alter table "public"."class_students" add column "is_drop_in" boolean default false;

alter table "public"."classes" add column "booked_count" integer default 0;

alter table "public"."invoices" add column "index" bigint not null default '1'::bigint;

alter table "public"."messages" alter column "conversation_id" set not null;

alter table "public"."messages" alter column "sender_id" set not null;

alter table "public"."payment_methods" add column "user_id" uuid;

alter table "public"."refunds" disable row level security;

alter sequence "public"."function_logs_id_seq" owned by "public"."function_logs"."id";

CREATE UNIQUE INDEX document_recipients_document_id_user_id_key ON public.document_recipients USING btree (document_id, user_id);

CREATE UNIQUE INDEX document_recipients_pkey ON public.document_recipients USING btree (id);

CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);

CREATE UNIQUE INDEX drop_in_bookings_class_id_student_id_key ON public.drop_in_bookings USING btree (class_id, student_id);

CREATE UNIQUE INDEX drop_in_bookings_pkey ON public.drop_in_bookings USING btree (id);

CREATE UNIQUE INDEX function_logs_pkey ON public.function_logs USING btree (id);

CREATE INDEX idx_classes_booked_count ON public.classes USING btree (booked_count);

CREATE INDEX idx_classes_capacity ON public.classes USING btree (capacity);

CREATE INDEX idx_classes_date ON public.classes USING btree (date);

CREATE INDEX idx_classes_is_drop_in ON public.classes USING btree (is_drop_in);

CREATE INDEX idx_drop_in_bookings_class_id ON public.drop_in_bookings USING btree (class_id);

CREATE INDEX idx_drop_in_bookings_parent_id ON public.drop_in_bookings USING btree (parent_id);

CREATE INDEX idx_drop_in_bookings_payment_status ON public.drop_in_bookings USING btree (payment_status);

CREATE INDEX idx_drop_in_bookings_student_id ON public.drop_in_bookings USING btree (student_id);

CREATE INDEX idx_function_logs_created_at ON public.function_logs USING btree (created_at);

CREATE INDEX idx_function_logs_function_name ON public.function_logs USING btree (function_name);

CREATE INDEX idx_function_logs_status ON public.function_logs USING btree (status);

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);

CREATE INDEX notifications_created_at_idx ON public.notifications USING btree (created_at);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE INDEX notifications_read_idx ON public.notifications USING btree (read);

CREATE INDEX notifications_studio_id_idx ON public.notifications USING btree (studio_id);

CREATE INDEX notifications_type_idx ON public.notifications USING btree (type);

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id);

CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (id);

CREATE UNIQUE INDEX user_preferences_user_id_key ON public.user_preferences USING btree (user_id);

alter table "public"."document_recipients" add constraint "document_recipients_pkey" PRIMARY KEY using index "document_recipients_pkey";

alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "public"."drop_in_bookings" add constraint "drop_in_bookings_pkey" PRIMARY KEY using index "drop_in_bookings_pkey";

alter table "public"."function_logs" add constraint "function_logs_pkey" PRIMARY KEY using index "function_logs_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."user_preferences" add constraint "user_preferences_pkey" PRIMARY KEY using index "user_preferences_pkey";

alter table "public"."class_channels" add constraint "class_channels_studio_id_fkey" FOREIGN KEY (studio_id) REFERENCES studios(id) not valid;

alter table "public"."class_channels" validate constraint "class_channels_studio_id_fkey";

alter table "public"."document_recipients" add constraint "document_recipients_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE not valid;

alter table "public"."document_recipients" validate constraint "document_recipients_document_id_fkey";

alter table "public"."document_recipients" add constraint "document_recipients_document_id_user_id_key" UNIQUE using index "document_recipients_document_id_user_id_key";

alter table "public"."document_recipients" add constraint "document_recipients_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."document_recipients" validate constraint "document_recipients_user_id_fkey";

alter table "public"."documents" add constraint "documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."documents" validate constraint "documents_created_by_fkey";

alter table "public"."documents" add constraint "documents_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text]))) not valid;

alter table "public"."documents" validate constraint "documents_status_check";

alter table "public"."documents" add constraint "documents_studio_id_fkey" FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE not valid;

alter table "public"."documents" validate constraint "documents_studio_id_fkey";

alter table "public"."drop_in_bookings" add constraint "drop_in_bookings_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) not valid;

alter table "public"."drop_in_bookings" validate constraint "drop_in_bookings_class_id_fkey";

alter table "public"."drop_in_bookings" add constraint "drop_in_bookings_class_id_student_id_key" UNIQUE using index "drop_in_bookings_class_id_student_id_key";

alter table "public"."drop_in_bookings" add constraint "drop_in_bookings_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES users(id) not valid;

alter table "public"."drop_in_bookings" validate constraint "drop_in_bookings_parent_id_fkey";

alter table "public"."drop_in_bookings" add constraint "drop_in_bookings_payment_method_id_fkey" FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) not valid;

alter table "public"."drop_in_bookings" validate constraint "drop_in_bookings_payment_method_id_fkey";

alter table "public"."drop_in_bookings" add constraint "drop_in_bookings_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) not valid;

alter table "public"."drop_in_bookings" validate constraint "drop_in_bookings_student_id_fkey";

alter table "public"."drop_in_bookings" add constraint "drop_in_bookings_studio_id_fkey" FOREIGN KEY (studio_id) REFERENCES studios(id) not valid;

alter table "public"."drop_in_bookings" validate constraint "drop_in_bookings_studio_id_fkey";

alter table "public"."messages" add constraint "valid_content" CHECK ((length(content) > 0)) not valid;

alter table "public"."messages" validate constraint "valid_content";

alter table "public"."notifications" add constraint "notifications_priority_check" CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))) not valid;

alter table "public"."notifications" validate constraint "notifications_priority_check";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."payment_methods" add constraint "payment_methods_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."payment_methods" validate constraint "payment_methods_parent_id_fkey";

alter table "public"."payment_methods" add constraint "payment_methods_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."payment_methods" validate constraint "payment_methods_user_id_fkey";

alter table "public"."user_preferences" add constraint "user_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_preferences" validate constraint "user_preferences_user_id_fkey";

alter table "public"."user_preferences" add constraint "user_preferences_user_id_key" UNIQUE using index "user_preferences_user_id_key";

alter table "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_sender_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_default_user_preferences()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default preferences for the new user
  INSERT INTO user_preferences (user_id, email_class_updates, email_messages, email_billing)
  VALUES (NEW.id, TRUE, TRUE, TRUE);
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_owner_keep_studio(p_owner_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete personal user data
  DELETE FROM user_preferences WHERE user_id = p_owner_id;
  
  -- Delete notifications
  DELETE FROM notifications WHERE user_id = p_owner_id;
  
  -- Delete messages
  DELETE FROM messages WHERE sender_id = p_owner_id;
  DELETE FROM conversation_participants WHERE user_id = p_owner_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_parent_account(p_parent_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete all student data (assume cascades to class_students, etc.)
  DELETE FROM students WHERE parent_id = p_parent_id;
  
  -- Delete parent entry
  DELETE FROM parents WHERE user_id = p_parent_id;
  
  -- Delete user preferences
  DELETE FROM user_preferences WHERE user_id = p_parent_id;
  
  -- Delete payments
  DELETE FROM payments WHERE parent_id = p_parent_id;
  
  -- Delete invoices
  DELETE FROM invoices WHERE parent_id = p_parent_id;
  
  -- Delete notifications
  DELETE FROM notifications WHERE user_id = p_parent_id;
  
  -- Delete messages
  DELETE FROM messages WHERE sender_id = p_parent_id;
  DELETE FROM conversation_participants WHERE user_id = p_parent_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_studio_and_owner(p_owner_id uuid, p_studio_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_ids UUID[];
BEGIN
  -- Get all user IDs associated with this studio for cleanup
  SELECT array_agg(id) INTO v_user_ids FROM users WHERE studio_id = p_studio_id;
  
  -- Delete all data associated with the studio
  -- The order here matters due to foreign key constraints

  -- Delete all notifications for studio users
  DELETE FROM notifications WHERE user_id = ANY(v_user_ids);
  
  -- Delete all invoices and payments
  DELETE FROM payments WHERE studio_id = p_studio_id;
  DELETE FROM invoices WHERE studio_id = p_studio_id;
  
  -- Delete all class-related data
  DELETE FROM attendance WHERE class_id IN (SELECT id FROM classes WHERE studio_id = p_studio_id);
  DELETE FROM class_students WHERE class_id IN (SELECT id FROM classes WHERE studio_id = p_studio_id);
  DELETE FROM classes WHERE studio_id = p_studio_id;
  
  -- Delete all students
  DELETE FROM students WHERE studio_id = p_studio_id;
  
  -- Delete all locations
  DELETE FROM locations WHERE studio_id = p_studio_id;
  
  -- Delete all user preferences
  DELETE FROM user_preferences WHERE user_id = ANY(v_user_ids);
  
  -- Delete all messages for studio users
  DELETE FROM messages WHERE sender_id = ANY(v_user_ids);
  DELETE FROM conversation_participants WHERE user_id = ANY(v_user_ids);
  
  -- Delete all channel/posts related data
  DELETE FROM channel_members WHERE user_id = ANY(v_user_ids);
  DELETE FROM post_comments WHERE author_id = ANY(v_user_ids);
  DELETE FROM post_reactions WHERE user_id = ANY(v_user_ids);
  DELETE FROM channel_posts WHERE author_id = ANY(v_user_ids);
  DELETE FROM class_channels WHERE studio_id = p_studio_id;
  
  -- Finally delete the studio itself
  DELETE FROM studios WHERE id = p_studio_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_teacher_account(p_teacher_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Note: We do NOT delete classes - they will remain assigned to this teacher
  -- but studio owner will need to reassign them
  
  -- Unlink teacher from any studio_teachers link table if exists
  DELETE FROM studio_teachers WHERE teacher_id = p_teacher_id;
  
  -- Delete user preferences
  DELETE FROM user_preferences WHERE user_id = p_teacher_id;
  
  -- Delete notifications
  DELETE FROM notifications WHERE user_id = p_teacher_id;
  
  -- Delete messages
  DELETE FROM messages WHERE sender_id = p_teacher_id;
  DELETE FROM conversation_participants WHERE user_id = p_teacher_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_studio_id UUID;
BEGIN
  -- Get current user ID and role
  SELECT id, role, studio_id INTO v_user_id, v_role, v_studio_id 
  FROM users 
  WHERE id = auth.uid();
  
  -- Call appropriate function based on role
  IF v_role = 'parent' THEN
    PERFORM delete_parent_account(v_user_id);
  ELSIF v_role = 'teacher' THEN
    PERFORM delete_teacher_account(v_user_id);
  ELSIF v_role = 'owner' THEN
    -- Check if there are other owners
    IF EXISTS (
      SELECT 1 FROM users 
      WHERE studio_id = v_studio_id 
      AND role = 'owner' 
      AND id != v_user_id
    ) THEN
      -- Keep studio but delete owner
      PERFORM delete_owner_keep_studio(v_user_id);
    ELSE
      -- Delete entire studio and owner
      PERFORM delete_studio_and_owner(v_user_id, v_studio_id);
    END IF;
  ELSE
    -- Generic deletion
    DELETE FROM user_preferences WHERE user_id = v_user_id;
    DELETE FROM notifications WHERE user_id = v_user_id;
    DELETE FROM messages WHERE sender_id = v_user_id;
    DELETE FROM conversation_participants WHERE user_id = v_user_id;
  END IF;
  
  -- Delete the user's record from users table
  DELETE FROM users WHERE id = v_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_available_spots(class_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    class_capacity INTEGER;
    current_bookings INTEGER;
BEGIN
    -- Get class capacity and current booking count
    SELECT capacity, COALESCE(booked_count, 0) 
    INTO class_capacity, current_bookings
    FROM classes
    WHERE id = class_id;
    
    -- Return available spots
    RETURN GREATEST(0, class_capacity - current_bookings);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(studio_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  next_number INTEGER;
BEGIN
  -- Get the max invoice number for this studio and add 1
  SELECT COALESCE(MAX(number), 0) + 1 INTO next_number
  FROM invoices
  WHERE studio_id = studio_id_param;
  
  RETURN next_number;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_other_owners(p_user_id uuid, p_studio_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_other_owners_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_other_owners_count
  FROM users
  WHERE studio_id = p_studio_id
    AND role = 'owner'
    AND id != p_user_id;
    
  RETURN v_other_owners_count > 0;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_attendance_reminders()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    class_record RECORD;
    studio_record RECORD;
    class_datetime TIMESTAMP WITH TIME ZONE;
    current_datetime TIMESTAMP WITH TIME ZONE;
    notification_count INTEGER := 0;
    log_message TEXT;
BEGIN
    -- Log function start
    INSERT INTO function_logs (function_name, message, status)
    VALUES ('process_attendance_reminders', 'Starting attendance reminder check', 'INFO');

    -- Get all studios to process each in their own timezone
    FOR studio_record IN 
        SELECT 
            id AS studio_id,
            timezone
        FROM 
            studios
    LOOP
        -- Calculate current datetime in studio's timezone
        current_datetime := NOW() AT TIME ZONE studio_record.timezone;

        -- Find classes that need attendance reminders
        FOR class_record IN 
            SELECT 
                c.id AS class_id,
                c.name AS class_name,
                c.teacher_id,
                u.name AS teacher_name,  -- Using name instead of first_name || last_name
                c.studio_id,
                c.date,
                c.end_time
            FROM 
                classes c
                JOIN users u ON c.teacher_id = u.id
            WHERE 
                c.studio_id = studio_record.studio_id
                -- Class was today in the studio's timezone
                AND c.date = (current_datetime)::date
                -- Create a proper timestamp by combining date and end_time
                -- Then check if class has ended at least 1 hour ago
                AND (c.date + c.end_time) AT TIME ZONE studio_record.timezone < (current_datetime - INTERVAL '1 hour')
                -- Class ended within the last 24 hours
                AND (c.date + c.end_time) AT TIME ZONE studio_record.timezone > (current_datetime - INTERVAL '24 hours')
                -- No attendance records exist 
                -- Check through class_students junction table
                AND NOT EXISTS (
                    SELECT 1 
                    FROM attendance a
                    JOIN class_students cs ON a.class_student_id = cs.id
                    WHERE cs.class_id = c.id 
                    AND a.created_at::date = c.date
                )
                -- No notification sent in the last 2 hours for this class
                AND NOT EXISTS (
                    SELECT 1
                    FROM notifications n
                    WHERE n.entity_id = c.id
                    AND n.type = 'attendance_missing'
                    AND n.created_at > NOW() - INTERVAL '2 hours'
                )
        LOOP
            -- Calculate the full class end datetime for comparison
            class_datetime := (class_record.date + class_record.end_time) AT TIME ZONE studio_record.timezone;
            
            -- Notify the teacher
            INSERT INTO notifications (
                user_id,
                studio_id,
                type,
                title,
                message,
                priority,
                entity_id,
                entity_type,
                link,
                requires_action,
                email_required,
                email_sent,
                read,
                dismissed,
                created_at
            ) VALUES (
                class_record.teacher_id,
                class_record.studio_id,
                'attendance_missing',
                'Attendance Register Not Filled',
                'You have not filled the attendance register for ' || class_record.class_name,
                'high',
                class_record.class_id,
                'class',
                '/dashboard/classes/' || class_record.class_id || '/attendance',
                true,
                true,
                false,
                false,
                false,
                NOW()
            );
            
            notification_count := notification_count + 1;
            
            -- Log teacher notification
            log_message := 'Sent attendance reminder to teacher: ' || class_record.teacher_name || 
                          ' for class: ' || class_record.class_name || ' (ID: ' || class_record.class_id || ')';
                          
            INSERT INTO function_logs (function_name, message, details, status)
            VALUES ('process_attendance_reminders', log_message, 
                    json_build_object('class_id', class_record.class_id,
                                      'teacher_id', class_record.teacher_id,
                                      'studio_id', class_record.studio_id,
                                      'class_date', class_record.date,
                                      'end_time', class_record.end_time), 
                    'SUCCESS');
            
            -- After 4 hours, also notify studio owners
            -- Calculate hours since class ended
            IF class_datetime < (current_datetime - INTERVAL '4 hours') THEN
                INSERT INTO notifications (
                    user_id,
                    studio_id,
                    type,
                    title,
                    message,
                    priority,
                    entity_id,
                    entity_type,
                    link,
                    email_required,
                    email_sent,
                    read,
                    dismissed,
                    created_at
                )
                SELECT
                    u.id,
                    class_record.studio_id,
                    'attendance_missing',
                    'Attendance Register Not Filled',
                    class_record.teacher_name || ' has not filled the attendance register for ' || class_record.class_name,
                    'medium',
                    class_record.class_id,
                    'class',
                    '/dashboard/classes/' || class_record.class_id || '/attendance',
                    true,
                    false,
                    false,
                    false,
                    NOW()
                FROM
                    users u
                WHERE
                    u.studio_id = class_record.studio_id
                    AND u.role = 'owner';
                    
                -- Log owner notifications
                log_message := 'Sent escalated attendance reminder to owners for class: ' || 
                              class_record.class_name || ' (ID: ' || class_record.class_id || ')';
                              
                INSERT INTO function_logs (function_name, message, details, status)
                VALUES ('process_attendance_reminders', log_message, 
                       json_build_object('class_id', class_record.class_id,
                                         'studio_id', class_record.studio_id,
                                         'hours_since_end', 
                                         EXTRACT(EPOCH FROM (current_datetime - class_datetime))/3600), 
                       'SUCCESS');
            END IF;
        END LOOP;
    END LOOP;
    
    -- Log function completion
    INSERT INTO function_logs (function_name, message, details, status)
    VALUES ('process_attendance_reminders', 'Attendance reminder check completed', 
            json_build_object('notifications_created', notification_count), 'SUCCESS');
            
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO function_logs (function_name, message, details, status)
    VALUES ('process_attendance_reminders', 'Error in attendance reminder process: ' || SQLERRM, 
            json_build_object('error_detail', SQLSTATE), 'ERROR');
    RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_birthday_notifications()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    studio_record RECORD;
    student_record RECORD;
    notification_count INTEGER := 0;
    log_message TEXT;
BEGIN
    -- Log function start
    INSERT INTO function_logs (function_name, message, status)
    VALUES ('process_birthday_notifications', 'Starting birthday notification check', 'INFO');

    -- Process each studio with its own timezone
    FOR studio_record IN 
        SELECT 
            id AS studio_id,
            timezone
        FROM 
            studios
    LOOP
        -- Get all students with birthdays today in the studio's timezone
        FOR student_record IN 
            SELECT 
                s.id AS student_id,
                s.name AS student_name,
                s.studio_id
            FROM 
                students s
            WHERE 
                s.studio_id = studio_record.studio_id
                -- Check if today in studio's timezone matches student's birth month/day
                AND EXTRACT(MONTH FROM s.date_of_birth) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE studio_record.timezone))
                AND EXTRACT(DAY FROM s.date_of_birth) = EXTRACT(DAY FROM (NOW() AT TIME ZONE studio_record.timezone))
        LOOP
            -- Get all studio owners to notify
            INSERT INTO notifications (
                user_id,
                studio_id,
                type,
                title,
                message,
                priority,
                entity_id,
                entity_type,
                link,
                email_required,
                email_sent,
                read,
                dismissed,
                created_at
            )
            SELECT
                u.id,
                student_record.studio_id,
                'student_birthday',
                'Student Birthday',
                'Today is ' || student_record.student_name || '''s birthday!',
                'low',
                student_record.student_id,
                'student',
                '/dashboard/students/' || student_record.student_id,
                false,
                false,
                false,
                false,
                NOW()
            FROM
                users u
            WHERE
                u.studio_id = student_record.studio_id
                AND u.role = 'owner';
                
            -- Also notify teachers in the same studio
            INSERT INTO notifications (
                user_id,
                studio_id,
                type,
                title,
                message,
                priority,
                entity_id,
                entity_type,
                link,
                email_required,
                email_sent,
                read,
                dismissed,
                created_at
            )
            SELECT
                u.id,
                student_record.studio_id,
                'student_birthday',
                'Student Birthday',
                'Today is ' || student_record.student_name || '''s birthday!',
                'low',
                student_record.student_id,
                'student',
                '/dashboard/students/' || student_record.student_id,
                false,
                false,
                false,
                false,
                NOW()
            FROM
                users u
            WHERE
                u.studio_id = student_record.studio_id
                AND u.role = 'teacher';
                
            notification_count := notification_count + 1;
            
            -- Log each birthday notification
            log_message := 'Created birthday notification for student: ' || student_record.student_name || 
                          ' (ID: ' || student_record.student_id || ') in studio: ' || student_record.studio_id;
            
            INSERT INTO function_logs (function_name, message, details, status)
            VALUES ('process_birthday_notifications', log_message, 
                    json_build_object('student_id', student_record.student_id, 
                                      'studio_id', student_record.studio_id,
                                      'timezone', studio_record.timezone), 
                    'SUCCESS');
        END LOOP;
    END LOOP;
    
    -- Log function completion
    INSERT INTO function_logs (function_name, message, details, status)
    VALUES ('process_birthday_notifications', 'Birthday notification check completed', 
            json_build_object('notifications_created', notification_count), 'SUCCESS');
            
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO function_logs (function_name, message, details, status)
    VALUES ('process_birthday_notifications', 'Error in birthday notification process: ' || SQLERRM, 
            json_build_object('error_detail', SQLSTATE), 'ERROR');
    RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_overdue_payment_notifications()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    studio_record RECORD;
    invoice_record RECORD;
    days_overdue INTEGER;
    notification_count INTEGER := 0;
    log_message TEXT;
BEGIN
    -- Log function start
    INSERT INTO function_logs (function_name, message, status)
    VALUES ('process_overdue_payment_notifications', 'Starting payment overdue notification check', 'INFO');

    -- Process each studio with its own timezone
    FOR studio_record IN 
        SELECT 
            id AS studio_id,
            timezone,
            COALESCE(currency, 'USD') AS currency
        FROM 
            studios
    LOOP
        -- Find invoices for this studio that are overdue
        FOR invoice_record IN 
            SELECT 
                i.id AS invoice_id,
                i.parent_id,
                i.studio_id,
                i.total,
                i.due_date,
                i.status,
                -- Direct date subtraction already gives days as INTEGER
                ((NOW() AT TIME ZONE studio_record.timezone)::date - i.due_date) AS days_overdue
            FROM 
                invoices i
            WHERE 
                i.studio_id = studio_record.studio_id
                AND i.status != 'paid'
                AND i.due_date < (NOW() AT TIME ZONE studio_record.timezone)::date
                -- Don't send notifications for invoices already notified in the last 7 days
                AND NOT EXISTS (
                    SELECT 1 
                    FROM notifications n 
                    WHERE n.entity_id = i.id
                    AND n.type = 'payment_overdue'
                    AND n.created_at > NOW() - INTERVAL '7 days'
                )
        LOOP
            -- Calculate days overdue - don't need to cast it since it's already an integer
            days_overdue := invoice_record.days_overdue;
            
            -- Only send notifications on specific days overdue to avoid spamming
            -- Here we send on days 1, 3, 7, 14, 30, and every 30 days after
            IF days_overdue = 1 OR days_overdue = 3 OR days_overdue = 7 OR 
               days_overdue = 14 OR days_overdue = 30 OR days_overdue % 30 = 0 THEN
                
                -- Format currency based on studio's currency setting
                -- Notify the parent
                INSERT INTO notifications (
                    user_id,
                    studio_id,
                    type,
                    title,
                    message,
                    priority,
                    entity_id,
                    entity_type,
                    link,
                    requires_action,
                    email_required,
                    email_sent,
                    read,
                    dismissed,
                    created_at
                ) VALUES (
                    invoice_record.parent_id,
                    invoice_record.studio_id,
                    'payment_overdue',
                    'Payment Overdue',
                    'Your payment of ' || 
                    CASE 
                        WHEN studio_record.currency = 'USD' THEN '$'
                        WHEN studio_record.currency = 'EUR' THEN '€'
                        WHEN studio_record.currency = 'GBP' THEN '£'
                        ELSE studio_record.currency || ' '
                    END || 
                    invoice_record.total::text || ' is ' || days_overdue || ' days overdue',
                    CASE 
                        WHEN days_overdue > 30 THEN 'urgent'
                        WHEN days_overdue > 14 THEN 'high'
                        ELSE 'medium'
                    END,
                    invoice_record.invoice_id,
                    'invoice',
                    '/dashboard/billing/' || invoice_record.invoice_id,
                    true,
                    true,
                    false,
                    false,
                    false,
                    NOW()
                );
                
                notification_count := notification_count + 1;
                
                -- Log parent notification
                log_message := 'Sent payment overdue notification to parent for invoice ID: ' || 
                              invoice_record.invoice_id || ' (' || days_overdue || ' days overdue)';
                              
                INSERT INTO function_logs (function_name, message, details, status)
                VALUES ('process_overdue_payment_notifications', log_message, 
                        json_build_object('invoice_id', invoice_record.invoice_id,
                                          'parent_id', invoice_record.parent_id,
                                          'studio_id', invoice_record.studio_id,
                                          'days_overdue', days_overdue,
                                          'total', invoice_record.total), 
                        'SUCCESS');
                
                -- Also notify studio owners
                INSERT INTO notifications (
                    user_id,
                    studio_id,
                    type,
                    title,
                    message,
                    priority,
                    entity_id,
                    entity_type,
                    link,
                    email_required,
                    email_sent,
                    read,
                    dismissed,
                    created_at
                )
                SELECT
                    u.id,
                    invoice_record.studio_id,
                    'payment_overdue',
                    'Customer Payment Overdue',
                    'Payment of ' || 
                    CASE 
                        WHEN studio_record.currency = 'USD' THEN '$'
                        WHEN studio_record.currency = 'EUR' THEN '€'
                        WHEN studio_record.currency = 'GBP' THEN '£'
                        ELSE studio_record.currency || ' '
                    END || 
                    invoice_record.total::text || ' is ' || days_overdue || ' days overdue',
                    CASE 
                        WHEN days_overdue > 30 THEN 'high'
                        ELSE 'medium'
                    END,
                    invoice_record.invoice_id,
                    'invoice',
                    '/dashboard/billing/' || invoice_record.invoice_id,
                    false,
                    days_overdue > 14,
                    false,
                    false,
                    false,
                    NOW()
                FROM
                    users u
                WHERE
                    u.studio_id = invoice_record.studio_id
                    AND u.role = 'owner';
                    
                -- Log owner notifications
                log_message := 'Sent payment overdue notification to owners for invoice ID: ' || 
                              invoice_record.invoice_id || ' (' || days_overdue || ' days overdue)';
                              
                INSERT INTO function_logs (function_name, message, details, status)
                VALUES ('process_overdue_payment_notifications', log_message, 
                        json_build_object('invoice_id', invoice_record.invoice_id,
                                          'studio_id', invoice_record.studio_id,
                                          'days_overdue', days_overdue), 
                        'SUCCESS');
            END IF;
        END LOOP;
    END LOOP;
    
    -- Log function completion
    INSERT INTO function_logs (function_name, message, details, status)
    VALUES ('process_overdue_payment_notifications', 'Payment overdue notification check completed', 
            json_build_object('notifications_created', notification_count), 'SUCCESS');
            
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO function_logs (function_name, message, details, status)
    VALUES ('process_overdue_payment_notifications', 'Error in payment overdue notification process: ' || SQLERRM, 
            json_build_object('error_detail', SQLSTATE), 'ERROR');
    RAISE;
END;
$function$
;

create or replace view "public"."recent_function_logs" as  SELECT function_logs.id,
    function_logs.function_name,
    function_logs.message,
    function_logs.details,
    function_logs.status,
    function_logs.created_at
   FROM function_logs
  ORDER BY function_logs.created_at DESC
 LIMIT 1000;


CREATE OR REPLACE FUNCTION public.set_invoice_index()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Get the next index for the studio
  select coalesce(max(index), 0) + 1
  into new.index
  from invoices
  where studio_id = new.studio_id;
  
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update the conversations table with the last message and timestamp
  UPDATE conversations
  SET 
    last_message = NEW.content,
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  -- Notify subscribers with the new message data
  PERFORM pg_notify('new_message', row_to_json(NEW)::text);

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_channel_studio_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Ensure the creator belongs to the studio
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.created_by 
    AND studio_id = NEW.studio_id
  ) THEN
    RAISE EXCEPTION 'Channel creator must belong to the same studio';
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_channel_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  associated_channel_id UUID;
BEGIN
  -- Get the channel_id from the associated post
  SELECT channel_id INTO associated_channel_id
  FROM channel_posts
  WHERE id = NEW.id;
  
  -- Update the channel's timestamp
  IF associated_channel_id IS NOT NULL THEN
    UPDATE class_channels
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = associated_channel_id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."document_recipients" to "anon";

grant insert on table "public"."document_recipients" to "anon";

grant references on table "public"."document_recipients" to "anon";

grant select on table "public"."document_recipients" to "anon";

grant trigger on table "public"."document_recipients" to "anon";

grant truncate on table "public"."document_recipients" to "anon";

grant update on table "public"."document_recipients" to "anon";

grant delete on table "public"."document_recipients" to "authenticated";

grant insert on table "public"."document_recipients" to "authenticated";

grant references on table "public"."document_recipients" to "authenticated";

grant select on table "public"."document_recipients" to "authenticated";

grant trigger on table "public"."document_recipients" to "authenticated";

grant truncate on table "public"."document_recipients" to "authenticated";

grant update on table "public"."document_recipients" to "authenticated";

grant delete on table "public"."document_recipients" to "service_role";

grant insert on table "public"."document_recipients" to "service_role";

grant references on table "public"."document_recipients" to "service_role";

grant select on table "public"."document_recipients" to "service_role";

grant trigger on table "public"."document_recipients" to "service_role";

grant truncate on table "public"."document_recipients" to "service_role";

grant update on table "public"."document_recipients" to "service_role";

grant delete on table "public"."documents" to "anon";

grant insert on table "public"."documents" to "anon";

grant references on table "public"."documents" to "anon";

grant select on table "public"."documents" to "anon";

grant trigger on table "public"."documents" to "anon";

grant truncate on table "public"."documents" to "anon";

grant update on table "public"."documents" to "anon";

grant delete on table "public"."documents" to "authenticated";

grant insert on table "public"."documents" to "authenticated";

grant references on table "public"."documents" to "authenticated";

grant select on table "public"."documents" to "authenticated";

grant trigger on table "public"."documents" to "authenticated";

grant truncate on table "public"."documents" to "authenticated";

grant update on table "public"."documents" to "authenticated";

grant delete on table "public"."documents" to "service_role";

grant insert on table "public"."documents" to "service_role";

grant references on table "public"."documents" to "service_role";

grant select on table "public"."documents" to "service_role";

grant trigger on table "public"."documents" to "service_role";

grant truncate on table "public"."documents" to "service_role";

grant update on table "public"."documents" to "service_role";

grant delete on table "public"."drop_in_bookings" to "anon";

grant insert on table "public"."drop_in_bookings" to "anon";

grant references on table "public"."drop_in_bookings" to "anon";

grant select on table "public"."drop_in_bookings" to "anon";

grant trigger on table "public"."drop_in_bookings" to "anon";

grant truncate on table "public"."drop_in_bookings" to "anon";

grant update on table "public"."drop_in_bookings" to "anon";

grant delete on table "public"."drop_in_bookings" to "authenticated";

grant insert on table "public"."drop_in_bookings" to "authenticated";

grant references on table "public"."drop_in_bookings" to "authenticated";

grant select on table "public"."drop_in_bookings" to "authenticated";

grant trigger on table "public"."drop_in_bookings" to "authenticated";

grant truncate on table "public"."drop_in_bookings" to "authenticated";

grant update on table "public"."drop_in_bookings" to "authenticated";

grant delete on table "public"."drop_in_bookings" to "service_role";

grant insert on table "public"."drop_in_bookings" to "service_role";

grant references on table "public"."drop_in_bookings" to "service_role";

grant select on table "public"."drop_in_bookings" to "service_role";

grant trigger on table "public"."drop_in_bookings" to "service_role";

grant truncate on table "public"."drop_in_bookings" to "service_role";

grant update on table "public"."drop_in_bookings" to "service_role";

grant delete on table "public"."function_logs" to "anon";

grant insert on table "public"."function_logs" to "anon";

grant references on table "public"."function_logs" to "anon";

grant select on table "public"."function_logs" to "anon";

grant trigger on table "public"."function_logs" to "anon";

grant truncate on table "public"."function_logs" to "anon";

grant update on table "public"."function_logs" to "anon";

grant delete on table "public"."function_logs" to "authenticated";

grant insert on table "public"."function_logs" to "authenticated";

grant references on table "public"."function_logs" to "authenticated";

grant select on table "public"."function_logs" to "authenticated";

grant trigger on table "public"."function_logs" to "authenticated";

grant truncate on table "public"."function_logs" to "authenticated";

grant update on table "public"."function_logs" to "authenticated";

grant delete on table "public"."function_logs" to "service_role";

grant insert on table "public"."function_logs" to "service_role";

grant references on table "public"."function_logs" to "service_role";

grant select on table "public"."function_logs" to "service_role";

grant trigger on table "public"."function_logs" to "service_role";

grant truncate on table "public"."function_logs" to "service_role";

grant update on table "public"."function_logs" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."user_preferences" to "anon";

grant insert on table "public"."user_preferences" to "anon";

grant references on table "public"."user_preferences" to "anon";

grant select on table "public"."user_preferences" to "anon";

grant trigger on table "public"."user_preferences" to "anon";

grant truncate on table "public"."user_preferences" to "anon";

grant update on table "public"."user_preferences" to "anon";

grant delete on table "public"."user_preferences" to "authenticated";

grant insert on table "public"."user_preferences" to "authenticated";

grant references on table "public"."user_preferences" to "authenticated";

grant select on table "public"."user_preferences" to "authenticated";

grant trigger on table "public"."user_preferences" to "authenticated";

grant truncate on table "public"."user_preferences" to "authenticated";

grant update on table "public"."user_preferences" to "authenticated";

grant delete on table "public"."user_preferences" to "service_role";

grant insert on table "public"."user_preferences" to "service_role";

grant references on table "public"."user_preferences" to "service_role";

grant select on table "public"."user_preferences" to "service_role";

grant trigger on table "public"."user_preferences" to "service_role";

grant truncate on table "public"."user_preferences" to "service_role";

grant update on table "public"."user_preferences" to "service_role";

create policy "Users can see members of their channels"
on "public"."channel_members"
as permissive
for select
to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (class_channels cc
     JOIN users u ON ((u.studio_id = ( SELECT u.studio_id
           FROM class_channels
          WHERE (class_channels.id = channel_members.channel_id)))))
  WHERE (u.id = auth.uid())))));


create policy "Authenticated users can create posts"
on "public"."channel_posts"
as permissive
for insert
to authenticated
with check (true);


create policy "Users can see posts in channels they're members of"
on "public"."channel_posts"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM channel_members cm
  WHERE ((cm.channel_id = channel_posts.channel_id) AND (cm.user_id = auth.uid())))));


create policy "Users can only see their own conversation participants"
on "public"."conversation_participants"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "Users can delete their own messages"
on "public"."messages"
as permissive
for delete
to public
using ((sender_id = auth.uid()));


create policy "Users can insert messages in their conversations"
on "public"."messages"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM conversation_participants cp
  WHERE ((cp.conversation_id = messages.conversation_id) AND (cp.user_id = auth.uid())))));


create policy "Users can read messages in their conversations"
on "public"."messages"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM conversation_participants cp
  WHERE ((cp.conversation_id = messages.conversation_id) AND (cp.user_id = auth.uid())))));


create policy "Users can update their own messages"
on "public"."messages"
as permissive
for update
to public
using ((sender_id = auth.uid()))
with check ((sender_id = auth.uid()));


create policy "Users can access their own payment methods"
on "public"."payment_methods"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "Users can create comments"
on "public"."post_comments"
as permissive
for insert
to public
with check ((auth.uid() = author_id));


create policy "Users can see comments in channels they're members of"
on "public"."post_comments"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (channel_posts cp
     JOIN channel_members cm ON ((cm.channel_id = cp.channel_id)))
  WHERE ((cp.id = post_comments.post_id) AND (cm.user_id = auth.uid())))));


create policy "Users can see reactions in channels they're members of"
on "public"."post_reactions"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (channel_posts cp
     JOIN channel_members cm ON ((cm.channel_id = cp.channel_id)))
  WHERE ((cp.id = post_reactions.post_id) AND (cm.user_id = auth.uid())))));


create policy "Users can insert their own preferences"
on "public"."user_preferences"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own preferences"
on "public"."user_preferences"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own preferences"
on "public"."user_preferences"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Channel admins can manage members"
on "public"."channel_members"
as permissive
for all
to public
using (((EXISTS ( SELECT 1
   FROM channel_members cm
  WHERE ((cm.channel_id = channel_members.channel_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM class_channels cc
  WHERE ((cc.id = channel_members.channel_id) AND (cc.created_by = auth.uid()))))));


create policy "Authors can manage media"
on "public"."post_media"
as permissive
for all
to authenticated
using ((auth.uid() IS NOT NULL))
with check ((auth.uid() IS NOT NULL));


CREATE TRIGGER set_invoice_index_trigger BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION set_invoice_index();

CREATE TRIGGER update_conversation_last_message_trigger AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

CREATE TRIGGER on_user_created AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION create_default_user_preferences();


