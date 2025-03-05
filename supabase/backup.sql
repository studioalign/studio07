-- Changes made after this backup (2024-01-22):

/*
1. Unified Users Table (20250122000000_unified_users.sql)
   - Created a single users table to replace separate owners, teachers, and parents tables
   - Added user_role enum type ('owner', 'teacher', 'student', 'parent')
   - Direct link to auth.users via id
   - Added studio_id with constraint (NULL for owners, required for teachers/parents)
   - Migrated all existing users from old tables
   - Updated foreign key references in studios, classes, and students tables
   - Added appropriate RLS policies for data access
   - Added helper functions:
     * is_studio_owner(p_studio_id)
     * is_studio_teacher(p_studio_id)
     * get_user_role()
     * has_role(required_role)
     * get_user_studio()

2. Function Fixes (20250122000001_fix_functions.sql)
   - Removed unused channel-related functions:
     * assign_role
     * remove_role
     * update_role
   - Fixed ambiguous column references in:
     * generate_dates: renamed date column to curr_date
     * generate_invoice_number: added table alias and p_ prefix
   - Updated cleanup_old_instances:
     * Now checks class_modifications and class_students
     * Removed reference to non-existent instance_students table
   - Added class_modifications table and functions:
     * Created table with RLS policies
     * Fixed modify_class_instance function
     * Fixed modify_future_class_instances function

Reasons for Changes:
1. Authentication Simplification:
   - Single source of truth for user data
   - Easier role management and access control
   - Simplified queries and relationships
   - Better data consistency

2. Function Improvements:
   - Removed unused code to reduce maintenance burden
   - Fixed ambiguous column references for better reliability
   - Updated cleanup logic to use correct tables
   - Improved modification tracking for class instances

Migration Strategy:
1. Backup created before changes
2. New migrations preserve all existing data
3. Foreign key relationships updated automatically
4. RLS policies ensure data security maintained
*/

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."class_status" AS ENUM (
    'scheduled',
    'cancelled',
    'completed'
);


ALTER TYPE "public"."class_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_admin_to_the_channel"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Add teacher as admin
  INSERT INTO channel_members (channel_id, user_id, role)
  SELECT 
    NEW.id,
    t.user_id,
    'admin'
  FROM classes c
  JOIN teachers t ON c.teacher_id = t.id
  WHERE c.id = NEW.class_id
  ON CONFLICT DO NOTHING;

  -- Add students as members
  INSERT INTO channel_members (channel_id, user_id, role)
  SELECT 
    NEW.id,
    p.user_id,
    'member'
  FROM class_students cs
  JOIN students s ON cs.student_id = s.id
  JOIN parents p ON s.parent_id = p.id
  WHERE cs.class_id = NEW.class_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_admin_to_the_channel"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_channel_members"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Prevent infinite recursion by checking the trigger depth
  IF (pg_trigger_depth() > 1) THEN
    RETURN NEW;
  END IF;

  -- Add teacher as admin
  INSERT INTO channel_members (channel_id, user_id, role)
  SELECT 
    NEW.id,
    t.user_id,
    'admin'
  FROM classes c
  JOIN teachers t ON c.teacher_id = t.id
  WHERE c.id = NEW.class_id
  ON CONFLICT DO NOTHING;

  -- Add students as members
  INSERT INTO channel_members (channel_id, user_id, role)
  SELECT 
    NEW.id,
    p.user_id,
    'member'
  FROM class_students cs
  JOIN students s ON cs.student_id = s.id
  JOIN parents p ON s.parent_id = p.id
  WHERE cs.class_id = NEW.class_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_channel_members"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_role"("channel_id" "uuid", "user_id" "uuid", "role" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM channel_roles
        WHERE channel_id = channel_id AND user_id = user_id
    ) THEN
        RAISE EXCEPTION 'User already has a role in this channel';
    END IF;
    
    INSERT INTO channel_roles (channel_id, user_id, role)
    VALUES (channel_id, user_id, role);
END;
$$;


