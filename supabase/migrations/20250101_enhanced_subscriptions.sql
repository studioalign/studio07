-- Enhanced Subscriptions Migration
-- Add support for yearly, lifetime, trials, and Stripe product/price management

-- Create table for storing Stripe products
CREATE TABLE IF NOT EXISTS "public"."stripe_products" (
    "id" uuid not null default uuid_generate_v4(),
    "stripe_product_id" text not null unique,
    "name" text not null,
    "description" text,
    "active" boolean default true,
    "tier_name" text not null, -- Starter, Growth, Professional, Scale, Enterprise
    "max_students" integer not null,
    "student_range_min" integer not null,
    "student_range_max" integer not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    PRIMARY KEY (id)
);

-- Create table for storing Stripe prices
CREATE TABLE IF NOT EXISTS "public"."stripe_prices" (
    "id" uuid not null default uuid_generate_v4(),
    "stripe_price_id" text not null unique,
    "stripe_product_id" text not null,
    "product_id" uuid not null,
    "amount_gbp" numeric(10,2) not null,
    "currency" text default 'gbp',
    "billing_interval" text not null, -- monthly, yearly, lifetime
    "interval_count" integer default 1,
    "trial_period_days" integer default 5,
    "active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    PRIMARY KEY (id)
);

-- Add foreign key constraint after both tables are created
ALTER TABLE "public"."stripe_prices" 
ADD CONSTRAINT "stripe_prices_product_id_fkey" 
FOREIGN KEY (product_id) REFERENCES stripe_products(id) ON DELETE CASCADE;

-- Add new columns to studio_subscriptions table
ALTER TABLE "public"."studio_subscriptions" 
ADD COLUMN IF NOT EXISTS "billing_interval" text default 'monthly',
ADD COLUMN IF NOT EXISTS "trial_start" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "trial_end" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "is_lifetime" boolean default false,
ADD COLUMN IF NOT EXISTS "lifetime_payment_id" text,
ADD COLUMN IF NOT EXISTS "stripe_product_id" text,
ADD COLUMN IF NOT EXISTS "next_billing_date" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "auto_upgrade_enabled" boolean default true;

-- Update billing_history to support more transaction types
ALTER TABLE "public"."billing_history"
ADD COLUMN IF NOT EXISTS "transaction_type" text default 'subscription',
ADD COLUMN IF NOT EXISTS "billing_interval" text,
ADD COLUMN IF NOT EXISTS "proration_amount" numeric(10,2) default 0,
ADD COLUMN IF NOT EXISTS "upgrade_from_tier" text,
ADD COLUMN IF NOT EXISTS "upgrade_to_tier" text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stripe_products_tier_name ON public.stripe_products(tier_name);
CREATE INDEX IF NOT EXISTS idx_stripe_products_active ON public.stripe_products(active);
CREATE INDEX IF NOT EXISTS idx_stripe_prices_product_id ON public.stripe_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_stripe_prices_billing_interval ON public.stripe_prices(billing_interval);
CREATE INDEX IF NOT EXISTS idx_stripe_prices_active ON public.stripe_prices(active);
CREATE INDEX IF NOT EXISTS idx_studio_subscriptions_billing_interval ON public.studio_subscriptions(billing_interval);
CREATE INDEX IF NOT EXISTS idx_studio_subscriptions_trial_end ON public.studio_subscriptions(trial_end);
CREATE INDEX IF NOT EXISTS idx_billing_history_transaction_type ON public.billing_history(transaction_type);

-- Add constraints
ALTER TABLE "public"."stripe_prices" 
ADD CONSTRAINT "stripe_prices_billing_interval_check" 
CHECK (billing_interval = ANY (ARRAY['monthly'::text, 'yearly'::text, 'lifetime'::text]));

ALTER TABLE "public"."studio_subscriptions" 
ADD CONSTRAINT "studio_subscriptions_billing_interval_check" 
CHECK (billing_interval = ANY (ARRAY['monthly'::text, 'yearly'::text, 'lifetime'::text]));

ALTER TABLE "public"."billing_history" 
ADD CONSTRAINT "billing_history_transaction_type_check" 
CHECK (transaction_type = ANY (ARRAY['subscription'::text, 'upgrade'::text, 'downgrade'::text, 'trial'::text, 'lifetime'::text, 'proration'::text]));

-- Drop old tier constraint and add new flexible one
ALTER TABLE "public"."studio_subscriptions" DROP CONSTRAINT IF EXISTS "studio_subscriptions_tier_check";
-- We'll validate tiers against the stripe_products table instead

