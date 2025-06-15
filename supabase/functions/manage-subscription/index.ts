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
		stripePriceId: "price_1Ra54yJf1ZFVuVTPDi3AJYIz", // Replace with actual Price ID from Stripe Dashboard
	},
	{
		name: "Growth",
		price: 20,
		maxStudents: 200,
		stripePriceId: "price_1Ra58UJf1ZFVuVTPIjMXl7zC", // Replace with actual Price ID from Stripe Dashboard
	},
	{
		name: "Professional",
		price: 25,
		maxStudents: 300,
		stripePriceId: "price_1Ra5AJJf1ZFVuVTP2S0CPlAl", // Replace with actual Price ID from Stripe Dashboard
	},
	{
		name: "Scale",
		price: 35,
		maxStudents: 500,
		stripePriceId: "price_1Ra0hbJf1ZFVuVTPRvKS0VCg",
	},
	{
		name: "Enterprise",
		price: 50,
		maxStudents: 1000,
		stripePriceId: "price_1Ra595Jf1ZFVuVTPRcLYRwGf", // Replace with actual Price ID from Stripe Dashboard
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

				// Check if this is a downgrade
				const currentTierPrice = existingSubscription?.tier
					? pricingTiers.find((t) => t.name === existingSubscription.tier)
							?.price ?? 0
					: 0;
				const isDowngrade =
					existingSubscription?.tier && currentTierPrice > tier.price;

				if (existingSubscription?.stripe_subscription_id) {
					// For existing subscriptions, handle upgrades and downgrades differently
					const subscription = await stripe.subscriptions.retrieve(
						existingSubscription.stripe_subscription_id
					);

					if (isDowngrade) {
						// For downgrades: Schedule change for end of billing period
						// Use direct subscription update to avoid immediate charges
						await stripe.subscriptions.update(
							existingSubscription.stripe_subscription_id,
							{
								items: [
									{
										id: subscription.items.data[0].id,
										price: tier.stripePriceId,
									},
								],
								proration_behavior: "none", // No immediate charge
								billing_cycle_anchor: "unchanged", // Keep current billing date
								metadata: {
									scheduled_tier: tierName,
									is_downgrade: "true",
									previous_tier: existingSubscription.tier,
								},
							}
						);

						// Update local subscription record to reflect scheduled change
						await supabaseClient
							.from("studio_subscriptions")
							.update({
								scheduled_tier: tierName,
								updated_at: new Date().toISOString(),
							})
							.eq("studio_id", studioId);

						return new Response(
							JSON.stringify({
								success: true,
								message: "Downgrade scheduled for next billing period",
							}),
							{
								headers: { ...corsHeaders, "Content-Type": "application/json" },
							}
						);
					} else {
						// For upgrades: Create checkout session for immediate payment
						// Mark the old subscription for replacement
						await stripe.subscriptions.update(
							existingSubscription.stripe_subscription_id,
							{
								metadata: {
									being_replaced: "true",
									new_tier: tierName,
								},
								cancel_at_period_end: true,
							}
						);

						// Create checkout session for the upgrade
						const session = await stripe.checkout.sessions.create({
							customer: customerId,
							payment_method_types: ["card"],
							mode: "subscription",
							line_items: [
								{
									price: tier.stripePriceId,
									quantity: 1,
								},
							],
							success_url: `${req.headers.get("origin")}/dashboard/billing`,
							cancel_url: `${req.headers.get("origin")}/dashboard/billing`,
							subscription_data: {
								metadata: {
									studio_id: studioId,
									tier_name: tierName,
									replacing_subscription_id:
										existingSubscription.stripe_subscription_id,
									previous_tier: existingSubscription.tier,
									is_upgrade: "true",
								},
							},
						});

						return new Response(JSON.stringify({ url: session.url }), {
							headers: { ...corsHeaders, "Content-Type": "application/json" },
						});
					}
				}

				// For new subscriptions, create checkout session
				const session = await stripe.checkout.sessions.create({
					customer: customerId,
					payment_method_types: ["card"],
					mode: "subscription",
					line_items: [
						{
							price: tier.stripePriceId, // Use predefined price ID
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
