ALTER TABLE invoices ADD COLUMN is_recurring boolean DEFAULT false;
ALTER TABLE invoices ADD COLUMN recurring_interval text CHECK (recurring_interval IN ('weekly', 'monthly', 'term'));
ALTER TABLE invoices ADD COLUMN recurring_end_date timestamp with time zone;
ALTER TABLE invoices ADD COLUMN discount_type text CHECK (discount_type IN ('percentage', 'amount'));
ALTER TABLE invoices ADD COLUMN discount_value numeric;
ALTER TABLE invoices ADD COLUMN discount_reason text;
