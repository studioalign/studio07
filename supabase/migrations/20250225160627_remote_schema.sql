alter table "public"."invoices" drop constraint "invoices_recurring_interval_check";

alter table "public"."payments" drop constraint "payments_recurring_interval_check";

alter table "public"."invoices" alter column "recurring_interval" set not null;

alter table "public"."subscriptions" add column "payment_method_id" text;

alter table "public"."invoices" add constraint "invoices_recurring_interval_check" CHECK ((recurring_interval = ANY (ARRAY['week'::text, 'month'::text, 'year'::text]))) not valid;

alter table "public"."invoices" validate constraint "invoices_recurring_interval_check";

alter table "public"."payments" add constraint "payments_recurring_interval_check" CHECK ((recurring_interval = ANY (ARRAY['week'::text, 'month'::text, 'year'::text]))) not valid;

alter table "public"."payments" validate constraint "payments_recurring_interval_check";


