alter table "public"."notifications" drop constraint "notifications_priority_check";

alter table "public"."payments" drop column "transaction_id";

alter table "public"."refunds" add column "stripe_refund_id" text;

alter table "public"."notifications" add constraint "notifications_priority_check" CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))) not valid;

alter table "public"."notifications" validate constraint "notifications_priority_check";


