drop trigger if exists "validate_class_dates_trigger" on "public"."classes";
alter table "public"."attendance" drop constraint "attendance_instance_enrollment_id_fkey";
alter table "public"."attendance" drop constraint "attendance_instance_enrollment_id_key";
alter table "public"."channel_posts" drop constraint "channel_posts_author_id_fkey";
alter table "public"."post_comments" drop constraint "post_comments_author_id_fkey";
drop function if exists "public"."validate_class_dates"();
alter table "public"."class_students" drop constraint "class_students_pkey";
drop index if exists "public"."attendance_instance_enrollment_id_key";
drop index if exists "public"."idx_attendance_enrollment";
drop index if exists "public"."class_students_pkey";
create table "public"."emergency_contacts" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid,
    "name" text not null,
    "relationship" text not null,
    "phone" text not null,
    "email" text
);
create table "public"."uniform_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "uniform_id" uuid not null,
    "student_id" uuid not null,
    "created_at" timestamp with time zone default now()
);
create table "public"."uniform_responses" (
    "id" uuid not null default gen_random_uuid(),
    "assignment_id" uuid not null,
    "size_option_id" uuid not null,
    "value" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);
create table "public"."uniform_size_options" (
    "id" uuid not null default gen_random_uuid(),
    "uniform_id" uuid not null,
    "label" text not null,
    "type" text not null,
    "options" jsonb,
    "unit" text,
    "created_at" timestamp with time zone default now()
);
create table "public"."uniforms" (
    "id" uuid not null default gen_random_uuid(),
    "studio_id" uuid not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);