ALTER FUNCTION "public"."assign_role"("channel_id" "uuid", "user_id" "uuid", "role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_update_class_instances"("target_class_id" "uuid", "target_date" "date", "modification_scope" "text", "updated_name" "text", "updated_teacher_id" "uuid", "updated_location_id" "uuid", "updated_start_time" time without time zone, "updated_end_time" time without time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF modification_scope = 'future' THEN
    -- Update this and future instances
    UPDATE class_instances
    SET
      name = updated_name,
      teacher_id = updated_teacher_id,
      location_id = updated_location_id,
      start_time = updated_start_time,
      end_time = updated_end_time,
      updated_at = now()
    WHERE 
      class_id = target_class_id
      AND date >= target_date;
  ELSIF modification_scope = 'all' THEN
    -- Update all instances
    UPDATE class_instances
    SET
      name = updated_name,
      teacher_id = updated_teacher_id,
      location_id = updated_location_id,
      start_time = updated_start_time,
      end_time = updated_end_time,
      updated_at = now()
    WHERE 
      class_id = target_class_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."bulk_update_class_instances"("target_class_id" "uuid", "target_date" "date", "modification_scope" "text", "updated_name" "text", "updated_teacher_id" "uuid", "updated_location_id" "uuid", "updated_start_time" time without time zone, "updated_end_time" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_invoice_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Calculate totals from invoice items
  WITH totals AS (
    SELECT 
      SUM(subtotal) as items_subtotal,
      SUM(tax) as items_tax,
      SUM(total) as items_total
    FROM invoice_items
    WHERE invoice_id = NEW.id
  )
  UPDATE invoices
  SET 
    subtotal = totals.items_subtotal,
    tax = totals.items_tax,
    total = totals.items_total
  FROM totals
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_invoice_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_instances"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Delete unattended instances older than 30 days
  DELETE FROM class_instances
  WHERE date < CURRENT_DATE - INTERVAL '30 days'
    AND status = 'scheduled'
    AND NOT EXISTS (
      SELECT 1 
      FROM attendance 
      WHERE attendance.class_instance_id = class_instances.id
    );
END;
$$;


ALTER FUNCTION "public"."cleanup_old_instances"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_instances"() IS 'Run this function periodically to clean up old unattended class instances';



CREATE OR REPLACE FUNCTION "public"."create_class_instances"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_recurring THEN
    RAISE NOTICE 'Creating class_instances for recurring class ID: %, from % to %', NEW.id, NEW.date, NEW.end_date;
    -- Logic to create multiple class_instances based on recurrence
    INSERT INTO class_instances (class_id, date, status, name, teacher_id, location_id, start_time, end_time)
    SELECT NEW.id, gs.date, 'scheduled', NEW.name, NEW.teacher_id, NEW.location_id, NEW.start_time, NEW.end_time
    FROM generate_series(NEW.date, NEW.end_date, '1 week'::interval) AS gs(date)
    ON CONFLICT (class_id, date) DO NOTHING;
  ELSE
    RAISE NOTICE 'Creating class_instance for one-off class ID: %, on %', NEW.id, NEW.date;
    -- Logic to create a single class_instance for one-off classes
    INSERT INTO class_instances (class_id, date, status, name, teacher_id, location_id, start_time, end_time)
    VALUES (NEW.id, NEW.date, 'scheduled', NEW.name, NEW.teacher_id, NEW.location_id, NEW.start_time, NEW.end_time)
    ON CONFLICT (class_id, date) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_class_instances"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_conversation"("participant_ids" "uuid"[], "created_by" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    conversation_id UUID;
BEGIN
    -- Insert into conversations
    INSERT INTO conversations (created_by, participant_ids)
    VALUES (created_by, participant_ids)
    RETURNING id INTO conversation_id;

    -- Populate conversation_participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    SELECT conversation_id, UNNEST(participant_ids);

    RETURN conversation_id;
END;
$$;


ALTER FUNCTION "public"."create_conversation"("participant_ids" "uuid"[], "created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_instance_enrollments"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Create enrollments from class_students
  INSERT INTO instance_enrollments (class_instance_id, student_id)
  SELECT NEW.id, cs.student_id
  FROM class_students cs
  WHERE cs.class_id = NEW.class_id
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_instance_enrollments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_dates"("start_date" "date", "end_date" "date", "day_of_week" integer) RETURNS TABLE("date" "date")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dates AS (
    -- Find first occurrence of day_of_week on or after start_date
    SELECT start_date + ((day_of_week - EXTRACT(DOW FROM start_date) + 7) % 7)::integer AS date
    WHERE start_date + ((day_of_week - EXTRACT(DOW FROM start_date) + 7) % 7)::integer <= end_date
    UNION ALL
    SELECT date + 7
    FROM dates
    WHERE date + 7 <= end_date
  )
  SELECT d.date FROM dates d ORDER BY date;
END;
$$;


ALTER FUNCTION "public"."generate_dates"("start_date" "date", "end_date" "date", "day_of_week" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invoice_number"("studio_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  year text;
  next_number integer;
  invoice_number text;
BEGIN
  year := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^INV-' || year || '-', ''), '')), '0')::integer + 1
  INTO next_number
  FROM invoices
  WHERE studio_id = $1
  AND number LIKE 'INV-' || year || '-%';
  
  invoice_number := 'INV-' || year || '-' || LPAD(next_number::text, 6, '0');
  
  RETURN invoice_number;
END;
$_$;


ALTER FUNCTION "public"."generate_invoice_number"("studio_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (NEW.id, 'parent', NEW.email); -- Default role and name
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_unread_messages"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
  AND user_id != NEW.sender_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_unread_messages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_messages_as_read"("p_conversation_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE conversation_participants
  SET 
    unread_count = 0,
    last_read_at = CURRENT_TIMESTAMP
  WHERE conversation_id = p_conversation_id
  AND user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."mark_messages_as_read"("p_conversation_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."modify_class_instance"("p_class_id" "uuid", "p_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_instance_id uuid;
BEGIN
  -- Get the instance ID
  SELECT id INTO v_instance_id
  FROM class_instances
  WHERE class_id = p_class_id AND date = p_date;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class instance not found';
  END IF;

  -- Create modification record
  INSERT INTO class_modifications (
    class_instance_id,
    name,
    teacher_id,
    start_time,
    end_time
  ) VALUES (
    v_instance_id,
    p_name,
    p_teacher_id,
    p_start_time,
    p_end_time
  );
END;
$$;


ALTER FUNCTION "public"."modify_class_instance"("p_class_id" "uuid", "p_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."modify_class_instance"("p_class_id" "uuid", "p_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_location_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_instance_id uuid;
BEGIN
  -- Get or create the instance
  SELECT id INTO v_instance_id
  FROM class_instances
  WHERE class_id = p_class_id AND date = p_date;

  IF NOT FOUND THEN
    INSERT INTO class_instances (class_id, date)
    VALUES (p_class_id, p_date)
    RETURNING id INTO v_instance_id;
  END IF;

  -- Update the instance with new values
  UPDATE class_instances SET
    name = p_name,
    teacher_id = p_teacher_id,
    location_id = p_location_id,
    start_time = p_start_time,
    end_time = p_end_time
  WHERE id = v_instance_id;
END;
$$;


ALTER FUNCTION "public"."modify_class_instance"("p_class_id" "uuid", "p_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_location_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."modify_future_class_instances"("p_class_id" "uuid", "p_from_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_instance record;
BEGIN
  -- Create modifications for all future instances
  FOR v_instance IN 
    SELECT id 
    FROM class_instances 
    WHERE class_id = p_class_id 
    AND date >= p_from_date
  LOOP
    INSERT INTO class_modifications (
      class_instance_id,
      name,
      teacher_id,
      start_time,
      end_time
    ) VALUES (
      v_instance.id,
      p_name,
      p_teacher_id,
      p_start_time,
      p_end_time
    );
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."modify_future_class_instances"("p_class_id" "uuid", "p_from_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."modify_future_class_instances"("p_class_id" "uuid", "p_from_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_location_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update all future instances
  UPDATE class_instances SET
    name = p_name,
    teacher_id = p_teacher_id,
    location_id = p_location_id,
    start_time = p_start_time,
    end_time = p_end_time
  WHERE class_id = p_class_id 
  AND date >= p_from_date;
END;
$$;


ALTER FUNCTION "public"."modify_future_class_instances"("p_class_id" "uuid", "p_from_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_location_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_role"("channel_id" "uuid", "user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM channel_roles
    WHERE channel_id = channel_id AND user_id = user_id;
END;
$$;


ALTER FUNCTION "public"."remove_role"("channel_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_channel_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE class_channels
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_channel_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_participants_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_participants_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE conversations
  SET 
    updated_at = CURRENT_TIMESTAMP,
    last_message = NEW.content,
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoice_status_on_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update invoice status based on payment
  IF NEW.status = 'completed' THEN
    UPDATE invoices
    SET status = 
      CASE 
        WHEN (
          SELECT COALESCE(SUM(amount), 0) 
          FROM payments 
          WHERE invoice_id = NEW.invoice_id 
          AND status = 'completed'
        ) >= total THEN 'paid'
        ELSE status
      END
    WHERE id = NEW.invoice_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_invoice_status_on_payment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_participant_ids"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE conversations
    SET participant_ids = ARRAY(
        SELECT user_id
        FROM conversation_participants
        WHERE conversation_id = NEW.conversation_id
    )
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_participant_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payment_status_on_refund"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE payments
    SET status = 'refunded'
    WHERE id = NEW.payment_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_payment_status_on_refund"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_role"("channel_id" "uuid", "user_id" "uuid", "role" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE channel_roles
    SET role = role
    WHERE channel_id = channel_id AND user_id = user_id;
END;
$$;


ALTER FUNCTION "public"."update_role"("channel_id" "uuid", "user_id" "uuid", "role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_class_dates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- For non-recurring classes
  IF NOT NEW.is_recurring THEN
    IF NEW.date IS NULL THEN
      RAISE EXCEPTION 'Date is required for non-recurring classes';
    END IF;
    -- For non-recurring classes, end_date should equal date
    NEW.end_date = NEW.date;
  -- For recurring classes
  ELSE
    IF NEW.day_of_week IS NULL THEN
      RAISE EXCEPTION 'Day of week is required for recurring classes';
    END IF;
    IF NEW.end_date IS NULL THEN
      RAISE EXCEPTION 'End date is required for recurring classes';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_class_dates"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instance_enrollment_id" "uuid",
    "status" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "attendance_status_check" CHECK (("status" = ANY (ARRAY['present'::"text", 'late'::"text", 'authorised'::"text", 'unauthorised'::"text"])))
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channel_members" (
    "channel_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "channel_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."channel_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."channel_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "channel_id" "uuid",
    "author_id" "uuid",
    "content" "text" NOT NULL,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."channel_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_channels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."class_channels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid",
    "date" "date" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "teacher_id" "uuid",
    "location_id" "uuid",
    "start_time" time without time zone,
    "end_time" time without time zone,
    CONSTRAINT "class_instances_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."class_instances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_instances_backup" (
    "id" "uuid",
    "class_id" "uuid",
    "date" "date",
    "status" "text",
    "notes" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name" "text",
    "teacher_id" "uuid",
    "location_id" "uuid",
    "start_time" time without time zone,
    "end_time" time without time zone
);


ALTER TABLE "public"."class_instances_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_students" (
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."class_students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_students_backup" (
    "class_id" "uuid",
    "student_id" "uuid",
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."class_students_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "studio_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "day_of_week" integer,
    "is_recurring" boolean DEFAULT true,
    "date" "date",
    "location_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "end_date" "date" NOT NULL,
    CONSTRAINT "recurring_or_date" CHECK (((("is_recurring" = true) AND ("day_of_week" IS NOT NULL) AND ("date" IS NOT NULL)) OR (("is_recurring" = false) AND ("date" IS NOT NULL) AND ("day_of_week" IS NULL)))),
    CONSTRAINT "valid_class_dates" CHECK ((("is_recurring" = true) OR (("is_recurring" = false) AND ("date" <= "end_date")))),
    CONSTRAINT "valid_day_of_week" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6))),
    CONSTRAINT "valid_times" CHECK (("start_time" < "end_time"))
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes_backup" (
    "id" "uuid",
    "studio_id" "uuid",
    "name" "text",
    "teacher_id" "uuid",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "day_of_week" integer,
    "is_recurring" boolean,
    "date" "date",
    "location_id" "uuid",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "end_date" "date"
);


ALTER TABLE "public"."classes_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "unread_count" integer DEFAULT 0,
    "last_read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "last_message" "text",
    "last_message_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "participant_ids" "uuid"[]
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instance_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_instance_id" "uuid",
    "student_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."instance_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid",
    "student_id" "uuid",
    "description" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric NOT NULL,
    "subtotal" numeric NOT NULL,
    "tax" numeric DEFAULT 0 NOT NULL,
    "total" numeric NOT NULL,
    "type" "text" NOT NULL,
    "plan_enrollment_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invoice_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "invoice_items_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "invoice_items_tax_check" CHECK (("tax" >= (0)::numeric)),
    CONSTRAINT "invoice_items_total_check" CHECK (("total" >= (0)::numeric)),
    CONSTRAINT "invoice_items_type_check" CHECK (("type" = ANY (ARRAY['tuition'::"text", 'costume'::"text", 'registration'::"text", 'other'::"text"]))),
    CONSTRAINT "invoice_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "studio_id" "uuid",
    "parent_id" "uuid",
    "number" "text" NOT NULL,
    "status" "text" NOT NULL,
    "due_date" "date" NOT NULL,
    "subtotal" numeric NOT NULL,
    "tax" numeric DEFAULT 0 NOT NULL,
    "total" numeric NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'paid'::"text", 'overdue'::"text", 'cancelled'::"text", 'refunded'::"text"]))),
    CONSTRAINT "invoices_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "invoices_tax_check" CHECK (("tax" >= (0)::numeric)),
    CONSTRAINT "invoices_total_check" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "studio_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "edited_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."owners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."owners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "studio_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."parents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid",
    "type" "text" NOT NULL,
    "last_four" "text" NOT NULL,
    "expiry_month" integer,
    "expiry_year" integer,
    "is_default" boolean DEFAULT false,
    "stripe_payment_method_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_methods_type_check" CHECK (("type" = ANY (ARRAY['card'::"text", 'bank_account'::"text"])))
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_enrollment_id" "uuid",
    "due_date" "date" NOT NULL,
    "amount" numeric NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_schedules_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "payment_schedules_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."payment_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid",
    "amount" numeric NOT NULL,
    "payment_method" "text" NOT NULL,
    "status" "text" NOT NULL,
    "transaction_id" "text",
    "payment_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payments_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid",
    "student_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "plan_enrollments_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."plan_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid",
    "author_id" "uuid",
    "content" "text" NOT NULL,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid",
    "url" "text" NOT NULL,
    "type" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "post_media_type_check" CHECK (("type" = ANY (ARRAY['image'::"text", 'video'::"text", 'file'::"text"])))
);


ALTER TABLE "public"."post_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_reactions" (
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "studio_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "amount" numeric NOT NULL,
    "interval" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pricing_plans_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "pricing_plans_interval_check" CHECK (("interval" = ANY (ARRAY['weekly'::"text", 'monthly'::"text", 'term'::"text", 'annual'::"text"])))
);


ALTER TABLE "public"."pricing_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."refunds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid",
    "amount" numeric NOT NULL,
    "reason" "text" NOT NULL,
    "status" "text" NOT NULL,
    "refund_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "refunds_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "refunds_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."refunds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parent_id" "uuid" NOT NULL,
    "studio_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "date_of_birth" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."studios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."studios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teachers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "studio_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teachers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_instance_enrollment_id_key" UNIQUE ("instance_enrollment_id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_pkey" PRIMARY KEY ("channel_id", "user_id");



ALTER TABLE ONLY "public"."channel_posts"
    ADD CONSTRAINT "channel_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_channels"
    ADD CONSTRAINT "class_channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_instances"
    ADD CONSTRAINT "class_instances_class_id_date_unique" UNIQUE ("class_id", "date");



ALTER TABLE ONLY "public"."class_instances"
    ADD CONSTRAINT "class_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_pkey" PRIMARY KEY ("class_id", "student_id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instance_enrollments"
    ADD CONSTRAINT "instance_enrollments_class_instance_id_student_id_key" UNIQUE ("class_instance_id", "student_id");



ALTER TABLE ONLY "public"."instance_enrollments"
    ADD CONSTRAINT "instance_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_studio_id_number_key" UNIQUE ("studio_id", "number");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "owners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parents"
    ADD CONSTRAINT "parents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_schedules"
    ADD CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan_enrollments"
    ADD CONSTRAINT "plan_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_media"
    ADD CONSTRAINT "post_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("post_id", "user_id");



ALTER TABLE ONLY "public"."pricing_plans"
    ADD CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."studios"
    ADD CONSTRAINT "studios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "unique_class_student" UNIQUE ("class_id", "student_id");



CREATE INDEX "idx_attendance_enrollment" ON "public"."attendance" USING "btree" ("instance_enrollment_id");



CREATE INDEX "idx_channel_members_composite" ON "public"."channel_members" USING "btree" ("channel_id", "user_id", "role");



CREATE INDEX "idx_channel_members_user" ON "public"."channel_members" USING "btree" ("user_id");



CREATE INDEX "idx_channel_posts_channel" ON "public"."channel_posts" USING "btree" ("channel_id");



CREATE INDEX "idx_class_channels_class" ON "public"."class_channels" USING "btree" ("class_id");



CREATE INDEX "idx_class_channels_class_id" ON "public"."class_channels" USING "btree" ("class_id");



CREATE INDEX "idx_class_instances_class_date" ON "public"."class_instances" USING "btree" ("class_id", "date");



CREATE INDEX "idx_class_instances_class_status" ON "public"."class_instances" USING "btree" ("class_id", "status");



CREATE INDEX "idx_class_instances_composite" ON "public"."class_instances" USING "btree" ("class_id", "date", "teacher_id", "location_id");



CREATE INDEX "idx_class_instances_date" ON "public"."class_instances" USING "btree" ("date");



CREATE INDEX "idx_class_instances_location" ON "public"."class_instances" USING "btree" ("location_id");



CREATE INDEX "idx_class_instances_teacher" ON "public"."class_instances" USING "btree" ("teacher_id");



CREATE INDEX "idx_class_students_class" ON "public"."class_students" USING "btree" ("class_id");



CREATE INDEX "idx_class_students_student" ON "public"."class_students" USING "btree" ("student_id");



CREATE INDEX "idx_classes_teacher_id" ON "public"."classes" USING "btree" ("teacher_id");



CREATE INDEX "idx_conversation_participants_composite" ON "public"."conversation_participants" USING "btree" ("conversation_id", "user_id");



CREATE INDEX "idx_conversation_participants_user" ON "public"."conversation_participants" USING "btree" ("user_id");



CREATE INDEX "idx_conversations_updated_at" ON "public"."conversations" USING "btree" ("updated_at");



CREATE INDEX "idx_instance_enrollments_composite" ON "public"."instance_enrollments" USING "btree" ("class_instance_id", "student_id");



CREATE INDEX "idx_instance_enrollments_instance" ON "public"."instance_enrollments" USING "btree" ("class_instance_id");



CREATE INDEX "idx_instance_enrollments_student" ON "public"."instance_enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_invoice_items_invoice" ON "public"."invoice_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoice_items_student" ON "public"."invoice_items" USING "btree" ("student_id");



CREATE INDEX "idx_invoices_parent" ON "public"."invoices" USING "btree" ("parent_id");



CREATE INDEX "idx_invoices_studio" ON "public"."invoices" USING "btree" ("studio_id");



CREATE INDEX "idx_messages_conversation" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_sender" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_payment_methods_parent" ON "public"."payment_methods" USING "btree" ("parent_id");



CREATE INDEX "idx_payment_schedules_enrollment" ON "public"."payment_schedules" USING "btree" ("plan_enrollment_id");



CREATE INDEX "idx_payments_invoice" ON "public"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_plan_enrollments_plan" ON "public"."plan_enrollments" USING "btree" ("plan_id");



CREATE INDEX "idx_plan_enrollments_student" ON "public"."plan_enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_post_comments_post" ON "public"."post_comments" USING "btree" ("post_id");



CREATE INDEX "idx_post_media_post" ON "public"."post_media" USING "btree" ("post_id");



CREATE INDEX "idx_pricing_plans_studio" ON "public"."pricing_plans" USING "btree" ("studio_id");



CREATE INDEX "idx_refunds_payment" ON "public"."refunds" USING "btree" ("payment_id");



CREATE INDEX "idx_teachers_user_id" ON "public"."teachers" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "calculate_invoice_totals" AFTER INSERT OR DELETE OR UPDATE ON "public"."invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_invoice_totals"();



CREATE OR REPLACE TRIGGER "increment_unread_messages" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."increment_unread_messages"();



CREATE OR REPLACE TRIGGER "manage_class_instances" AFTER INSERT OR UPDATE OF "is_recurring", "day_of_week", "date", "end_date" ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."create_class_instances"();



CREATE OR REPLACE TRIGGER "manage_instance_enrollments" AFTER INSERT ON "public"."class_instances" FOR EACH ROW EXECUTE FUNCTION "public"."create_instance_enrollments"();



CREATE OR REPLACE TRIGGER "trigger_add_admin" AFTER INSERT ON "public"."class_channels" FOR EACH ROW EXECUTE FUNCTION "public"."add_admin_to_the_channel"();



CREATE OR REPLACE TRIGGER "update_channel_timestamp_on_comment" AFTER INSERT ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_channel_timestamp"();



CREATE OR REPLACE TRIGGER "update_channel_timestamp_on_post" AFTER INSERT ON "public"."channel_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_channel_timestamp"();



CREATE OR REPLACE TRIGGER "update_class_instances_updated_at" BEFORE UPDATE ON "public"."class_instances" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversation_timestamp" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



CREATE OR REPLACE TRIGGER "update_invoice_status_on_payment" AFTER INSERT OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_status_on_payment"();



CREATE OR REPLACE TRIGGER "update_invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_participant_ids_trigger" AFTER INSERT OR DELETE ON "public"."conversation_participants" FOR EACH ROW EXECUTE FUNCTION "public"."update_participant_ids"();



CREATE OR REPLACE TRIGGER "update_payment_methods_updated_at" BEFORE UPDATE ON "public"."payment_methods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_schedules_updated_at" BEFORE UPDATE ON "public"."payment_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_status_on_refund" AFTER INSERT OR UPDATE ON "public"."refunds" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_status_on_refund"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_plan_enrollments_updated_at" BEFORE UPDATE ON "public"."plan_enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pricing_plans_updated_at" BEFORE UPDATE ON "public"."pricing_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_class_dates_trigger" BEFORE INSERT OR UPDATE ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."validate_class_dates"();



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_instance_enrollment_id_fkey" FOREIGN KEY ("instance_enrollment_id") REFERENCES "public"."instance_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."class_channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_posts"
    ADD CONSTRAINT "channel_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."channel_posts"
    ADD CONSTRAINT "channel_posts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."class_channels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_channels"
    ADD CONSTRAINT "class_channels_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_channels"
    ADD CONSTRAINT "class_channels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."class_instances"
    ADD CONSTRAINT "class_instances_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_instances"
    ADD CONSTRAINT "class_instances_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."class_instances"
    ADD CONSTRAINT "class_instances_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id");



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "fk_class" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "fk_parent" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."instance_enrollments"
    ADD CONSTRAINT "instance_enrollments_class_instance_id_fkey" FOREIGN KEY ("class_instance_id") REFERENCES "public"."class_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instance_enrollments"
    ADD CONSTRAINT "instance_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_plan_enrollment_id_fkey" FOREIGN KEY ("plan_enrollment_id") REFERENCES "public"."plan_enrollments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."parents"
    ADD CONSTRAINT "parents_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id");



ALTER TABLE ONLY "public"."parents"
    ADD CONSTRAINT "parents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_schedules"
    ADD CONSTRAINT "payment_schedules_plan_enrollment_id_fkey" FOREIGN KEY ("plan_enrollment_id") REFERENCES "public"."plan_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."plan_enrollments"
    ADD CONSTRAINT "plan_enrollments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."pricing_plans"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."plan_enrollments"
    ADD CONSTRAINT "plan_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."channel_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_media"
    ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."channel_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."channel_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_reactions"
    ADD CONSTRAINT "post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pricing_plans"
    ADD CONSTRAINT "pricing_plans_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id");



ALTER TABLE ONLY "public"."studios"
    ADD CONSTRAINT "studios_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Admins can delete posts" ON "public"."channel_posts" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."channel_members" "cm"
  WHERE (("cm"."channel_id" = "channel_posts"."channel_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'admin'::"text")))) OR ("author_id" = "auth"."uid"())));



CREATE POLICY "Anyone can read studio names" ON "public"."studios" FOR SELECT USING (true);



CREATE POLICY "Authors can edit their posts" ON "public"."channel_posts" FOR UPDATE TO "authenticated" USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "Authors can manage comments" ON "public"."post_comments" FOR UPDATE TO "authenticated" USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "Authors can manage media" ON "public"."post_media" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."channel_posts" "cp"
  WHERE (("cp"."id" = "post_media"."post_id") AND ("cp"."author_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."channel_posts" "cp"
  WHERE (("cp"."id" = "post_media"."post_id") AND ("cp"."author_id" = "auth"."uid"())))));



CREATE POLICY "Channel admins can manage members" ON "public"."channel_members" USING (((EXISTS ( SELECT 1
   FROM "public"."channel_members" "cm"
  WHERE (("cm"."channel_id" = "channel_members"."channel_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."class_channels" "c"
  WHERE (("c"."id" = "channel_members"."channel_id") AND ("c"."created_by" = "auth"."uid"())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."channel_members" "cm"
  WHERE (("cm"."channel_id" = "channel_members"."channel_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."class_channels" "c"
  WHERE (("c"."id" = "channel_members"."channel_id") AND ("c"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Members can create comments" ON "public"."post_comments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."channel_posts" "cp"
     JOIN "public"."channel_members" "cm" ON (("cp"."channel_id" = "cm"."channel_id")))
  WHERE (("cp"."id" = "post_comments"."post_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Members can create posts" ON "public"."channel_posts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."channel_members" "cm"
  WHERE (("cm"."channel_id" = "cm"."channel_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Members can react to posts" ON "public"."post_reactions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."channel_posts" "cp"
     JOIN "public"."channel_members" "cm" ON (("cp"."channel_id" = "cm"."channel_id")))
  WHERE (("cp"."id" = "post_reactions"."post_id") AND ("cm"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."channel_posts" "cp"
     JOIN "public"."channel_members" "cm" ON (("cp"."channel_id" = "cm"."channel_id")))
  WHERE (("cp"."id" = "post_reactions"."post_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Members can view comments" ON "public"."post_comments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."channel_posts" "cp"
     JOIN "public"."channel_members" "cm" ON (("cp"."channel_id" = "cm"."channel_id")))
  WHERE (("cp"."id" = "post_comments"."post_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Members can view media" ON "public"."post_media" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."channel_posts" "cp"
     JOIN "public"."channel_members" "cm" ON (("cp"."channel_id" = "cm"."channel_id")))
  WHERE (("cp"."id" = "post_media"."post_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Members can view posts" ON "public"."channel_posts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."channel_members" "cm"
  WHERE (("cm"."channel_id" = "cm"."channel_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owners can manage class instances" ON "public"."class_instances" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."classes" "c"
     JOIN "public"."studios" "s" ON (("c"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("c"."id" = "class_instances"."class_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."classes" "c"
     JOIN "public"."studios" "s" ON (("c"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("c"."id" = "class_instances"."class_id")))));



CREATE POLICY "Owners can manage own studio" ON "public"."studios" TO "authenticated" USING (("owner_id" IN ( SELECT "owners"."id"
   FROM "public"."owners"
  WHERE ("owners"."id" = "auth"."uid"())))) WITH CHECK (("owner_id" IN ( SELECT "owners"."id"
   FROM "public"."owners"
  WHERE ("owners"."id" = "auth"."uid"()))));



CREATE POLICY "Owners can manage studio locations" ON "public"."locations" TO "authenticated" USING (("studio_id" IN ( SELECT "s"."id"
   FROM ("public"."studios" "s"
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"())))) WITH CHECK (("studio_id" IN ( SELECT "s"."id"
   FROM ("public"."studios" "s"
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can read own data" ON "public"."owners" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Owners can read studio parents" ON "public"."parents" FOR SELECT TO "authenticated" USING (("studio_id" IN ( SELECT "s"."id"
   FROM ("public"."studios" "s"
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can read studio teachers" ON "public"."teachers" FOR SELECT TO "authenticated" USING (("studio_id" IN ( SELECT "s"."id"
   FROM ("public"."studios" "s"
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can update own data" ON "public"."owners" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Owners can view studio students" ON "public"."students" FOR SELECT TO "authenticated" USING (("studio_id" IN ( SELECT "s"."id"
   FROM ("public"."studios" "s"
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "Parents can manage own students" ON "public"."students" TO "authenticated" USING (("parent_id" IN ( SELECT "parents"."id"
   FROM "public"."parents"
  WHERE ("parents"."user_id" = "auth"."uid"())))) WITH CHECK (("parent_id" IN ( SELECT "parents"."id"
   FROM "public"."parents"
  WHERE ("parents"."user_id" = "auth"."uid"()))));



CREATE POLICY "Parents can manage their payment methods" ON "public"."payment_methods" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parents" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."id" = "payment_methods"."parent_id")))));



CREATE POLICY "Parents can read own data" ON "public"."parents" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Parents can update own data" ON "public"."parents" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Parents can view attendance" ON "public"."attendance" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."instance_enrollments" "ie"
     JOIN "public"."students" "s" ON (("s"."id" = "ie"."student_id")))
     JOIN "public"."parents" "p" ON (("s"."parent_id" = "p"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("ie"."id" = "attendance"."instance_enrollment_id")))));



CREATE POLICY "Parents can view class channels" ON "public"."class_channels" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ((("public"."classes" "c"
     JOIN "public"."class_students" "cs" ON (("cs"."class_id" = "c"."id")))
     JOIN "public"."students" "s" ON (("cs"."student_id" = "s"."id")))
     JOIN "public"."parents" "p" ON (("s"."parent_id" = "p"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("c"."id" = "class_channels"."class_id")))));



CREATE POLICY "Parents can view class instances" ON "public"."class_instances" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."classes" "c"
     JOIN "public"."parents" "p" ON (("p"."studio_id" = "c"."studio_id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("c"."id" = "class_instances"."class_id")))));



CREATE POLICY "Parents can view instance enrollments" ON "public"."instance_enrollments" FOR SELECT TO "authenticated" USING (("student_id" IN ( SELECT "s"."id"
   FROM ("public"."students" "s"
     JOIN "public"."parents" "p" ON (("s"."parent_id" = "p"."id")))
  WHERE ("p"."user_id" = "auth"."uid"()))));



CREATE POLICY "Parents can view pricing plans" ON "public"."pricing_plans" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parents" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."studio_id" = "p"."studio_id")))));



CREATE POLICY "Parents can view student enrollments" ON "public"."class_students" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."students" "s"
     JOIN "public"."parents" "p" ON (("s"."parent_id" = "p"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("s"."id" = "class_students"."student_id")))));



CREATE POLICY "Parents can view studio classes" ON "public"."classes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parents" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."studio_id" = "classes"."studio_id")))));



CREATE POLICY "Parents can view studio teachers" ON "public"."teachers" FOR SELECT TO "authenticated" USING (("studio_id" IN ( SELECT "parents"."studio_id"
   FROM "public"."parents"
  WHERE ("parents"."user_id" = "auth"."uid"()))));



CREATE POLICY "Parents can view their invoice items" ON "public"."invoice_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."invoices" "i"
     JOIN "public"."parents" "p" ON (("i"."parent_id" = "p"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("i"."id" = "invoice_items"."invoice_id")))));



CREATE POLICY "Parents can view their invoices" ON "public"."invoices" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."parents" "p"
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("p"."id" = "invoices"."parent_id")))));



CREATE POLICY "Parents can view their payment schedules" ON "public"."payment_schedules" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."plan_enrollments" "pe"
     JOIN "public"."students" "s" ON (("pe"."student_id" = "s"."id")))
     JOIN "public"."parents" "p" ON (("s"."parent_id" = "p"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("pe"."id" = "payment_schedules"."plan_enrollment_id")))));



CREATE POLICY "Parents can view their payments" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."invoices" "i"
     JOIN "public"."parents" "p" ON (("i"."parent_id" = "p"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("i"."id" = "payments"."invoice_id")))));



CREATE POLICY "Parents can view their refunds" ON "public"."refunds" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."payments" "p"
     JOIN "public"."invoices" "i" ON (("p"."invoice_id" = "i"."id")))
     JOIN "public"."parents" "pa" ON (("i"."parent_id" = "pa"."id")))
  WHERE (("pa"."user_id" = "auth"."uid"()) AND ("p"."id" = "refunds"."payment_id")))));



CREATE POLICY "Parents can view their students' enrollments" ON "public"."plan_enrollments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."students" "s"
     JOIN "public"."parents" "p" ON (("s"."parent_id" = "p"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("s"."id" = "plan_enrollments"."student_id")))));



CREATE POLICY "Studio owners can manage attendance" ON "public"."attendance" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (((("public"."instance_enrollments" "ie"
     JOIN "public"."class_instances" "ci" ON (("ci"."id" = "ie"."class_instance_id")))
     JOIN "public"."classes" "c" ON (("ci"."class_id" = "c"."id")))
     JOIN "public"."studios" "s" ON (("c"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("ie"."id" = "attendance"."instance_enrollment_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (((("public"."instance_enrollments" "ie"
     JOIN "public"."class_instances" "ci" ON (("ci"."id" = "ie"."class_instance_id")))
     JOIN "public"."classes" "c" ON (("ci"."class_id" = "c"."id")))
     JOIN "public"."studios" "s" ON (("c"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("ie"."id" = "attendance"."instance_enrollment_id")))));



CREATE POLICY "Studio owners can manage class students" ON "public"."class_students" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."classes" "c"
     JOIN "public"."studios" "s" ON (("c"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."id" = "auth"."uid"()) AND ("c"."id" = "class_students"."class_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."classes" "c"
     JOIN "public"."studios" "s" ON (("c"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."id" = "auth"."uid"()) AND ("c"."id" = "class_students"."class_id")))));



CREATE POLICY "Studio owners can manage classes" ON "public"."classes" TO "authenticated" USING (("studio_id" IN ( SELECT "s"."id"
   FROM ("public"."studios" "s"
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"())))) WITH CHECK (("studio_id" IN ( SELECT "s"."id"
   FROM ("public"."studios" "s"
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE ("o"."user_id" = "auth"."uid"()))));



CREATE POLICY "Studio owners can manage instance enrollments" ON "public"."instance_enrollments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ((("public"."class_instances" "ci"
     JOIN "public"."classes" "c" ON (("ci"."class_id" = "c"."id")))
     JOIN "public"."studios" "s" ON (("c"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("ci"."id" = "instance_enrollments"."class_instance_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((("public"."class_instances" "ci"
     JOIN "public"."classes" "c" ON (("ci"."class_id" = "c"."id")))
     JOIN "public"."studios" "s" ON (("c"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("ci"."id" = "instance_enrollments"."class_instance_id")))));



CREATE POLICY "Studio owners can manage invoice items" ON "public"."invoice_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."invoices" "i"
     JOIN "public"."studios" "s" ON (("i"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("i"."id" = "invoice_items"."invoice_id")))));



CREATE POLICY "Studio owners can manage invoices" ON "public"."invoices" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."studios" "s"
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("s"."id" = "invoices"."studio_id")))));



CREATE POLICY "Studio owners can manage payment schedules" ON "public"."payment_schedules" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ((("public"."plan_enrollments" "pe"
     JOIN "public"."pricing_plans" "pp" ON (("pe"."plan_id" = "pp"."id")))
     JOIN "public"."studios" "s" ON (("pp"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("pe"."id" = "payment_schedules"."plan_enrollment_id")))));



CREATE POLICY "Studio owners can manage payments" ON "public"."payments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."invoices" "i"
     JOIN "public"."studios" "s" ON (("i"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("i"."id" = "payments"."invoice_id")))));



CREATE POLICY "Studio owners can manage plan enrollments" ON "public"."plan_enrollments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."pricing_plans" "pp"
     JOIN "public"."studios" "s" ON (("pp"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("pp"."id" = "plan_enrollments"."plan_id")))));



CREATE POLICY "Studio owners can manage pricing plans" ON "public"."pricing_plans" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."studios" "s"
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("s"."id" = "pricing_plans"."studio_id")))));



CREATE POLICY "Studio owners can manage refunds" ON "public"."refunds" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ((("public"."payments" "p"
     JOIN "public"."invoices" "i" ON (("p"."invoice_id" = "i"."id")))
     JOIN "public"."studios" "s" ON (("i"."studio_id" = "s"."id")))
     JOIN "public"."owners" "o" ON (("s"."owner_id" = "o"."id")))
  WHERE (("o"."user_id" = "auth"."uid"()) AND ("p"."id" = "refunds"."payment_id")))));



