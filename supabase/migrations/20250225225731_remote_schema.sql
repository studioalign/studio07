alter table "public"."invoices" add column "pdf_url" text;

alter table "public"."invoices" add column "stripe_invoice_id" text;

alter table "public"."payments" drop column "stripe_invoice_pdf";

alter table "public"."payments" drop column "stripe_invoice_url";


