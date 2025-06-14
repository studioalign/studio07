drop trigger if exists "update_payment_schedules_updated_at" on "public"."payment_schedules";

drop trigger if exists "update_plan_enrollments_updated_at" on "public"."plan_enrollments";

drop trigger if exists "update_pricing_plans_updated_at" on "public"."pricing_plans";

revoke delete on table "public"."class_instances_backup" from "anon";

revoke insert on table "public"."class_instances_backup" from "anon";

revoke references on table "public"."class_instances_backup" from "anon";

revoke select on table "public"."class_instances_backup" from "anon";

revoke trigger on table "public"."class_instances_backup" from "anon";

revoke truncate on table "public"."class_instances_backup" from "anon";

revoke update on table "public"."class_instances_backup" from "anon";

revoke delete on table "public"."class_instances_backup" from "authenticated";

revoke insert on table "public"."class_instances_backup" from "authenticated";

revoke references on table "public"."class_instances_backup" from "authenticated";

revoke select on table "public"."class_instances_backup" from "authenticated";

revoke trigger on table "public"."class_instances_backup" from "authenticated";

revoke truncate on table "public"."class_instances_backup" from "authenticated";

revoke update on table "public"."class_instances_backup" from "authenticated";

revoke delete on table "public"."class_instances_backup" from "service_role";

revoke insert on table "public"."class_instances_backup" from "service_role";

revoke references on table "public"."class_instances_backup" from "service_role";

revoke select on table "public"."class_instances_backup" from "service_role";

revoke trigger on table "public"."class_instances_backup" from "service_role";

revoke truncate on table "public"."class_instances_backup" from "service_role";

revoke update on table "public"."class_instances_backup" from "service_role";

revoke delete on table "public"."class_modifications" from "anon";

revoke insert on table "public"."class_modifications" from "anon";

revoke references on table "public"."class_modifications" from "anon";

revoke select on table "public"."class_modifications" from "anon";

revoke trigger on table "public"."class_modifications" from "anon";

revoke truncate on table "public"."class_modifications" from "anon";

revoke update on table "public"."class_modifications" from "anon";

revoke delete on table "public"."class_modifications" from "authenticated";

revoke insert on table "public"."class_modifications" from "authenticated";

revoke references on table "public"."class_modifications" from "authenticated";

revoke select on table "public"."class_modifications" from "authenticated";

revoke trigger on table "public"."class_modifications" from "authenticated";

revoke truncate on table "public"."class_modifications" from "authenticated";

revoke update on table "public"."class_modifications" from "authenticated";

revoke delete on table "public"."class_modifications" from "service_role";

revoke insert on table "public"."class_modifications" from "service_role";

revoke references on table "public"."class_modifications" from "service_role";

revoke select on table "public"."class_modifications" from "service_role";

revoke trigger on table "public"."class_modifications" from "service_role";

revoke truncate on table "public"."class_modifications" from "service_role";

revoke update on table "public"."class_modifications" from "service_role";

revoke delete on table "public"."class_students_backup" from "anon";

revoke insert on table "public"."class_students_backup" from "anon";

revoke references on table "public"."class_students_backup" from "anon";

revoke select on table "public"."class_students_backup" from "anon";

revoke trigger on table "public"."class_students_backup" from "anon";

revoke truncate on table "public"."class_students_backup" from "anon";

revoke update on table "public"."class_students_backup" from "anon";

revoke delete on table "public"."class_students_backup" from "authenticated";

revoke insert on table "public"."class_students_backup" from "authenticated";

revoke references on table "public"."class_students_backup" from "authenticated";

revoke select on table "public"."class_students_backup" from "authenticated";

revoke trigger on table "public"."class_students_backup" from "authenticated";

revoke truncate on table "public"."class_students_backup" from "authenticated";

revoke update on table "public"."class_students_backup" from "authenticated";

revoke delete on table "public"."class_students_backup" from "service_role";

revoke insert on table "public"."class_students_backup" from "service_role";

revoke references on table "public"."class_students_backup" from "service_role";

revoke select on table "public"."class_students_backup" from "service_role";

revoke trigger on table "public"."class_students_backup" from "service_role";

revoke truncate on table "public"."class_students_backup" from "service_role";

revoke update on table "public"."class_students_backup" from "service_role";

revoke delete on table "public"."classes_backup" from "anon";

revoke insert on table "public"."classes_backup" from "anon";

revoke references on table "public"."classes_backup" from "anon";

