drop trigger if exists "manage_instance_enrollments" on "public"."class_instances";

drop trigger if exists "update_class_instances_updated_at" on "public"."class_instances";

drop trigger if exists "manage_class_instances" on "public"."classes";

revoke delete on table "public"."class_instances" from "anon";

revoke insert on table "public"."class_instances" from "anon";

revoke references on table "public"."class_instances" from "anon";

revoke select on table "public"."class_instances" from "anon";

revoke trigger on table "public"."class_instances" from "anon";

revoke truncate on table "public"."class_instances" from "anon";

revoke update on table "public"."class_instances" from "anon";

revoke delete on table "public"."class_instances" from "authenticated";

revoke insert on table "public"."class_instances" from "authenticated";

revoke references on table "public"."class_instances" from "authenticated";

revoke select on table "public"."class_instances" from "authenticated";

revoke trigger on table "public"."class_instances" from "authenticated";

revoke truncate on table "public"."class_instances" from "authenticated";

revoke update on table "public"."class_instances" from "authenticated";

revoke delete on table "public"."class_instances" from "service_role";

revoke insert on table "public"."class_instances" from "service_role";

revoke references on table "public"."class_instances" from "service_role";

revoke select on table "public"."class_instances" from "service_role";

revoke trigger on table "public"."class_instances" from "service_role";

revoke truncate on table "public"."class_instances" from "service_role";

revoke update on table "public"."class_instances" from "service_role";

alter table "public"."class_instances" drop constraint "class_instances_class_id_date_unique";

alter table "public"."class_instances" drop constraint "class_instances_class_id_fkey";

alter table "public"."class_instances" drop constraint "class_instances_location_id_fkey";

alter table "public"."class_instances" drop constraint "class_instances_status_check";

alter table "public"."class_instances" drop constraint "class_instances_teacher_id_fkey";

alter table "public"."classes" drop constraint "recurring_or_date";

alter table "public"."classes" drop constraint "valid_class_dates";

alter table "public"."classes" drop constraint "valid_day_of_week";

alter table "public"."instance_enrollments" drop constraint "instance_enrollments_class_instance_id_fkey";

alter table "public"."class_modifications" drop constraint "class_modifications_class_instance_id_fkey";

drop function if exists "public"."create_class_instances"();

drop function if exists "public"."generate_dates"(p_start_date date, p_end_date date, p_day_of_week integer);

alter table "public"."class_instances" drop constraint "class_instances_pkey";

drop index if exists "public"."class_instances_class_id_date_unique";

drop index if exists "public"."class_instances_pkey";

drop index if exists "public"."idx_class_instances_class_date";

drop index if exists "public"."idx_class_instances_class_status";

drop index if exists "public"."idx_class_instances_composite";

drop index if exists "public"."idx_class_instances_date";

drop index if exists "public"."idx_class_instances_location";

drop index if exists "public"."idx_class_instances_teacher";

drop table "public"."class_instances";

alter table "public"."classes" drop column "day_of_week";

alter table "public"."classes" drop column "is_recurring";

alter table "public"."classes" add column "capacity" bigint;

alter table "public"."classes" add column "drop_in_price" bigint;

alter table "public"."classes" add column "is_drop_in" boolean not null;

alter table "public"."classes" add column "notes" text;

alter table "public"."classes" add column "status" text default 'scheduled'::text;

alter table "public"."classes" disable row level security;

alter table "public"."classes" add constraint "classes_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'cancelled'::text, 'completed'::text]))) not valid;

alter table "public"."classes" validate constraint "classes_status_check";

alter table "public"."class_modifications" add constraint "class_modifications_class_instance_id_fkey" FOREIGN KEY (class_instance_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."class_modifications" validate constraint "class_modifications_class_instance_id_fkey";