CREATE POLICY "Teachers can manage attendance" ON "public"."attendance" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ((("public"."instance_enrollments" "ie"
     JOIN "public"."class_instances" "ci" ON (("ci"."id" = "ie"."class_instance_id")))
     JOIN "public"."classes" "c" ON (("ci"."class_id" = "c"."id")))
     JOIN "public"."teachers" "t" ON (("c"."teacher_id" = "t"."id")))
  WHERE (("t"."user_id" = "auth"."uid"()) AND ("ie"."id" = "attendance"."instance_enrollment_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((("public"."instance_enrollments" "ie"
     JOIN "public"."class_instances" "ci" ON (("ci"."id" = "ie"."class_instance_id")))
     JOIN "public"."classes" "c" ON (("ci"."class_id" = "c"."id")))
     JOIN "public"."teachers" "t" ON (("c"."teacher_id" = "t"."id")))
  WHERE (("t"."user_id" = "auth"."uid"()) AND ("ie"."id" = "attendance"."instance_enrollment_id")))));



CREATE POLICY "Teachers can manage instance enrollments" ON "public"."instance_enrollments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."class_instances" "ci"
     JOIN "public"."classes" "c" ON (("ci"."class_id" = "c"."id")))
     JOIN "public"."teachers" "t" ON (("c"."teacher_id" = "t"."id")))
  WHERE (("t"."user_id" = "auth"."uid"()) AND ("ci"."id" = "instance_enrollments"."class_instance_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."class_instances" "ci"
     JOIN "public"."classes" "c" ON (("ci"."class_id" = "c"."id")))
     JOIN "public"."teachers" "t" ON (("c"."teacher_id" = "t"."id")))
  WHERE (("t"."user_id" = "auth"."uid"()) AND ("ci"."id" = "instance_enrollments"."class_instance_id")))));