revoke select on table "public"."classes_backup" from "anon";

revoke trigger on table "public"."classes_backup" from "anon";

revoke truncate on table "public"."classes_backup" from "anon";

revoke update on table "public"."classes_backup" from "anon";

revoke delete on table "public"."classes_backup" from "authenticated";

revoke insert on table "public"."classes_backup" from "authenticated";

revoke references on table "public"."classes_backup" from "authenticated";

revoke select on table "public"."classes_backup" from "authenticated";

revoke trigger on table "public"."classes_backup" from "authenticated";

revoke truncate on table "public"."classes_backup" from "authenticated";

revoke update on table "public"."classes_backup" from "authenticated";

revoke delete on table "public"."classes_backup" from "service_role";

revoke insert on table "public"."classes_backup" from "service_role";

revoke references on table "public"."classes_backup" from "service_role";

revoke select on table "public"."classes_backup" from "service_role";

revoke trigger on table "public"."classes_backup" from "service_role";

revoke truncate on table "public"."classes_backup" from "service_role";

revoke update on table "public"."classes_backup" from "service_role";

revoke delete on table "public"."instance_enrollments" from "anon";

revoke insert on table "public"."instance_enrollments" from "anon";

revoke references on table "public"."instance_enrollments" from "anon";

revoke select on table "public"."instance_enrollments" from "anon";

revoke trigger on table "public"."instance_enrollments" from "anon";

revoke truncate on table "public"."instance_enrollments" from "anon";

revoke update on table "public"."instance_enrollments" from "anon";

revoke delete on table "public"."instance_enrollments" from "authenticated";

revoke insert on table "public"."instance_enrollments" from "authenticated";

revoke references on table "public"."instance_enrollments" from "authenticated";

revoke select on table "public"."instance_enrollments" from "authenticated";

revoke trigger on table "public"."instance_enrollments" from "authenticated";

revoke truncate on table "public"."instance_enrollments" from "authenticated";

revoke update on table "public"."instance_enrollments" from "authenticated";

revoke delete on table "public"."instance_enrollments" from "service_role";

revoke insert on table "public"."instance_enrollments" from "service_role";

revoke references on table "public"."instance_enrollments" from "service_role";

revoke select on table "public"."instance_enrollments" from "service_role";

revoke trigger on table "public"."instance_enrollments" from "service_role";

revoke truncate on table "public"."instance_enrollments" from "service_role";

revoke update on table "public"."instance_enrollments" from "service_role";

revoke delete on table "public"."payment_schedules" from "anon";

revoke insert on table "public"."payment_schedules" from "anon";

revoke references on table "public"."payment_schedules" from "anon";

revoke select on table "public"."payment_schedules" from "anon";

revoke trigger on table "public"."payment_schedules" from "anon";

revoke truncate on table "public"."payment_schedules" from "anon";

revoke update on table "public"."payment_schedules" from "anon";

revoke delete on table "public"."payment_schedules" from "authenticated";

revoke insert on table "public"."payment_schedules" from "authenticated";

revoke references on table "public"."payment_schedules" from "authenticated";

revoke select on table "public"."payment_schedules" from "authenticated";

revoke trigger on table "public"."payment_schedules" from "authenticated";

revoke truncate on table "public"."payment_schedules" from "authenticated";

revoke update on table "public"."payment_schedules" from "authenticated";

revoke delete on table "public"."payment_schedules" from "service_role";

revoke insert on table "public"."payment_schedules" from "service_role";

revoke references on table "public"."payment_schedules" from "service_role";

revoke select on table "public"."payment_schedules" from "service_role";

revoke trigger on table "public"."payment_schedules" from "service_role";

revoke truncate on table "public"."payment_schedules" from "service_role";

revoke update on table "public"."payment_schedules" from "service_role";

revoke delete on table "public"."plan_enrollments" from "anon";

revoke insert on table "public"."plan_enrollments" from "anon";

revoke references on table "public"."plan_enrollments" from "anon";

revoke select on table "public"."plan_enrollments" from "anon";

revoke trigger on table "public"."plan_enrollments" from "anon";

revoke truncate on table "public"."plan_enrollments" from "anon";

revoke update on table "public"."plan_enrollments" from "anon";

revoke delete on table "public"."plan_enrollments" from "authenticated";

revoke insert on table "public"."plan_enrollments" from "authenticated";

revoke references on table "public"."plan_enrollments" from "authenticated";