-- Function to get available tiers with pricing
CREATE OR REPLACE FUNCTION public.get_available_tiers()
RETURNS TABLE(
    tier_name text,
    max_students integer,
    student_range_min integer,
    student_range_max integer,
    monthly_price numeric,
    yearly_price numeric,
    lifetime_price numeric,
    stripe_product_id text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.tier_name,
        sp.max_students,
        sp.student_range_min,
        sp.student_range_max,
        monthly.amount_gbp as monthly_price,
        yearly.amount_gbp as yearly_price,
        lifetime.amount_gbp as lifetime_price,
        sp.stripe_product_id
    FROM stripe_products sp
    LEFT JOIN stripe_prices monthly ON sp.id = monthly.product_id AND monthly.billing_interval = 'monthly' AND monthly.active = true
    LEFT JOIN stripe_prices yearly ON sp.id = yearly.product_id AND yearly.billing_interval = 'yearly' AND yearly.active = true
    LEFT JOIN stripe_prices lifetime ON sp.id = lifetime.product_id AND lifetime.billing_interval = 'lifetime' AND lifetime.active = true
    WHERE sp.active = true
    ORDER BY sp.student_range_min;
END;
$$;

-- Function to get required tier for student count
CREATE OR REPLACE FUNCTION public.get_required_tier_for_count(student_count integer)
RETURNS TABLE(
    tier_name text,
    max_students integer,
    monthly_price numeric,
    yearly_price numeric,
    lifetime_price numeric,
    stripe_product_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.tier_name,
        sp.max_students,
        monthly.amount_gbp as monthly_price,
        yearly.amount_gbp as yearly_price,
        lifetime.amount_gbp as lifetime_price,
        sp.stripe_product_id
    FROM stripe_products sp
    LEFT JOIN stripe_prices monthly ON sp.id = monthly.product_id AND monthly.billing_interval = 'monthly' AND monthly.active = true
    LEFT JOIN stripe_prices yearly ON sp.id = yearly.product_id AND yearly.billing_interval = 'yearly' AND yearly.active = true
    LEFT JOIN stripe_prices lifetime ON sp.id = lifetime.product_id AND lifetime.billing_interval = 'lifetime' AND lifetime.active = true
    WHERE sp.active = true 
    AND student_count >= sp.student_range_min 
    AND student_count <= sp.student_range_max
    LIMIT 1;
END;
$$;

-- Function to calculate prorated upgrade amount
CREATE OR REPLACE FUNCTION public.calculate_proration_amount(
    p_studio_id uuid,
    p_new_tier_name text,
    p_billing_interval text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_sub record;
    new_price numeric;
    current_price numeric;
    remaining_days integer;
    total_days integer;
    proration_amount numeric := 0;
BEGIN
    -- Get current subscription
    SELECT * INTO current_sub 
    FROM studio_subscriptions 
    WHERE studio_id = p_studio_id AND status = 'active';
    
    IF current_sub.id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Get new price
    SELECT sp.amount_gbp INTO new_price
    FROM stripe_prices sp
    JOIN stripe_products prod ON sp.product_id = prod.id
    WHERE prod.tier_name = p_new_tier_name 
    AND sp.billing_interval = p_billing_interval
    AND sp.active = true;
    
    -- Get current price
    current_price := current_sub.price_gbp;
    
    -- Calculate proration based on billing interval
    IF p_billing_interval = 'yearly' AND current_sub.billing_interval = 'yearly' THEN
        -- Calculate remaining days in current period
        remaining_days := EXTRACT(DAY FROM (current_sub.current_period_end - CURRENT_TIMESTAMP));
        total_days := EXTRACT(DAY FROM (current_sub.current_period_end - current_sub.current_period_start));
        
        -- Proration = (new_price - current_price) * (remaining_days / total_days)
        proration_amount := (new_price - current_price) * (remaining_days::numeric / total_days::numeric);
        
    ELSIF p_billing_interval = 'monthly' AND current_sub.billing_interval = 'monthly' THEN
        -- For monthly, calculate remaining days in current month
        remaining_days := EXTRACT(DAY FROM (current_sub.current_period_end - CURRENT_TIMESTAMP));
        total_days := EXTRACT(DAY FROM (current_sub.current_period_end - current_sub.current_period_start));
        
        proration_amount := (new_price - current_price) * (remaining_days::numeric / total_days::numeric);
        
    ELSIF p_billing_interval = 'lifetime' THEN
        -- For lifetime, charge the full difference
        proration_amount := new_price - COALESCE(current_price, 0);
    END IF;
    
    RETURN GREATEST(proration_amount, 0);
END;
$$;

-- Function to check if upgrade is required
CREATE OR REPLACE FUNCTION public.check_upgrade_required(p_studio_id uuid)
RETURNS TABLE(
    requires_upgrade boolean,
    current_tier text,
    required_tier text,
    current_student_count integer,
    max_allowed integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    student_count integer;
    current_subscription record;
    required_tier_info record;
BEGIN
    -- Get current student count
    student_count := get_studio_student_count(p_studio_id);
    
    -- Get current subscription
    SELECT * INTO current_subscription 
    FROM studio_subscriptions 
    WHERE studio_id = p_studio_id AND status = 'active';
    
    -- Get required tier for current student count
    SELECT * INTO required_tier_info 
    FROM get_required_tier_for_count(student_count);
    
    RETURN QUERY SELECT 
        CASE 
            WHEN current_subscription.id IS NULL THEN true
            WHEN student_count > current_subscription.max_students THEN true
            ELSE false
        END as requires_upgrade,
        COALESCE(current_subscription.tier, 'none') as current_tier,
        COALESCE(required_tier_info.tier_name, 'Enterprise') as required_tier,
        student_count as current_student_count,
        COALESCE(current_subscription.max_students, 0) as max_allowed;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON TABLE public.stripe_products TO authenticated;
GRANT ALL ON TABLE public.stripe_products TO service_role;
GRANT ALL ON TABLE public.stripe_prices TO authenticated;
GRANT ALL ON TABLE public.stripe_prices TO service_role;

-- RLS Policies for stripe_products and stripe_prices
ALTER TABLE public.stripe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_prices ENABLE ROW LEVEL SECURITY;

-- Allow all users to read products and prices (they're public)
CREATE POLICY "Anyone can view stripe products" ON public.stripe_products FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can view stripe prices" ON public.stripe_prices FOR SELECT TO public USING (true);

-- Only service role can manage products and prices
CREATE POLICY "Service role can manage stripe products" ON public.stripe_products FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage stripe prices" ON public.stripe_prices FOR ALL TO service_role USING (true); 