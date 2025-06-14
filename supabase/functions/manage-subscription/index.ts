import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
	apiVersion: "2025-01-27.acacia",
	httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

interface ManageSubscriptionRequest {
	action: "upgrade" | "cancel" | "update_payment_method";
	studioId: string;
	tierName?: string;
	subscriptionId?: string;
}

const pricingTiers = [
	{
		name: "Starter",
		price: 15,
		maxStudents: 100,
		stripeProductId: "prod_starter",
	},
	{
		name: "Growth",
		price: 20,
		maxStudents: 200,
		stripeProductId: "prod_growth",
	},
	{
		name: "Professional",
		price: 25,
		maxStudents: 300,
		stripeProductId: "prod_professional",
	},
	{ name: "Scale", price: 35, maxStudents: 500, stripeProductId: "prod_scale" },
	{
		name: "Enterprise",
		price: 50,
		maxStudents: 1000,
		stripeProductId: "prod_enterprise",
	},
];

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
			{
				global: {
					headers: { Authorization: req.headers.get("Authorization")! },
				},
			}
		);

		// Get the current user
		const {
			data: { user },
			error: userError,
		} = await supabaseClient.auth.getUser();
		if (userError || !user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		const {
			action,
			studioId,
			tierName,
			subscriptionId,
		}: ManageSubscriptionRequest = await req.json();

		// Verify user owns the studio
		const { data: studio, error: studioError } = await supabaseClient
			.from("studios")
			.select("*")
			.eq("id", studioId)
			.eq("owner_id", user.id)
			.single();

		if (studioError || !studio) {
			return new Response(
				JSON.stringify({ error: "Studio not found or access denied" }),
				{
					status: 403,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		switch (action) {
			case "upgrade": {
				if (!tierName) {
					return new Response(
						JSON.stringify({ error: "tierName is required for upgrade" }),
						{
							status: 400,
							headers: { ...corsHeaders, "Content-Type": "application/json" },
						}
					);
				}

				const tier = pricingTiers.find((t) => t.name === tierName);
				if (!tier) {
					return new Response(JSON.stringify({ error: "Invalid tier name" }), {
						status: 400,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					});
				}

				// Get current student count
				const { count: studentCount, error: countError } = await supabaseClient
					.from("students")
					.select("*", { count: "exact", head: true })
					.eq("studio_id", studioId);

				if (countError) {
					return new Response(
						JSON.stringify({ error: "Failed to get student count" }),
						{
							status: 500,
							headers: { ...corsHeaders, "Content-Type": "application/json" },
						}
					);
				}

				// Check if new tier can accommodate current students
				if (studentCount > tier.maxStudents) {
					return new Response(
						JSON.stringify({
							error: `Cannot downgrade to ${tier.name} plan. You have ${studentCount} students but this plan only allows ${tier.maxStudents} students.`,
						}),
						{
							status: 400,
							headers: { ...corsHeaders, "Content-Type": "application/json" },
						}
					);
				}

				// Check if studio already has a subscription (and get customer ID)
				let customerId = null;
				const { data: existingSubscription } = await supabaseClient
					.from("studio_subscriptions")
					.select("stripe_customer_id, stripe_subscription_id, tier")
					.eq("studio_id", studioId)
					.single();

				if (existingSubscription && existingSubscription.stripe_customer_id) {
					customerId = existingSubscription.stripe_customer_id;

					// If there's an existing subscription, update it instead of creating a new one
					if (existingSubscription.stripe_subscription_id) {
						try {
							// Retrieve the subscription to get the current period end
							const subscription = await stripe.subscriptions.retrieve(
								existingSubscription.stripe_subscription_id
							);

							// First, create or retrieve the product
							const productName = `${tier.name} Plan`;
							console.log("Looking for product:", productName);
							let product;
							try {
								// Try to find existing product
								const products = await stripe.products.search({
									query: `active:'true' AND name:'${productName}'`,
								});
								console.log("Found products:", products);
								product = products.data[0];
								console.log("Selected product:", product);

								// If product doesn't exist, create it
								if (!product) {
									console.log("Creating new product");
									product = await stripe.products.create({
										name: productName,
										description: `Up to ${tier.maxStudents} students`,
										metadata: {
											tier_name: tier.name,
											max_students: tier.maxStudents.toString(),
										},
										default_price_data: {
											currency: "gbp",
											unit_amount: tier.price * 100,
											recurring: {
												interval: "month",
											},
										},
									});
									console.log("Created new product:", product);
								}

								// Get or create price
								let price;
								if (product.default_price) {
									price = await stripe.prices.retrieve(
										product.default_price as string
									);
									console.log("Using existing price:", price);
								} else {
									price = await stripe.prices.create({
										product: product.id,
										currency: "gbp",
										unit_amount: tier.price * 100,
										recurring: {
											interval: "month",
										},
										metadata: {
											tier_name: tier.name,
											max_students: tier.maxStudents.toString(),
										},
									});
									console.log("Created new price:", price);
								}

								// Update the subscription with proration
								await stripe.subscriptions.update(
									existingSubscription.stripe_subscription_id,
									{
										proration_behavior: "always_invoice",
										items: [
											{
												id: subscription.items.data[0].id,
												price: price.id,
											},
										],
										metadata: {
											studio_id: studioId,
											tier_name: tierName,
										},
									}
								);

								return new Response(
									JSON.stringify({
										message: `Subscription updated to ${tier.name} plan. Changes will take effect at the start of the next billing period.`,
									}),
									{
										headers: {
											...corsHeaders,
											"Content-Type": "application/json",
										},
									}
								);
							} catch (error) {
								console.error("Error updating subscription:", error);
								return new Response(
									JSON.stringify({
										error: "Failed to update subscription",
										details: error.message,
									}),
									{
										status: 500,
										headers: {
											...corsHeaders,
											"Content-Type": "application/json",
										},
									}
								);
							}
						} catch (error) {
							console.error("Error updating subscription:", error);
							return new Response(
								JSON.stringify({
									error: "Failed to update subscription",
									details: error.message,
								}),
								{
									status: 500,
									headers: {
										...corsHeaders,
										"Content-Type": "application/json",
									},
								}
							);
						}
					}
				}

				// Create customer if needed
				if (!customerId) {
					const customer = await stripe.customers.create({
						email: user.email!,
						name: studio.name,
						metadata: {
							studio_id: studioId,
							user_id: user.id,
						},
					});
					customerId = customer.id;
				}

				// Create checkout session for new subscription
				const session = await stripe.checkout.sessions.create({
					customer: customerId,
					payment_method_types: ["card"],
					mode: "subscription",
					line_items: [
						{
							price_data: {
								currency: "gbp",
								product_data: {
									name: `${tier.name} Plan`,
									description: `Up to ${tier.maxStudents} students`,
									metadata: {
										tier_name: tier.name,
										max_students: tier.maxStudents.toString(),
									},
								},
								recurring: {
									interval: "month",
								},
								unit_amount: tier.price * 100, // Convert to pence
							},
							quantity: 1,
						},
					],
					success_url: `${req.headers.get("origin")}/dashboard/billing`,
					cancel_url: `${req.headers.get("origin")}/dashboard/billing`,
					subscription_data: {
						metadata: {
							studio_id: studioId,
							tier_name: tierName,
						},
					},
				});

				return new Response(JSON.stringify({ url: session.url }), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}

			case "cancel": {
				if (!subscriptionId) {
					return new Response(
						JSON.stringify({
							error: "subscriptionId is required for cancellation",
						}),
						{
							status: 400,
							headers: { ...corsHeaders, "Content-Type": "application/json" },
						}
					);
				}

				// Get subscription from database
				const { data: subscription, error: subError } = await supabaseClient
					.from("studio_subscriptions")
					.select("*")
					.eq("id", subscriptionId)
					.eq("studio_id", studioId)
					.single();

				if (subError || !subscription) {
					return new Response(
						JSON.stringify({ error: "Subscription not found" }),
						{
							status: 404,
							headers: { ...corsHeaders, "Content-Type": "application/json" },
						}
					);
				}

				if (subscription.stripe_subscription_id) {
					// Cancel the Stripe subscription at period end
					await stripe.subscriptions.update(
						subscription.stripe_subscription_id,
						{
							cancel_at_period_end: true,
						}
					);
				}

				// Update local subscription
				await supabaseClient
					.from("studio_subscriptions")
					.update({
						cancel_at_period_end: true,
						updated_at: new Date().toISOString(),
					})
					.eq("id", subscriptionId);

				return new Response(JSON.stringify({ success: true }), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}

			case "update_payment_method": {
				// Get customer ID from subscription
				const { data: subscription, error: subError } = await supabaseClient
					.from("studio_subscriptions")
					.select("stripe_customer_id")
					.eq("studio_id", studioId)
					.single();

				if (subError || !subscription || !subscription.stripe_customer_id) {
					return new Response(
						JSON.stringify({ error: "No subscription or customer ID found" }),
						{
							status: 400,
							headers: { ...corsHeaders, "Content-Type": "application/json" },
						}
					);
				}

				// Create customer portal session
				const portalSession = await stripe.billingPortal.sessions.create({
					customer: subscription.stripe_customer_id,
					return_url: `${req.headers.get("origin")}/dashboard/billing`,
				});

				return new Response(JSON.stringify({ url: portalSession.url }), {
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}

			default: {
				return new Response(JSON.stringify({ error: "Invalid action" }), {
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}
		}
	} catch (error) {
		console.error("Error in manage-subscription function:", error);
		return new Response(
			JSON.stringify({
				error: "Internal server error",
				details: error.message,
			}),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			}
		);
	}
});