revoke select on table "public"."plan_enrollments" from "authenticated";

revoke trigger on table "public"."plan_enrollments" from "authenticated";

revoke truncate on table "public"."plan_enrollments" from "authenticated";

revoke update on table "public"."plan_enrollments" from "authenticated";

revoke delete on table "public"."plan_enrollments" from "service_role";

revoke insert on table "public"."plan_enrollments" from "service_role";

revoke references on table "public"."plan_enrollments" from "service_role";

revoke select on table "public"."plan_enrollments" from "service_role";

revoke trigger on table "public"."plan_enrollments" from "service_role";

revoke truncate on table "public"."plan_enrollments" from "service_role";

revoke update on table "public"."plan_enrollments" from "service_role";

revoke delete on table "public"."pricing_plans" from "anon";

revoke insert on table "public"."pricing_plans" from "anon";

revoke references on table "public"."pricing_plans" from "anon";

revoke select on table "public"."pricing_plans" from "anon";

revoke trigger on table "public"."pricing_plans" from "anon";

revoke truncate on table "public"."pricing_plans" from "anon";

revoke update on table "public"."pricing_plans" from "anon";

revoke delete on table "public"."pricing_plans" from "authenticated";

revoke insert on table "public"."pricing_plans" from "authenticated";

revoke references on table "public"."pricing_plans" from "authenticated";

revoke select on table "public"."pricing_plans" from "authenticated";

revoke trigger on table "public"."pricing_plans" from "authenticated";

revoke truncate on table "public"."pricing_plans" from "authenticated";

revoke update on table "public"."pricing_plans" from "authenticated";

revoke delete on table "public"."pricing_plans" from "service_role";

revoke insert on table "public"."pricing_plans" from "service_role";

revoke references on table "public"."pricing_plans" from "service_role";

revoke select on table "public"."pricing_plans" from "service_role";

revoke trigger on table "public"."pricing_plans" from "service_role";

revoke truncate on table "public"."pricing_plans" from "service_role";

revoke update on table "public"."pricing_plans" from "service_role";

revoke delete on table "public"."subscriptions" from "anon";

revoke insert on table "public"."subscriptions" from "anon";

revoke references on table "public"."subscriptions" from "anon";

revoke select on table "public"."subscriptions" from "anon";

revoke trigger on table "public"."subscriptions" from "anon";

revoke truncate on table "public"."subscriptions" from "anon";

revoke update on table "public"."subscriptions" from "anon";

revoke delete on table "public"."subscriptions" from "authenticated";

revoke insert on table "public"."subscriptions" from "authenticated";

revoke references on table "public"."subscriptions" from "authenticated";

revoke select on table "public"."subscriptions" from "authenticated";

revoke trigger on table "public"."subscriptions" from "authenticated";

revoke truncate on table "public"."subscriptions" from "authenticated";

revoke update on table "public"."subscriptions" from "authenticated";

revoke delete on table "public"."subscriptions" from "service_role";

revoke insert on table "public"."subscriptions" from "service_role";

revoke references on table "public"."subscriptions" from "service_role";

revoke select on table "public"."subscriptions" from "service_role";

revoke trigger on table "public"."subscriptions" from "service_role";

revoke truncate on table "public"."subscriptions" from "service_role";

revoke update on table "public"."subscriptions" from "service_role";

alter table "public"."class_modifications" drop constraint "class_modifications_class_instance_id_fkey";

alter table "public"."class_modifications" drop constraint "class_modifications_teacher_id_fkey";

alter table "public"."instance_enrollments" drop constraint "instance_enrollments_class_instance_id_student_id_key";

alter table "public"."instance_enrollments" drop constraint "instance_enrollments_student_id_fkey";

alter table "public"."invoice_items" drop constraint "invoice_items_plan_enrollment_id_fkey";

alter table "public"."payment_schedules" drop constraint "payment_schedules_amount_check";

alter table "public"."payment_schedules" drop constraint "payment_schedules_plan_enrollment_id_fkey";

alter table "public"."payment_schedules" drop constraint "payment_schedules_status_check";

alter table "public"."plan_enrollments" drop constraint "plan_enrollments_plan_id_fkey";

alter table "public"."plan_enrollments" drop constraint "plan_enrollments_status_check";

alter table "public"."plan_enrollments" drop constraint "plan_enrollments_student_id_fkey";

alter table "public"."pricing_plans" drop constraint "pricing_plans_amount_check";