CREATE POLICY "Teachers can manage their class instances" ON "public"."class_instances" TO "authenticated" USING (("teacher_id" = ( SELECT "t"."id"
   FROM "public"."teachers" "t"
  WHERE ("t"."user_id" = "auth"."uid"())
 LIMIT 1))) WITH CHECK (("teacher_id" = ( SELECT "t"."id"
   FROM "public"."teachers" "t"
  WHERE ("t"."user_id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "Teachers can read own data" ON "public"."teachers" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Teachers can update own data" ON "public"."teachers" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Teachers can view class students" ON "public"."class_students" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."classes" "c"
     JOIN "public"."teachers" "t" ON (("c"."teacher_id" = "t"."id")))
  WHERE (("t"."user_id" = "auth"."uid"()) AND ("c"."id" = "class_students"."class_id")))));



CREATE POLICY "Teachers can view studio locations" ON "public"."locations" FOR SELECT TO "authenticated" USING (("studio_id" IN ( SELECT "teachers"."studio_id"
   FROM "public"."teachers"
  WHERE ("teachers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Teachers can view studio students" ON "public"."students" FOR SELECT TO "authenticated" USING (("studio_id" IN ( SELECT "teachers"."studio_id"
   FROM "public"."teachers"
  WHERE ("teachers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Teachers can view their classes" ON "public"."classes" FOR SELECT TO "authenticated" USING (("teacher_id" IN ( SELECT "teachers"."id"
   FROM "public"."teachers"
  WHERE ("teachers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create conversations" ON "public"."conversations" USING ((("created_by" IS NOT NULL) AND ("cardinality"("participant_ids") > 0))) WITH CHECK ((("created_by" IS NOT NULL) AND ("cardinality"("participant_ids") > 0)));



CREATE POLICY "Users can delete conversation participants" ON "public"."conversation_participants" FOR DELETE TO "authenticated" USING (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."created_by" = "auth"."uid"()))));



CREATE POLICY "Users can edit their own messages" ON "public"."messages" FOR UPDATE TO "authenticated" USING (("sender_id" = "auth"."uid"())) WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can insert conversation participants" ON "public"."conversation_participants" FOR INSERT TO "authenticated" WITH CHECK (("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("conversations"."created_by" = "auth"."uid"()))));



CREATE POLICY "Users can insert own data" ON "public"."owners" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own parent data" ON "public"."parents" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own teacher data" ON "public"."teachers" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can send messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("conversation_id" IN ( SELECT "conversation_participants"."conversation_id"
   FROM "public"."conversation_participants"
  WHERE ("conversation_participants"."user_id" = "auth"."uid"()))) AND ("sender_id" = "auth"."uid"())));



CREATE POLICY "Users can view conversation participants" ON "public"."conversation_participants" USING ((("user_id" = "auth"."uid"()) OR ("conversation_id" IN ( SELECT "conversations"."id"
   FROM "public"."conversations"
  WHERE ("auth"."uid"() = ANY ("conversations"."participant_ids"))))));



CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT USING (("conversation_id" IN ( SELECT "conversation_participants"."conversation_id"
   FROM "public"."conversation_participants"
  WHERE ("conversation_participants"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their conversations" ON "public"."conversations" USING ((("created_by" = "auth"."uid"()) OR ("auth"."uid"() = ANY ("participant_ids"))));



ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channel_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enable insert" ON "public"."class_channels" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."instance_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."owners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plan_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pricing_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."refunds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."studios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teachers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


CREATE PUBLICATION "supabase_realtime_messages_publication_v2_34_2" WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION "supabase_realtime_messages_publication_v2_34_2" OWNER TO "supabase_admin";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."add_admin_to_the_channel"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_admin_to_the_channel"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_admin_to_the_channel"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_channel_members"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_channel_members"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_channel_members"() TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_role"("channel_id" "uuid", "user_id" "uuid", "role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_role"("channel_id" "uuid", "user_id" "uuid", "role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_role"("channel_id" "uuid", "user_id" "uuid", "role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_update_class_instances"("target_class_id" "uuid", "target_date" "date", "modification_scope" "text", "updated_name" "text", "updated_teacher_id" "uuid", "updated_location_id" "uuid", "updated_start_time" time without time zone, "updated_end_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_update_class_instances"("target_class_id" "uuid", "target_date" "date", "modification_scope" "text", "updated_name" "text", "updated_teacher_id" "uuid", "updated_location_id" "uuid", "updated_start_time" time without time zone, "updated_end_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_update_class_instances"("target_class_id" "uuid", "target_date" "date", "modification_scope" "text", "updated_name" "text", "updated_teacher_id" "uuid", "updated_location_id" "uuid", "updated_start_time" time without time zone, "updated_end_time" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_invoice_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_invoice_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_invoice_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_instances"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_instances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_instances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_class_instances"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_class_instances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_class_instances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_conversation"("participant_ids" "uuid"[], "created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_conversation"("participant_ids" "uuid"[], "created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_conversation"("participant_ids" "uuid"[], "created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_instance_enrollments"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_instance_enrollments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_instance_enrollments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_dates"("start_date" "date", "end_date" "date", "day_of_week" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_dates"("start_date" "date", "end_date" "date", "day_of_week" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_dates"("start_date" "date", "end_date" "date", "day_of_week" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invoice_number"("studio_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"("studio_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"("studio_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_unread_messages"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_unread_messages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_unread_messages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_conversation_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."modify_class_instance"("p_class_id" "uuid", "p_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."modify_class_instance"("p_class_id" "uuid", "p_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."modify_class_instance"("p_class_id" "uuid", "p_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."modify_class_instance"("p_class_id" "uuid", "p_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_location_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."modify_class_instance"("p_class_id" "uuid", "p_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_location_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."modify_class_instance"("p_class_id" "uuid", "p_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_location_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."modify_future_class_instances"("p_class_id" "uuid", "p_from_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."modify_future_class_instances"("p_class_id" "uuid", "p_from_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."modify_future_class_instances"("p_class_id" "uuid", "p_from_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."modify_future_class_instances"("p_class_id" "uuid", "p_from_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_location_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."modify_future_class_instances"("p_class_id" "uuid", "p_from_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_location_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."modify_future_class_instances"("p_class_id" "uuid", "p_from_date" "date", "p_name" "text", "p_teacher_id" "uuid", "p_location_id" "uuid", "p_start_time" time without time zone, "p_end_time" time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_role"("channel_id" "uuid", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_role"("channel_id" "uuid", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_role"("channel_id" "uuid", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_channel_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_channel_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_channel_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_participants_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_participants_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_participants_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_status_on_payment"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_status_on_payment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_status_on_payment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_participant_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_participant_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_participant_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payment_status_on_refund"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payment_status_on_refund"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payment_status_on_refund"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_role"("channel_id" "uuid", "user_id" "uuid", "role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_role"("channel_id" "uuid", "user_id" "uuid", "role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_role"("channel_id" "uuid", "user_id" "uuid", "role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_class_dates"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_class_dates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_class_dates"() TO "service_role";


















GRANT ALL ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT ALL ON TABLE "public"."channel_members" TO "anon";
GRANT ALL ON TABLE "public"."channel_members" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_members" TO "service_role";



GRANT ALL ON TABLE "public"."channel_posts" TO "anon";
GRANT ALL ON TABLE "public"."channel_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_posts" TO "service_role";



GRANT ALL ON TABLE "public"."class_channels" TO "anon";
GRANT ALL ON TABLE "public"."class_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."class_channels" TO "service_role";



GRANT ALL ON TABLE "public"."class_instances" TO "anon";
GRANT ALL ON TABLE "public"."class_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."class_instances" TO "service_role";



GRANT ALL ON TABLE "public"."class_instances_backup" TO "anon";
GRANT ALL ON TABLE "public"."class_instances_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."class_instances_backup" TO "service_role";



GRANT ALL ON TABLE "public"."class_students" TO "anon";
GRANT ALL ON TABLE "public"."class_students" TO "authenticated";
GRANT ALL ON TABLE "public"."class_students" TO "service_role";



GRANT ALL ON TABLE "public"."class_students_backup" TO "anon";
GRANT ALL ON TABLE "public"."class_students_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."class_students_backup" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."classes_backup" TO "anon";
GRANT ALL ON TABLE "public"."classes_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."classes_backup" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."instance_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."instance_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."instance_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."owners" TO "anon";
GRANT ALL ON TABLE "public"."owners" TO "authenticated";
GRANT ALL ON TABLE "public"."owners" TO "service_role";



GRANT ALL ON TABLE "public"."parents" TO "anon";
GRANT ALL ON TABLE "public"."parents" TO "authenticated";
GRANT ALL ON TABLE "public"."parents" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."payment_schedules" TO "anon";
GRANT ALL ON TABLE "public"."payment_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."plan_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."plan_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."plan_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."post_comments" TO "anon";
GRANT ALL ON TABLE "public"."post_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."post_comments" TO "service_role";



GRANT ALL ON TABLE "public"."post_media" TO "anon";
GRANT ALL ON TABLE "public"."post_media" TO "authenticated";
GRANT ALL ON TABLE "public"."post_media" TO "service_role";



GRANT ALL ON TABLE "public"."post_reactions" TO "anon";
GRANT ALL ON TABLE "public"."post_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."post_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_plans" TO "anon";
GRANT ALL ON TABLE "public"."pricing_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_plans" TO "service_role";



GRANT ALL ON TABLE "public"."refunds" TO "anon";
GRANT ALL ON TABLE "public"."refunds" TO "authenticated";
GRANT ALL ON TABLE "public"."refunds" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."studios" TO "anon";
GRANT ALL ON TABLE "public"."studios" TO "authenticated";
GRANT ALL ON TABLE "public"."studios" TO "service_role";
GRANT SELECT ON TABLE "public"."studios" TO PUBLIC;



GRANT ALL ON TABLE "public"."teachers" TO "anon";
GRANT ALL ON TABLE "public"."teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."teachers" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
