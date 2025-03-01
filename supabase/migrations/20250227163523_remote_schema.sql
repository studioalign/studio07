alter table "public"."invoices" drop constraint "invoices_status_check";

alter table "public"."invoices" add column "paid_at" timestamp with time zone;

alter table "public"."invoices" add column "stripe_connect_account_id" text;

alter table "public"."invoices" add column "uses_connect_account" boolean default false;

alter table "public"."payments" add column "destination_account_id" text;

alter table "public"."payments" add column "stripe_payment_intent_id" text;

alter table "public"."payments" add column "transfer_id" text;

alter table "public"."payments" add column "transfer_status" text;

alter table "public"."payments" alter column "payment_method" drop not null;

alter table "public"."payments" alter column "recurring_interval" drop not null;

alter table "public"."studios" add column "bank_account_last4" text;

alter table "public"."studios" add column "bank_account_name" text;

alter table "public"."studios" add column "stripe_connect_enabled" boolean default false;

alter table "public"."studios" add column "stripe_connect_id" text;

alter table "public"."studios" add column "stripe_connect_onboarding_complete" boolean default false;

alter table "public"."studios" add column "uses_platform_payments" boolean default true;

alter table "public"."invoices" add constraint "invoices_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text, 'refunded'::text]))) not valid;

alter table "public"."invoices" validate constraint "invoices_status_check";

create policy "Studio owners can update stripe connect info"
on "public"."studios"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM users o
  WHERE ((o.id = studios.owner_id) AND (o.id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM users o
  WHERE ((o.id = studios.owner_id) AND (o.id = auth.uid())))));