alter table "public"."pricing_plans" drop constraint "pricing_plans_interval_check";

alter table "public"."pricing_plans" drop constraint "pricing_plans_studio_id_fkey";

alter table "public"."subscriptions" drop constraint "subscriptions_invoice_id_fkey";

alter table "public"."notifications" drop constraint "notifications_priority_check";

alter table "public"."class_instances_backup" drop constraint "class_instances_backup_pkey";

alter table "public"."class_modifications" drop constraint "class_modifications_pkey";

alter table "public"."class_students_backup" drop constraint "class_students_backup_pkey";

alter table "public"."classes_backup" drop constraint "classes_backup_pkey";

alter table "public"."instance_enrollments" drop constraint "instance_enrollments_pkey";

alter table "public"."payment_schedules" drop constraint "payment_schedules_pkey";

alter table "public"."plan_enrollments" drop constraint "plan_enrollments_pkey";

alter table "public"."pricing_plans" drop constraint "pricing_plans_pkey";

alter table "public"."subscriptions" drop constraint "subscriptions_pkey";

drop index if exists "public"."class_instances_backup_pkey";

drop index if exists "public"."class_modifications_pkey";

drop index if exists "public"."class_students_backup_pkey";

drop index if exists "public"."classes_backup_pkey";

drop index if exists "public"."idx_instance_enrollments_composite";

drop index if exists "public"."idx_instance_enrollments_instance";

drop index if exists "public"."idx_instance_enrollments_student";

drop index if exists "public"."idx_payment_schedules_enrollment";

drop index if exists "public"."idx_plan_enrollments_plan";

drop index if exists "public"."idx_plan_enrollments_student";

drop index if exists "public"."idx_pricing_plans_studio";

drop index if exists "public"."instance_enrollments_class_instance_id_student_id_key";

drop index if exists "public"."instance_enrollments_pkey";

drop index if exists "public"."payment_schedules_pkey";

drop index if exists "public"."plan_enrollments_pkey";

drop index if exists "public"."pricing_plans_pkey";

drop index if exists "public"."subscriptions_pkey";

drop table "public"."class_instances_backup";

drop table "public"."class_modifications";

drop table "public"."class_students_backup";

drop table "public"."classes_backup";

drop table "public"."instance_enrollments";

drop table "public"."payment_schedules";

drop table "public"."plan_enrollments";

drop table "public"."pricing_plans";

drop table "public"."subscriptions";

alter table "public"."users" alter column "role" drop default;

alter type "public"."user_role" rename to "user_role__old_version_to_be_dropped";

create type "public"."user_role" as enum ('owner', 'teacher', 'student', 'parent', 'deleted');

create table "public"."billing_history" (
    "id" uuid not null default uuid_generate_v4(),
    "studio_id" uuid not null,
    "created_at" timestamp with time zone default now(),
    "amount_gbp" numeric(10,2) not null,
    "description" text not null,
    "status" text not null,
    "invoice_url" text,
    "stripe_invoice_id" text,
    "stripe_payment_intent_id" text
);


alter table "public"."billing_history" enable row level security;

