-- Add supersession tracking columns to studio_subscriptions table
-- This helps handle webhook race conditions where subscription.deleted events
-- arrive after payment events during upgrades

-- Add supersession tracking to studio_subscriptions
ALTER TABLE public.studio_subscriptions 
ADD COLUMN IF NOT EXISTS superseded_by text,
ADD COLUMN IF NOT EXISTS superseded_at timestamp with time zone;

-- Add supersession tracking to billing_history for better audit trail
ALTER TABLE public.billing_history 
ADD COLUMN IF NOT EXISTS superseded_by text,
ADD COLUMN IF NOT EXISTS proration_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS upgrade_from_tier text,
ADD COLUMN IF NOT EXISTS upgrade_to_tier text,
ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'subscription',
ADD COLUMN IF NOT EXISTS billing_interval text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_studio_subscriptions_superseded 
ON studio_subscriptions(superseded_by, superseded_at) 
WHERE superseded_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_history_transaction_type 
ON billing_history(transaction_type);

CREATE INDEX IF NOT EXISTS idx_billing_history_stripe_subscription_id 
ON billing_history(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

-- Add constraints for transaction_type values
ALTER TABLE public.billing_history 
ADD CONSTRAINT IF NOT EXISTS billing_history_transaction_type_check 
CHECK (transaction_type IN ('subscription', 'upgrade', 'downgrade', 'trial', 'lifetime', 'proration', 'superseded'));

-- Add constraints for billing_interval values  
ALTER TABLE public.billing_history 
ADD CONSTRAINT IF NOT EXISTS billing_history_billing_interval_check 
CHECK (billing_interval IN ('monthly', 'yearly', 'lifetime') OR billing_interval IS NULL); 