create table "public"."subscriptions" (
    "id" uuid not null default uuid_generate_v4(),
    "invoice_id" uuid,
    "stripe_subscription_id" text not null,
    "status" text not null,
    "interval" text not null,
    "amount" integer not null,
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."invoices" add column "discount_reason" text;

alter table "public"."invoices" add column "discount_type" text;

alter table "public"."invoices" add column "discount_value" numeric;

alter table "public"."invoices" add column "is_recurring" boolean default false;

alter table "public"."invoices" add column "recurring_end_date" timestamp with time zone;

alter table "public"."invoices" add column "recurring_interval" text;

alter table "public"."payments" add column "discount_amount" numeric;

alter table "public"."payments" add column "is_recurring" boolean not null default false;

alter table "public"."payments" add column "original_amount" numeric;

alter table "public"."payments" add column "recurring_interval" text not null;

alter table "public"."payments" disable row level security;

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."invoices" add constraint "invoices_discount_type_check" CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'amount'::text]))) not valid;

alter table "public"."invoices" validate constraint "invoices_discount_type_check";

alter table "public"."invoices" add constraint "invoices_recurring_interval_check" CHECK ((recurring_interval = ANY (ARRAY['weekly'::text, 'monthly'::text, 'term'::text]))) not valid;

alter table "public"."invoices" validate constraint "invoices_recurring_interval_check";

alter table "public"."payments" add constraint "payments_recurring_interval_check" CHECK ((recurring_interval = ANY (ARRAY['weekly'::text, 'monthly'::text, 'term'::text]))) not valid;

alter table "public"."payments" validate constraint "payments_recurring_interval_check";

alter table "public"."subscriptions" add constraint "subscriptions_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES invoices(id) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_invoice_id_fkey";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";