create table "public"."studio_subscriptions" (
    "id" uuid not null default uuid_generate_v4(),
    "studio_id" uuid not null,
    "tier" text not null,
    "max_students" integer not null,
    "price_gbp" numeric(8,2) not null,
    "stripe_subscription_id" text,
    "stripe_price_id" text,
    "status" text not null default 'active'::text,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."users" alter column role type "public"."user_role" using role::text::"public"."user_role";

alter table "public"."users" alter column "role" set default 'owner'::user_role;

drop type "public"."user_role__old_version_to_be_dropped";

alter table "public"."studios" add column "max_students" integer default 100;

alter table "public"."studios" add column "subscription_id" uuid;

alter table "public"."studios" add column "subscription_tier" text default ''::text;

alter table "public"."users" add column "deleted_at" timestamp without time zone;

alter table "public"."users" add column "status" text default 'active'::text;

CREATE INDEX billing_history_created_at_idx ON public.billing_history USING btree (created_at);

CREATE UNIQUE INDEX billing_history_pkey ON public.billing_history USING btree (id);

CREATE INDEX billing_history_studio_id_idx ON public.billing_history USING btree (studio_id);

CREATE INDEX idx_billing_history_created_at ON public.billing_history USING btree (created_at);

CREATE INDEX idx_billing_history_status ON public.billing_history USING btree (status);

CREATE INDEX idx_billing_history_studio_id ON public.billing_history USING btree (studio_id);

CREATE INDEX idx_studio_subscriptions_status ON public.studio_subscriptions USING btree (status);

CREATE INDEX idx_studio_subscriptions_stripe_subscription_id ON public.studio_subscriptions USING btree (stripe_subscription_id);

CREATE INDEX idx_studio_subscriptions_studio_id ON public.studio_subscriptions USING btree (studio_id);

CREATE UNIQUE INDEX studio_subscriptions_pkey ON public.studio_subscriptions USING btree (id);

CREATE UNIQUE INDEX studio_subscriptions_studio_id_key ON public.studio_subscriptions USING btree (studio_id);

alter table "public"."billing_history" add constraint "billing_history_pkey" PRIMARY KEY using index "billing_history_pkey";

alter table "public"."studio_subscriptions" add constraint "studio_subscriptions_pkey" PRIMARY KEY using index "studio_subscriptions_pkey";

alter table "public"."billing_history" add constraint "billing_history_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'canceled'::text, 'active'::text, 'refunded'::text]))) not valid;

alter table "public"."billing_history" validate constraint "billing_history_status_check";

alter table "public"."billing_history" add constraint "billing_history_studio_id_fkey" FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE not valid;

alter table "public"."billing_history" validate constraint "billing_history_studio_id_fkey";

alter table "public"."studio_subscriptions" add constraint "studio_subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'canceled'::text, 'past_due'::text, 'incomplete'::text, 'trialing'::text, 'unpaid'::text]))) not valid;

alter table "public"."studio_subscriptions" validate constraint "studio_subscriptions_status_check";

alter table "public"."studio_subscriptions" add constraint "studio_subscriptions_studio_id_fkey" FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE not valid;

alter table "public"."studio_subscriptions" validate constraint "studio_subscriptions_studio_id_fkey";

alter table "public"."studio_subscriptions" add constraint "studio_subscriptions_studio_id_key" UNIQUE using index "studio_subscriptions_studio_id_key";

alter table "public"."studio_subscriptions" add constraint "studio_subscriptions_tier_check" CHECK ((tier = ANY (ARRAY['Starter'::text, 'Growth'::text, 'Professional'::text, 'Scale'::text, 'Enterprise'::text]))) not valid;

alter table "public"."studio_subscriptions" validate constraint "studio_subscriptions_tier_check";

alter table "public"."studios" add constraint "studios_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES studio_subscriptions(id) not valid;

alter table "public"."studios" validate constraint "studios_subscription_id_fkey";

alter table "public"."notifications" add constraint "notifications_priority_check" CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))) not valid;

alter table "public"."notifications" validate constraint "notifications_priority_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_studio_subscription_tier(p_studio_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_student_count INTEGER;
  current_max_students INTEGER;
  requires_upgrade BOOLEAN := FALSE;
