import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
	apiVersion: "2024-06-20",
});

const supabaseClient = createClient(
	Deno.env.get("SUPABASE_URL") ?? "",
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Define the tier configuration
const TIER_CONFIG = [
	{
		tier_name: "Starter",
		max_students: 100,
		student_range_min: 1,
		student_range_max: 100,
		pricing: {
			monthly: 15,
			yearly: 150,
			lifetime: 400,
		},
	},
	{
		tier_name: "Growth",
		max_students: 200,
		student_range_min: 101,
		student_range_max: 200,
		pricing: {
			monthly: 20,
			yearly: 200,
			lifetime: 550,
		},
	},
	{
		tier_name: "Professional",
		max_students: 300,
		student_range_min: 201,
		student_range_max: 300,
		pricing: {
			monthly: 25,
			yearly: 250,
			lifetime: 700,
		},
	},
	{
		tier_name: "Scale",
		max_students: 500,
		student_range_min: 301,
		student_range_max: 500,
		pricing: {
			monthly: 35,
			yearly: 350,
			lifetime: 1000,
		},
	},
	{
		tier_name: "Enterprise",
		max_students: 1000,
		student_range_min: 501,
		student_range_max: 1000,
		pricing: {
			monthly: 50,
			yearly: 500,
			lifetime: 1400,
		},
	},
];

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const { action } = await req.json();

		if (action === "sync") {
			console.log("🔄 Starting Stripe products sync...");

			// Fetch all products from Stripe
			const stripeProducts = await stripe.products.list({
				limit: 100,
				expand: ["data.default_price"],
			});

			console.log(`📦 Found ${stripeProducts.data.length} products in Stripe`);

			// Fetch all prices from Stripe
			const stripePrices = await stripe.prices.list({
				limit: 100,
			});

			console.log(`💰 Found ${stripePrices.data.length} prices in Stripe`);

			// Group prices by product
			const pricesByProduct = stripePrices.data.reduce((acc, price) => {
				const productId = price.product as string;
				if (!acc[productId]) acc[productId] = [];
				acc[productId].push(price);
				return acc;
			}, {} as Record<string, any[]>);

			// Sync products to database
			for (const stripeProduct of stripeProducts.data) {
				console.log(`🔄 Processing product: ${stripeProduct.name}`);

				// Determine tier info from product name or metadata
				let tierInfo = TIER_CONFIG.find((tier) =>
					stripeProduct.name
						.toLowerCase()
						.includes(tier.tier_name.toLowerCase())
				);

				// Fallback: try to match by metadata
				if (!tierInfo && stripeProduct.metadata?.tier_name) {
					tierInfo = TIER_CONFIG.find(
						(tier) => tier.tier_name === stripeProduct.metadata.tier_name
					);
				}

				if (!tierInfo) {
					console.log(
						`⚠️ Skipping product ${stripeProduct.name} - no tier info found`
					);
					continue;
				}

				// Upsert product
				const { data: productData, error: productError } = await supabaseClient
					.from("stripe_products")
					.upsert(
						{
							stripe_product_id: stripeProduct.id,
							name: stripeProduct.name,
							description: stripeProduct.description,
							active: stripeProduct.active,
							tier_name: tierInfo.tier_name,
							max_students: tierInfo.max_students,
							student_range_min: tierInfo.student_range_min,
							student_range_max: tierInfo.student_range_max,
							updated_at: new Date().toISOString(),
						},
						{
							onConflict: "stripe_product_id",
						}
					)
					.select()
					.single();

				if (productError) {
					console.error(
						`❌ Error upserting product ${stripeProduct.id}:`,
						productError
					);
					continue;
				}

				console.log(`✅ Product synced: ${productData.name}`);

				// Sync prices for this product
				const productPrices = pricesByProduct[stripeProduct.id] || [];

				for (const stripePrice of productPrices) {
					console.log(`💰 Processing price: ${stripePrice.id}`);

					// Determine billing interval
					let billingInterval = "monthly";
					if (stripePrice.type === "one_time") {
						billingInterval = "lifetime";
					} else if (stripePrice.recurring?.interval === "year") {
						billingInterval = "yearly";
					}

					// Convert amount from pence to pounds
					const amountGbp = (stripePrice.unit_amount || 0) / 100;

					// Upsert price
					const { error: priceError } = await supabaseClient
						.from("stripe_prices")
						.upsert(
							{
								stripe_price_id: stripePrice.id,
								stripe_product_id: stripeProduct.id,
								product_id: productData.id,
								amount_gbp: amountGbp,
								currency: stripePrice.currency,
								billing_interval: billingInterval,
								interval_count: stripePrice.recurring?.interval_count || 1,
								trial_period_days: 5, // Default trial period
								active: stripePrice.active,
								updated_at: new Date().toISOString(),
							},
							{
								onConflict: "stripe_price_id",
							}
						);

					if (priceError) {
						console.error(
							`❌ Error upserting price ${stripePrice.id}:`,
							priceError
						);
						continue;
					}

					console.log(`✅ Price synced: ${amountGbp} GBP (${billingInterval})`);
				}
			}

			console.log("🎉 Stripe products sync completed successfully");

			return new Response(
				JSON.stringify({
					success: true,
					message: "Products and prices synced successfully",
					synced: {
						products: stripeProducts.data.length,
						prices: stripePrices.data.length,
					},
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		} else if (action === "get_tiers") {
			// Return available tiers from database
			console.log("🔄 Getting tiers from database");
			const { data: tiers, error } = await supabaseClient.rpc(
				"get_available_tiers"
			);

			console.log("🔄 Tiers:", tiers);

			if (error) {
				throw error;
			}

			return new Response(JSON.stringify({ success: true, tiers }), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		} else if (action === "create_missing_products") {
			console.log("🔄 Creating missing Stripe products...");

			const results = [];

			for (const tierConfig of TIER_CONFIG) {
				console.log(`🔄 Processing tier: ${tierConfig.tier_name}`);

				// Create product in Stripe
				const stripeProduct = await stripe.products.create({
					name: `${tierConfig.tier_name} Plan (${tierConfig.student_range_min}-${tierConfig.student_range_max} Students)`,
					description: `Perfect for studios with ${tierConfig.student_range_min}-${tierConfig.student_range_max} students. Includes all essential features.`,
					metadata: {
						tier_name: tierConfig.tier_name,
						max_students: tierConfig.max_students.toString(),
						student_range_min: tierConfig.student_range_min.toString(),
						student_range_max: tierConfig.student_range_max.toString(),
					},
				});

				console.log(`✅ Created product: ${stripeProduct.name}`);

				// Create prices for each billing interval
				const prices = [];

				// Monthly price
				const monthlyPrice = await stripe.prices.create({
					product: stripeProduct.id,
					unit_amount: tierConfig.pricing.monthly * 100, // Convert to pence
					currency: "gbp",
					recurring: {
						interval: "month",
					},
					metadata: {
						billing_interval: "monthly",
						tier_name: tierConfig.tier_name,
					},
				});
				prices.push({ type: "monthly", price: monthlyPrice });

				// Yearly price
				const yearlyPrice = await stripe.prices.create({
					product: stripeProduct.id,
					unit_amount: tierConfig.pricing.yearly * 100, // Convert to pence
					currency: "gbp",
					recurring: {
						interval: "year",
					},
					metadata: {
						billing_interval: "yearly",
						tier_name: tierConfig.tier_name,
					},
				});
				prices.push({ type: "yearly", price: yearlyPrice });

				// Lifetime price (one-time payment)
				const lifetimePrice = await stripe.prices.create({
					product: stripeProduct.id,
					unit_amount: tierConfig.pricing.lifetime * 100, // Convert to pence
					currency: "gbp",
					metadata: {
						billing_interval: "lifetime",
						tier_name: tierConfig.tier_name,
					},
				});
				prices.push({ type: "lifetime", price: lifetimePrice });

				console.log(
					`✅ Created ${prices.length} prices for ${tierConfig.tier_name}`
				);

				results.push({
					tier: tierConfig.tier_name,
					product: stripeProduct,
					prices: prices,
				});
			}

			// Now sync the newly created products
			const syncResponse = await fetch(req.url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "sync" }),
			});

			return new Response(
				JSON.stringify({
					success: true,
					message: "Products and prices created and synced successfully",
					created: results,
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		return new Response(JSON.stringify({ error: "Invalid action" }), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("❌ Error in sync-stripe-products:", error);
		return new Response(
			JSON.stringify({
				error: error.message,
				details: error.stack,
			}),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			}
		);
	}
});