alter table "public"."attendance" drop column "instance_enrollment_id";
alter table "public"."attendance" add column "class_student_id" uuid;
alter table "public"."attendance" disable row level security;
alter table "public"."class_students" add column "id" uuid not null default uuid_generate_v4();
alter table "public"."class_students" disable row level security;
alter table "public"."classes" add column "is_recurring" boolean;
alter table "public"."classes" add column "parent_class_id" uuid;
alter table "public"."students" add column "allergies" text;
alter table "public"."students" add column "doctor_name" text;
alter table "public"."students" add column "doctor_phone" text;
alter table "public"."students" add column "gender" text;
alter table "public"."students" add column "medical_conditions" text;
alter table "public"."students" add column "medications" text;
alter table "public"."students" add column "participation_consent" boolean default false;
alter table "public"."students" add column "photo_consent" boolean default false;
alter table "public"."students" add column "social_media_consent" boolean default false;
alter table "public"."students" disable row level security;
alter table "public"."studios" add column "country" text not null default 'GB'::text;
alter table "public"."studios" add column "timezone" text not null default 'Europe/London'::text;
alter table "public"."users" add column "phone" text;
alter table "public"."users" add column "photo_url" text;
alter table "public"."users" add column "timezone" text;
CREATE UNIQUE INDEX emergency_contacts_pkey ON public.emergency_contacts USING btree (id);
CREATE UNIQUE INDEX uniform_assignments_pkey ON public.uniform_assignments USING btree (id);
CREATE UNIQUE INDEX uniform_assignments_unique ON public.uniform_assignments USING btree (uniform_id, student_id);
CREATE UNIQUE INDEX uniform_responses_pkey ON public.uniform_responses USING btree (id);
CREATE UNIQUE INDEX uniform_responses_unique ON public.uniform_responses USING btree (assignment_id, size_option_id);
CREATE UNIQUE INDEX uniform_size_options_pkey ON public.uniform_size_options USING btree (id);
CREATE UNIQUE INDEX uniforms_pkey ON public.uniforms USING btree (id);
CREATE UNIQUE INDEX class_students_pkey ON public.class_students USING btree (id);
alter table "public"."emergency_contacts" add constraint "emergency_contacts_pkey" PRIMARY KEY using index "emergency_contacts_pkey";
alter table "public"."uniform_assignments" add constraint "uniform_assignments_pkey" PRIMARY KEY using index "uniform_assignments_pkey";
alter table "public"."uniform_responses" add constraint "uniform_responses_pkey" PRIMARY KEY using index "uniform_responses_pkey";
alter table "public"."uniform_size_options" add constraint "uniform_size_options_pkey" PRIMARY KEY using index "uniform_size_options_pkey";
alter table "public"."uniforms" add constraint "uniforms_pkey" PRIMARY KEY using index "uniforms_pkey";
alter table "public"."class_students" add constraint "class_students_pkey" PRIMARY KEY using index "class_students_pkey";
alter table "public"."attendance" add constraint "attendance_class_student_id_fkey" FOREIGN KEY (class_student_id) REFERENCES class_students(id) not valid;
alter table "public"."attendance" validate constraint "attendance_class_student_id_fkey";
alter table "public"."channel_posts" add constraint "channel_posts_author_id_fkey1" FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE not valid;
alter table "public"."channel_posts" validate constraint "channel_posts_author_id_fkey1";
alter table "public"."emergency_contacts" add constraint "emergency_contacts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;
alter table "public"."emergency_contacts" validate constraint "emergency_contacts_student_id_fkey";
alter table "public"."post_comments" add constraint "post_comments_author_id_fkey1" FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE not valid;
alter table "public"."post_comments" validate constraint "post_comments_author_id_fkey1";
alter table "public"."uniform_assignments" add constraint "uniform_assignments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE not valid;
alter table "public"."uniform_assignments" validate constraint "uniform_assignments_student_id_fkey";
alter table "public"."uniform_assignments" add constraint "uniform_assignments_uniform_id_fkey" FOREIGN KEY (uniform_id) REFERENCES uniforms(id) ON DELETE CASCADE not valid;
alter table "public"."uniform_assignments" validate constraint "uniform_assignments_uniform_id_fkey";
alter table "public"."uniform_assignments" add constraint "uniform_assignments_unique" UNIQUE using index "uniform_assignments_unique";
alter table "public"."uniform_responses" add constraint "uniform_responses_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES uniform_assignments(id) ON DELETE CASCADE not valid;
alter table "public"."uniform_responses" validate constraint "uniform_responses_assignment_id_fkey";
alter table "public"."uniform_responses" add constraint "uniform_responses_size_option_id_fkey" FOREIGN KEY (size_option_id) REFERENCES uniform_size_options(id) ON DELETE CASCADE not valid;
alter table "public"."uniform_responses" validate constraint "uniform_responses_size_option_id_fkey";
alter table "public"."uniform_responses" add constraint "uniform_responses_unique" UNIQUE using index "uniform_responses_unique";
alter table "public"."uniform_size_options" add constraint "uniform_size_options_type_check" CHECK ((type = ANY (ARRAY['select'::text, 'measurement'::text]))) not valid;
alter table "public"."uniform_size_options" validate constraint "uniform_size_options_type_check";
alter table "public"."uniform_size_options" add constraint "uniform_size_options_uniform_id_fkey" FOREIGN KEY (uniform_id) REFERENCES uniforms(id) ON DELETE CASCADE not valid;
alter table "public"."uniform_size_options" validate constraint "uniform_size_options_uniform_id_fkey";
alter table "public"."uniforms" add constraint "uniforms_studio_id_fkey" FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE not valid;
alter table "public"."uniforms" validate constraint "uniforms_studio_id_fkey";
set check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
grant delete on table "public"."emergency_contacts" to "anon";
grant insert on table "public"."emergency_contacts" to "anon";
grant references on table "public"."emergency_contacts" to "anon";
grant select on table "public"."emergency_contacts" to "anon";
grant trigger on table "public"."emergency_contacts" to "anon";
grant truncate on table "public"."emergency_contacts" to "anon";
grant update on table "public"."emergency_contacts" to "anon";
grant delete on table "public"."emergency_contacts" to "authenticated";
grant insert on table "public"."emergency_contacts" to "authenticated";
grant references on table "public"."emergency_contacts" to "authenticated";
grant select on table "public"."emergency_contacts" to "authenticated";
grant trigger on table "public"."emergency_contacts" to "authenticated";
grant truncate on table "public"."emergency_contacts" to "authenticated";
grant update on table "public"."emergency_contacts" to "authenticated";
grant delete on table "public"."emergency_contacts" to "service_role";
grant insert on table "public"."emergency_contacts" to "service_role";
grant references on table "public"."emergency_contacts" to "service_role";
grant select on table "public"."emergency_contacts" to "service_role";
grant trigger on table "public"."emergency_contacts" to "service_role";
grant truncate on table "public"."emergency_contacts" to "service_role";
grant update on table "public"."emergency_contacts" to "service_role";
grant delete on table "public"."uniform_assignments" to "anon";
grant insert on table "public"."uniform_assignments" to "anon";
grant references on table "public"."uniform_assignments" to "anon";
grant select on table "public"."uniform_assignments" to "anon";
grant trigger on table "public"."uniform_assignments" to "anon";
grant truncate on table "public"."uniform_assignments" to "anon";
grant update on table "public"."uniform_assignments" to "anon";
grant delete on table "public"."uniform_assignments" to "authenticated";
grant insert on table "public"."uniform_assignments" to "authenticated";
grant references on table "public"."uniform_assignments" to "authenticated";
grant select on table "public"."uniform_assignments" to "authenticated";
grant trigger on table "public"."uniform_assignments" to "authenticated";
grant truncate on table "public"."uniform_assignments" to "authenticated";
grant update on table "public"."uniform_assignments" to "authenticated";
grant delete on table "public"."uniform_assignments" to "service_role";
grant insert on table "public"."uniform_assignments" to "service_role";
grant references on table "public"."uniform_assignments" to "service_role";
grant select on table "public"."uniform_assignments" to "service_role";
grant trigger on table "public"."uniform_assignments" to "service_role";
grant truncate on table "public"."uniform_assignments" to "service_role";
grant update on table "public"."uniform_assignments" to "service_role";
grant delete on table "public"."uniform_responses" to "anon";
grant insert on table "public"."uniform_responses" to "anon";
grant references on table "public"."uniform_responses" to "anon";
grant select on table "public"."uniform_responses" to "anon";
grant trigger on table "public"."uniform_responses" to "anon";
grant truncate on table "public"."uniform_responses" to "anon";
grant update on table "public"."uniform_responses" to "anon";
grant delete on table "public"."uniform_responses" to "authenticated";
grant insert on table "public"."uniform_responses" to "authenticated";
grant references on table "public"."uniform_responses" to "authenticated";
grant select on table "public"."uniform_responses" to "authenticated";
grant trigger on table "public"."uniform_responses" to "authenticated";
grant truncate on table "public"."uniform_responses" to "authenticated";
grant update on table "public"."uniform_responses" to "authenticated";
grant delete on table "public"."uniform_responses" to "service_role";
grant insert on table "public"."uniform_responses" to "service_role";
grant references on table "public"."uniform_responses" to "service_role";
grant select on table "public"."uniform_responses" to "service_role";
grant trigger on table "public"."uniform_responses" to "service_role";
grant truncate on table "public"."uniform_responses" to "service_role";
grant update on table "public"."uniform_responses" to "service_role";
grant delete on table "public"."uniform_size_options" to "anon";
grant insert on table "public"."uniform_size_options" to "anon";
grant references on table "public"."uniform_size_options" to "anon";
grant select on table "public"."uniform_size_options" to "anon";
grant trigger on table "public"."uniform_size_options" to "anon";
grant truncate on table "public"."uniform_size_options" to "anon";
grant update on table "public"."uniform_size_options" to "anon";
grant delete on table "public"."uniform_size_options" to "authenticated";
grant insert on table "public"."uniform_size_options" to "authenticated";
grant references on table "public"."uniform_size_options" to "authenticated";
grant select on table "public"."uniform_size_options" to "authenticated";
grant trigger on table "public"."uniform_size_options" to "authenticated";
grant truncate on table "public"."uniform_size_options" to "authenticated";
grant update on table "public"."uniform_size_options" to "authenticated";
grant delete on table "public"."uniform_size_options" to "service_role";
grant insert on table "public"."uniform_size_options" to "service_role";
grant references on table "public"."uniform_size_options" to "service_role";
grant select on table "public"."uniform_size_options" to "service_role";
grant trigger on table "public"."uniform_size_options" to "service_role";
grant truncate on table "public"."uniform_size_options" to "service_role";
grant update on table "public"."uniform_size_options" to "service_role";
grant delete on table "public"."uniforms" to "anon";
grant insert on table "public"."uniforms" to "anon";
grant references on table "public"."uniforms" to "anon";
grant select on table "public"."uniforms" to "anon";
grant trigger on table "public"."uniforms" to "anon";
grant truncate on table "public"."uniforms" to "anon";
grant update on table "public"."uniforms" to "anon";
grant delete on table "public"."uniforms" to "authenticated";
grant insert on table "public"."uniforms" to "authenticated";
grant references on table "public"."uniforms" to "authenticated";
grant select on table "public"."uniforms" to "authenticated";
grant trigger on table "public"."uniforms" to "authenticated";
grant truncate on table "public"."uniforms" to "authenticated";
grant update on table "public"."uniforms" to "authenticated";
grant delete on table "public"."uniforms" to "service_role";
grant insert on table "public"."uniforms" to "service_role";
grant references on table "public"."uniforms" to "service_role";
grant select on table "public"."uniforms" to "service_role";
grant trigger on table "public"."uniforms" to "service_role";
grant truncate on table "public"."uniforms" to "service_role";
grant update on table "public"."uniforms" to "service_role";
CREATE TRIGGER update_uniform_responses_updated_at BEFORE UPDATE ON public.uniform_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uniforms_updated_at BEFORE UPDATE ON public.uniforms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