BEGIN
  -- Get current student count
  SELECT get_studio_student_count(p_studio_id) INTO current_student_count;
  
  -- Get current subscription max students
  SELECT s.max_students INTO current_max_students
  FROM studios st
  LEFT JOIN studio_subscriptions s ON st.subscription_id = s.id
  WHERE st.id = p_studio_id;
  
  -- If no subscription exists or student count exceeds limit, upgrade needed
  IF current_max_students IS NULL OR current_student_count > current_max_students THEN
    requires_upgrade := TRUE;
  END IF;
  
  RETURN requires_upgrade;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Delete the corresponding auth.user
    DELETE FROM auth.users WHERE id = OLD.id;
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting auth user: %', SQLERRM;
        RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_studio(p_studio_id uuid, p_owner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_record RECORD;
BEGIN
    -- First delete all studio data in proper order to respect foreign keys
    
    -- Start with notifications
    DELETE FROM notifications WHERE studio_id = p_studio_id;
    
    -- Delete all document relations
    DELETE FROM document_recipients WHERE document_id IN (
        SELECT id FROM documents WHERE studio_id = p_studio_id
    );
    DELETE FROM documents WHERE studio_id = p_studio_id;
    
    -- Delete all channel data
    DELETE FROM post_comments WHERE post_id IN (
        SELECT cp.id FROM channel_posts cp
        JOIN class_channels cc ON cp.channel_id = cc.id
        WHERE cc.studio_id = p_studio_id
    );
    
    DELETE FROM post_reactions WHERE post_id IN (
        SELECT cp.id FROM channel_posts cp
        JOIN class_channels cc ON cp.channel_id = cc.id
        WHERE cc.studio_id = p_studio_id
    );
    
    DELETE FROM post_media WHERE post_id IN (
        SELECT cp.id FROM channel_posts cp
        JOIN class_channels cc ON cp.channel_id = cc.id
        WHERE cc.studio_id = p_studio_id
    );
    
    DELETE FROM channel_posts WHERE channel_id IN (
        SELECT id FROM class_channels WHERE studio_id = p_studio_id
    );
    
    DELETE FROM channel_members WHERE channel_id IN (
        SELECT id FROM class_channels WHERE studio_id = p_studio_id
    );
    
    DELETE FROM class_channels WHERE studio_id = p_studio_id;
    
    -- Delete all attendance and class data
    DELETE FROM attendance WHERE class_student_id IN (
        SELECT cs.id FROM class_students cs
        JOIN classes c ON cs.class_id = c.id
        WHERE c.studio_id = p_studio_id
    );
    
    DELETE FROM class_students WHERE class_id IN (
        SELECT id FROM classes WHERE studio_id = p_studio_id
    );
    
    DELETE FROM drop_in_bookings WHERE studio_id = p_studio_id;
    
    -- Check if class_modifications table exists before trying to delete from it
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'class_modifications'
    ) THEN
        DELETE FROM class_modifications WHERE studio_id = p_studio_id;
    END IF;
    
    DELETE FROM classes WHERE studio_id = p_studio_id;
    
    -- Delete all billing data
    DELETE FROM invoice_items WHERE invoice_id IN (
        SELECT id FROM invoices WHERE studio_id = p_studio_id
    );
    
    DELETE FROM refunds WHERE payment_id IN (
        SELECT id FROM payments WHERE studio_id = p_studio_id
    );
    
    DELETE FROM payments WHERE studio_id = p_studio_id;
    DELETE FROM payment_schedules WHERE studio_id = p_studio_id;
    DELETE FROM plan_enrollments WHERE studio_id = p_studio_id;
    DELETE FROM invoices WHERE studio_id = p_studio_id;
    DELETE FROM pricing_plans WHERE studio_id = p_studio_id;
    
    -- Delete all uniform data if tables exist
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'uniform_responses'
    ) THEN
        DELETE FROM uniform_responses WHERE uniform_id IN (
            SELECT id FROM uniforms WHERE studio_id = p_studio_id
        );
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'uniform_assignments'
    ) THEN
        DELETE FROM uniform_assignments WHERE uniform_id IN (
            SELECT id FROM uniforms WHERE studio_id = p_studio_id
        );
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'uniform_size_options'
    ) THEN
        DELETE FROM uniform_size_options WHERE uniform_id IN (
            SELECT id FROM uniforms WHERE studio_id = p_studio_id
        );
    END IF;
    
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'uniforms'
    ) THEN
        DELETE FROM uniforms WHERE studio_id = p_studio_id;
    END IF;
    
    -- Delete all student data
    DELETE FROM emergency_contacts WHERE student_id IN (
        SELECT id FROM students WHERE studio_id = p_studio_id
    );
    
    DELETE FROM students WHERE studio_id = p_studio_id;
    DELETE FROM locations WHERE studio_id = p_studio_id;
    
    -- Delete all users except the owner (who will be deleted last)
    FOR user_record IN 
        SELECT id FROM users 
        WHERE studio_id = p_studio_id AND id != p_owner_id
    LOOP
        PERFORM delete_user_account(user_record.id);
    END LOOP;
    
    -- Delete the studio
    DELETE FROM studios WHERE id = p_studio_id;
    
    -- Delete the owner's account last
    PERFORM delete_user_account(p_owner_id);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting studio: %', SQLERRM;
        RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_studio_id UUID;
    v_role TEXT;
    student_record RECORD;
