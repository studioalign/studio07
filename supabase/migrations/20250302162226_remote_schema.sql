alter table "public"."invoices" drop constraint "invoices_discount_type_check";

alter table "public"."studios" drop column "uses_platform_payments";

alter table "public"."invoices" add constraint "invoices_discount_type_check" CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text]))) not valid;

alter table "public"."invoices" validate constraint "invoices_discount_type_check";