BEGIN
    -- Get user info
    SELECT studio_id, role INTO v_studio_id, v_role
    FROM users
    WHERE id = p_user_id;
    
    -- Clear user data from various tables
    -- Starting with tables that reference the user directly
    DELETE FROM user_preferences WHERE user_id = p_user_id;
    DELETE FROM notifications WHERE user_id = p_user_id;
    DELETE FROM payment_methods WHERE user_id = p_user_id;
    DELETE FROM channel_members WHERE user_id = p_user_id;
    
    -- Delete conversation participants and messages
    DELETE FROM messages WHERE conversation_id IN (
        SELECT conversation_id FROM conversation_participants WHERE user_id = p_user_id
    );
    DELETE FROM conversation_participants WHERE user_id = p_user_id;
    
    -- Delete user posts and related data
    DELETE FROM post_comments WHERE author_id = p_user_id;
    DELETE FROM post_reactions WHERE user_id = p_user_id;
    DELETE FROM post_media WHERE post_id IN (SELECT id FROM channel_posts WHERE author_id = p_user_id);
    DELETE FROM channel_posts WHERE author_id = p_user_id;
    
    -- Delete document relations
    DELETE FROM document_recipients WHERE user_id = p_user_id;
    
    -- Handle teacher-specific data
    IF v_role = 'teacher' THEN
        -- Update classes to have no teacher (don't delete as this would affect students)
        UPDATE classes SET teacher_id = NULL WHERE teacher_id = p_user_id;
    END IF;
    
    -- Handle parent-specific data
    IF v_role = 'parent' THEN
        -- Get all student IDs for this parent and process one by one
        FOR student_record IN SELECT id FROM students WHERE parent_id = p_user_id
        LOOP
            -- Delete student-related records
            DELETE FROM attendance WHERE class_student_id IN (
                SELECT id FROM class_students WHERE student_id = student_record.id
            );
            DELETE FROM class_students WHERE student_id = student_record.id;
            DELETE FROM drop_in_bookings WHERE student_id = student_record.id;
            DELETE FROM emergency_contacts WHERE student_id = student_record.id;
            
            -- Check if uniform_responses table exists before trying to delete from it
            IF EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'uniform_responses'
            ) THEN
                DELETE FROM uniform_responses WHERE student_id = student_record.id;
            END IF;
        END LOOP;
        
        -- Delete all payments and invoices
        DELETE FROM invoice_items WHERE invoice_id IN (
            SELECT id FROM invoices WHERE parent_id = p_user_id
        );
        DELETE FROM payments WHERE parent_id = p_user_id;
        DELETE FROM invoices WHERE parent_id = p_user_id;
        
        -- Delete payment schedules and plan enrollments
        DELETE FROM payment_schedules WHERE plan_enrollment_id IN (
            SELECT id FROM plan_enrollments WHERE student_id IN (
                SELECT id FROM students WHERE parent_id = p_user_id
            )
        );
        DELETE FROM plan_enrollments WHERE student_id IN (
            SELECT id FROM students WHERE parent_id = p_user_id
        );
        
        -- Delete connected customers
        DELETE FROM connected_customers WHERE parent_id = p_user_id;
        
        -- Delete students last (after all dependencies are gone)
        DELETE FROM students WHERE parent_id = p_user_id;
    END IF;
    
    -- Finally, delete the user record itself
    DELETE FROM users WHERE id = p_user_id;
    
    -- Return success
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return failure
        RAISE NOTICE 'Error deleting user account: %', SQLERRM;
        RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_user_auth(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    auth_id UUID;
BEGIN
    -- Get the auth.id from the user's id
    SELECT id INTO auth_id FROM auth.users WHERE id = user_id;
    
    IF auth_id IS NOT NULL THEN
        -- Delete the user from auth schema
        DELETE FROM auth.users WHERE id = auth_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in delete_user_auth: %', SQLERRM;
        RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_remaining_student_slots(p_studio_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_max_students INTEGER;
    v_current_students INTEGER;
BEGIN
    -- Get max students from subscription
    SELECT max_students INTO v_max_students
    FROM studio_subscriptions
    WHERE studio_id = p_studio_id
    AND status = 'active'
    LIMIT 1;

    -- Get current student count
    SELECT COUNT(*) INTO v_current_students
    FROM students
    WHERE studio_id = p_studio_id
    AND status = 'active';

    -- Return remaining slots
    RETURN COALESCE(v_max_students, 0) - COALESCE(v_current_students, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_required_subscription_tier(student_count integer)
 RETURNS TABLE(tier text, max_students integer, price_gbp numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF student_count <= 100 THEN
    RETURN QUERY SELECT 'starter'::text, 100, 15.00::numeric;
  ELSIF student_count <= 200 THEN
    RETURN QUERY SELECT 'growth'::text, 200, 25.00::numeric;
  ELSIF student_count <= 500 THEN
    RETURN QUERY SELECT 'professional'::text, 500, 45.00::numeric;
  ELSE
    RETURN QUERY SELECT 'enterprise'::text, 1000, 75.00::numeric;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_studio_student_count(p_studio_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  student_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO student_count
  FROM students
  WHERE studio_id = p_studio_id;
  
  RETURN COALESCE(student_count, 0);
END;
$function$
;

grant delete on table "public"."billing_history" to "anon";

grant insert on table "public"."billing_history" to "anon";

grant references on table "public"."billing_history" to "anon";

grant select on table "public"."billing_history" to "anon";

grant trigger on table "public"."billing_history" to "anon";

grant truncate on table "public"."billing_history" to "anon";

grant update on table "public"."billing_history" to "anon";

grant delete on table "public"."billing_history" to "authenticated";

grant insert on table "public"."billing_history" to "authenticated";

grant references on table "public"."billing_history" to "authenticated";

grant select on table "public"."billing_history" to "authenticated";

grant trigger on table "public"."billing_history" to "authenticated";

grant truncate on table "public"."billing_history" to "authenticated";

grant update on table "public"."billing_history" to "authenticated";

grant delete on table "public"."billing_history" to "service_role";

grant insert on table "public"."billing_history" to "service_role";

grant references on table "public"."billing_history" to "service_role";

grant select on table "public"."billing_history" to "service_role";

grant trigger on table "public"."billing_history" to "service_role";

grant truncate on table "public"."billing_history" to "service_role";

grant update on table "public"."billing_history" to "service_role";

grant delete on table "public"."studio_subscriptions" to "anon";

grant insert on table "public"."studio_subscriptions" to "anon";

grant references on table "public"."studio_subscriptions" to "anon";

grant select on table "public"."studio_subscriptions" to "anon";

grant trigger on table "public"."studio_subscriptions" to "anon";

grant truncate on table "public"."studio_subscriptions" to "anon";

grant update on table "public"."studio_subscriptions" to "anon";

grant delete on table "public"."studio_subscriptions" to "authenticated";

grant insert on table "public"."studio_subscriptions" to "authenticated";

grant references on table "public"."studio_subscriptions" to "authenticated";

grant select on table "public"."studio_subscriptions" to "authenticated";

grant trigger on table "public"."studio_subscriptions" to "authenticated";

grant truncate on table "public"."studio_subscriptions" to "authenticated";

grant update on table "public"."studio_subscriptions" to "authenticated";

grant delete on table "public"."studio_subscriptions" to "service_role";

grant insert on table "public"."studio_subscriptions" to "service_role";

grant references on table "public"."studio_subscriptions" to "service_role";

grant select on table "public"."studio_subscriptions" to "service_role";

grant trigger on table "public"."studio_subscriptions" to "service_role";

grant truncate on table "public"."studio_subscriptions" to "service_role";

grant update on table "public"."studio_subscriptions" to "service_role";

create policy "Service role can manage all billing history"
on "public"."billing_history"
as permissive
for all
to public
using (true)
with check (true);


create policy "Studio owners can view their billing history"
on "public"."billing_history"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM studios
  WHERE ((studios.id = billing_history.studio_id) AND (studios.owner_id = auth.uid())))));


create policy "Users can view their billing history"
on "public"."billing_history"
as permissive
for select
to public
using ((studio_id IN ( SELECT studios.id
   FROM studios
  WHERE (studios.owner_id = auth.uid()))));


create policy "Service role can manage all subscriptions"
on "public"."studio_subscriptions"
as permissive
for all
to public
using (true)
with check (true);


create policy "Users can insert their studio subscriptions"
on "public"."studio_subscriptions"
as permissive
for insert
to public
with check ((studio_id IN ( SELECT studios.id
   FROM studios
  WHERE (studios.owner_id = auth.uid()))));


create policy "Users can update their studio subscriptions"
on "public"."studio_subscriptions"
as permissive
for update
to public
using ((studio_id IN ( SELECT studios.id
   FROM studios
  WHERE (studios.owner_id = auth.uid()))));


create policy "Users can view their studio subscriptions"
on "public"."studio_subscriptions"
as permissive
for select
to public
using ((studio_id IN ( SELECT studios.id
   FROM studios
  WHERE (studios.owner_id = auth.uid()))));


create policy "Prevent deleted users from accessing"
on "public"."users"
as permissive
for all
to public
using ((role <> 'deleted'::user_role));


CREATE TRIGGER trigger_delete_auth_user AFTER DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION delete_auth_user();


