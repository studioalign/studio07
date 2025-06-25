/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import type { Database } from "../_shared/database-types.ts";

// Define a type for our tier data to avoid using 'any'
type TierData = {
	stripe_price_id: string;
	stripe_product_id: string;
	trial_period_days: number;
	amount_gbp: number;
	billing_interval: "monthly" | "yearly" | "lifetime";
	stripe_products: {
		tier_name: string;
		max_students: number;
	};
};

type Subscription = Database["public"]["Tables"]["studio_subscriptions"]["Row"];

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

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const {
			action,
			studioId,
			tierName,
			billingInterval,
			subscriptionId,
			promotionCode,
		} = await req.json();

		console.log(`🔄 Processing ${action} request:`, {
			studioId,
			tierName,
			billingInterval,
			subscriptionId,
			promotionCode,
		});

		if (action === "create_subscription") {
			return await handleCreateSubscription(
				req,
				studioId,
				tierName,
				billingInterval
			);
		} else if (action === "upgrade") {
			return await handleUpgrade(req, studioId, tierName, billingInterval);
		} else if (action === "automatic_upgrade") {
			return await handleAutomaticUpgrade(req, studioId);
		} else if (action === "cancel") {
			return await handleCancellation(studioId, subscriptionId);
		} else if (action === "check_upgrade_required") {
			return await checkUpgradeRequired(studioId);
		} else if (action === "get_pricing") {
			return await getPricing();
		} else if (action === "preview_upgrade") {
			return await previewUpgrade(studioId, tierName, billingInterval);
		} else if (action === "apply_promotion_and_upgrade") {
			return await applyPromotionAndUpgrade(
				studioId,
				tierName,
				billingInterval,
				promotionCode
			);
		}

		return new Response(JSON.stringify({ error: "Invalid action" }), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("❌ Error in manage-subscription:", error);
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

async function handleCreateSubscription(
	req: Request,
	studioId: string,
	tierName: string,
	billingInterval: string
) {
	console.log(`🔄 Creating ${billingInterval} subscription for ${tierName}`);

	// Get tier pricing from database
	const { data: tierData, error: tierError } = await supabaseClient
		.from("stripe_prices")
		.select(
			`
			*,
			stripe_products!inner(*)
		`
		)
		.eq("stripe_products.tier_name", tierName)
		.eq("billing_interval", billingInterval)
		.eq("active", true)
		.single();

	if (tierError || !tierData) {
		throw new Error(
			`Tier ${tierName} with ${billingInterval} billing not found`
		);
	}

	// Get or create Stripe customer
	const customerId = await getOrCreateStripeCustomer(studioId);

	if (billingInterval === "lifetime") {
		// Handle lifetime subscription (one-time payment)
		return await createLifetimeSubscription(
			req,
			studioId,
			tierData,
			customerId
		);
	} else {
		// Handle recurring subscription
		return await createRecurringSubscription(
			req,
			studioId,
			tierData,
			customerId
		);
	}
}

async function createLifetimeSubscription(
	req: Request,
	studioId: string,
	tierData: TierData,
	customerId: string
) {
	console.log("🔄 Creating lifetime subscription");

	// Prepare checkout session configuration
	const sessionConfig: Stripe.Checkout.SessionCreateParams = {
		customer: customerId,
		payment_method_types: ["card"],
		mode: "payment",
		// make sure the invoice + receipt is sent to the user
		invoice_creation: {
			enabled: true,
		},
		line_items: [
			{
				price: tierData.stripe_price_id,
				quantity: 1,
			},
		],
		success_url: `${req.headers.get("origin")}/dashboard/billing?success=true`,
		cancel_url: `${req.headers.get("origin")}/dashboard/billing?canceled=true`,
		allow_promotion_codes: true, // Let users enter discount codes in Stripe checkout
		metadata: {
			studio_id: studioId,
			tier_name: tierData.stripe_products.tier_name,
			billing_interval: "lifetime",
			subscription_type: "lifetime",
		},
	};

	// Create checkout session
	const session = await stripe.checkout.sessions.create(sessionConfig);

	return new Response(
		JSON.stringify({
			success: true,
			url: session.url,
			type: "lifetime",
		}),
		{
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		}
	);
}

async function createRecurringSubscription(
	req: Request,
	studioId: string,
	tierData: TierData,
	customerId: string
) {
	console.log(
		`🔄 Creating ${tierData.billing_interval} recurring subscription`
	);

	// Prepare checkout session configuration
	const sessionConfig: Stripe.Checkout.SessionCreateParams = {
		customer: customerId,
		payment_method_types: ["card"],
		mode: "subscription",
		line_items: [
			{
				price: tierData.stripe_price_id,
				quantity: 1,
			},
		],
		success_url: `${req.headers.get("origin")}/dashboard/billing?success=true`,
		cancel_url: `${req.headers.get("origin")}/dashboard/billing?canceled=true`,
		allow_promotion_codes: true, // Let users enter discount codes in Stripe checkout
		subscription_data: {
			trial_period_days: tierData.trial_period_days || 5,
			metadata: {
				studio_id: studioId,
				tier_name: tierData.stripe_products.tier_name,
				billing_interval: tierData.billing_interval,
			},
		},
	};

	// Create checkout session
	const session = await stripe.checkout.sessions.create(sessionConfig);

	return new Response(
		JSON.stringify({
			success: true,
			url: session.url,
			type: "recurring",
			trial_days: tierData.trial_period_days || 5,
		}),
		{
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		}
	);
}

async function handleUpgrade(
	req: Request,
	studioId: string,
	tierName: string,
	billingInterval: string
) {
	console.log(`🔄 Handling upgrade to ${tierName} (${billingInterval})`);

	// Get current subscription (active or trialing)
	const { data: currentSub, error: subError } = await supabaseClient
		.from("studio_subscriptions")
		.select("*")
		.eq("studio_id", studioId)
		.in("status", ["active", "trialing"])
		.single();

	// Check if there's a pending cancellation
	if (currentSub?.cancel_at_period_end) {
		throw new Error(
			"Cannot create new subscription while current subscription is pending cancellation. " +
				"Your current subscription will remain active until the end of the billing period."
		);
	}

	if (subError || !currentSub) {
		// No current subscription, create new one
		console.log(
			"🤔 No active or trial subscription found, creating a new one."
		);
		return await handleCreateSubscription(
			req,
			studioId,
			tierName,
			billingInterval
		);
	}

	// Get new tier pricing
	const { data: newTierData, error: tierError } = await supabaseClient
		.from("stripe_prices")
		.select(
			`
			*,
			stripe_products!inner(*)
		`
		)
		.eq("stripe_products.tier_name", tierName)
		.eq("billing_interval", billingInterval)
		.eq("active", true)
		.single();

	if (tierError || !newTierData) {
		throw new Error(
			`New tier ${tierName} with ${billingInterval} billing not found`
		);
	}

	// Handle lifetime subscription upgrades - these need to go through checkout
	if (currentSub.is_lifetime && billingInterval === "lifetime") {
		console.log(
			"🔄 Lifetime to lifetime upgrade - creating new checkout session"
		);
		return await createLifetimeSubscription(
			req,
			studioId,
			newTierData,
			await getOrCreateStripeCustomer(studioId)
		);
	}

	// Handle other billing interval changes
	if (currentSub.billing_interval !== billingInterval) {
		console.log(
			`🔄 Billing interval change: ${currentSub.billing_interval} → ${billingInterval}`
		);
		return await handleBillingIntervalChange(
			req,
			studioId,
			currentSub,
			newTierData
		);
	}

	// Same billing interval - direct subscription update (only for recurring subscriptions)
	if (currentSub.stripe_subscription_id && !currentSub.is_lifetime) {
		console.log("🔄 Updating existing Stripe subscription directly");
		return await handleDirectSubscriptionUpdate(
			studioId,
			currentSub,
			newTierData
		);
	}

	// Fallback: if no Stripe subscription ID or is lifetime, create new subscription
	console.log(
		"🔄 No active Stripe subscription found - creating new subscription"
	);
	return await handleCreateSubscription(
		req,
		studioId,
		tierName,
		billingInterval
	);
}

async function handleBillingIntervalChange(
	req: Request,
	studioId: string,
	currentSub: Subscription,
	newTierData: TierData
) {
	console.log(
		`🔄 Processing billing interval change: ${currentSub.billing_interval} → ${newTierData.billing_interval}`
	);

	// Handle lifetime transitions
	if (currentSub.is_lifetime && newTierData.billing_interval !== "lifetime") {
		return await handleLifetimeToRecurring(
			req,
			studioId,
			currentSub,
			newTierData
		);
	}

	if (!currentSub.is_lifetime && newTierData.billing_interval === "lifetime") {
		return await handleRecurringToLifetime(
			req,
			studioId,
			currentSub,
			newTierData
		);
	}

	// Handle recurring interval changes (monthly ↔ yearly)
	if (
		currentSub.stripe_subscription_id &&
		newTierData.billing_interval !== "lifetime"
	) {
		return await handleRecurringIntervalChange(
			studioId,
			currentSub,
			newTierData
		);
	}

	// Fallback to creating new subscription
	return await handleCreateSubscription(
		req,
		studioId,
		newTierData.stripe_products.tier_name,
		newTierData.billing_interval
	);
}

async function handleRecurringIntervalChange(
	studioId: string,
	currentSub: Subscription,
	newTierData: TierData
) {
	console.log(
		`🔄 Changing recurring subscription interval: ${currentSub.billing_interval} → ${newTierData.billing_interval}`
	);

	// Get current Stripe subscription
	const subscription = await stripe.subscriptions.retrieve(
		currentSub.stripe_subscription_id
	);

	// For interval changes, we need to handle proration carefully
	let prorationBehavior = "create_prorations";

	// If in trial, don't prorate
	if (subscription.status === "trialing") {
		prorationBehavior = "none";
	}

	// Update subscription with new price and interval
	const updatedSubscription = await stripe.subscriptions.update(
		currentSub.stripe_subscription_id,
		{
			items: [
				{
					id: subscription.items.data[0].id,
					price: newTierData.stripe_price_id,
				},
			],
			proration_behavior: prorationBehavior,
			billing_cycle_anchor: "now", // Reset billing cycle for interval changes
			metadata: {
				...subscription.metadata,
				tier_name: newTierData.stripe_products.tier_name,
				billing_interval: newTierData.billing_interval,
				upgraded_at: new Date().toISOString(),
				previous_tier: currentSub.tier,
				previous_interval: currentSub.billing_interval,
			},
		}
	);

	console.log("✅ Billing interval changed successfully");

	// Update our local subscription record
	await supabaseClient
		.from("studio_subscriptions")
		.update({
			tier: newTierData.stripe_products.tier_name,
			max_students: newTierData.stripe_products.max_students,
			price_gbp: newTierData.amount_gbp,
			billing_interval: newTierData.billing_interval,
			stripe_price_id: newTierData.stripe_price_id,
			stripe_product_id: newTierData.stripe_product_id,
			current_period_start: new Date(
				updatedSubscription.current_period_start * 1000
			).toISOString(),
			current_period_end: new Date(
				updatedSubscription.current_period_end * 1000
			).toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq("id", currentSub.id);

	// Update studio max_students
	await supabaseClient
		.from("studios")
		.update({
			max_students: newTierData.stripe_products.max_students,
			subscription_tier: newTierData.stripe_products.tier_name,
			updated_at: new Date().toISOString(),
		})
		.eq("id", studioId);

	// Calculate explanation based on the change
	let billingExplanation = "";
	let chargeAmount = 0;

	if (subscription.status === "trialing") {
		billingExplanation = `Plan and billing interval updated during trial. Your new ${newTierData.billing_interval} billing cycle starts when the trial ends.`;
	} else {
		// For interval changes, Stripe handles proration automatically
		// The user will be charged/credited the difference immediately

		if (
			currentSub.billing_interval === "monthly" &&
			newTierData.billing_interval === "yearly"
		) {
			// Monthly to yearly: calculate remaining months benefit
			const now = new Date();
			const periodEnd = new Date(currentSub.current_period_end);
			const daysRemaining = Math.ceil(
				(periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
			);
			const monthlyRefund = (currentSub.price_gbp * daysRemaining) / 30; // Approximate
			chargeAmount = newTierData.amount_gbp - monthlyRefund;
			billingExplanation = `Switched to yearly billing. You'll be charged £${chargeAmount.toFixed(
				2
			)} (yearly price minus remaining monthly credit).`;
		} else if (
			currentSub.billing_interval === "yearly" &&
			newTierData.billing_interval === "monthly"
		) {
			// Yearly to monthly: more complex calculation
			billingExplanation = `Switched to monthly billing. Your billing cycle has been reset and you'll be charged the monthly rate going forward.`;
		} else {
			billingExplanation = `Billing interval changed from ${currentSub.billing_interval} to ${newTierData.billing_interval}. Stripe will handle any proration automatically.`;
		}
	}

	return new Response(
		JSON.stringify({
			success: true,
			message: "Billing interval changed successfully",
			new_tier: newTierData.stripe_products.tier_name,
			new_interval: newTierData.billing_interval,
			subscription_status: updatedSubscription.status,
			is_trial: subscription.status === "trialing",
			billing_explanation: billingExplanation,
		}),
		{
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		}
	);
}

async function handleLifetimeToRecurring(
	req: Request,
	studioId: string,
	currentSub: Subscription,
	newTierData: TierData
) {
	console.log("🔄 Converting lifetime to recurring subscription");

	// Mark current lifetime subscription as superseded
	await supabaseClient
		.from("studio_subscriptions")
		.update({
			status: "superseded",
			updated_at: new Date().toISOString(),
		})
		.eq("id", currentSub.id);

	// Create new recurring subscription
	return await createRecurringSubscription(
		req,
		studioId,
		newTierData,
		await getOrCreateStripeCustomer(studioId)
	);
}

async function handleRecurringToLifetime(
	req: Request,
	studioId: string,
	currentSub: Subscription,
	newTierData: TierData
) {
	console.log("🔄 Converting recurring to lifetime subscription");

	// Cancel current recurring subscription at period end
	if (currentSub.stripe_subscription_id) {
		await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
			cancel_at_period_end: true,
			metadata: {
				...currentSub.metadata,
				superseded_by: "lifetime_purchase",
				superseded_at: new Date().toISOString(),
			},
		});

		// Update local record
		await supabaseClient
			.from("studio_subscriptions")
			.update({
				cancel_at_period_end: true,
				updated_at: new Date().toISOString(),
			})
			.eq("id", currentSub.id);
	}

	// Create lifetime payment checkout
	return await createLifetimeSubscription(
		req,
		studioId,
		newTierData,
		await getOrCreateStripeCustomer(studioId)
	);
}

async function handleAutomaticUpgrade(req: Request, studioId: string) {
	console.log("🔄 Processing automatic upgrade");

	// Check if upgrade is required
	const { data: upgradeCheck, error } = await supabaseClient.rpc(
		"check_upgrade_required",
		{ p_studio_id: studioId }
	);

	if (error || !upgradeCheck?.[0]?.requires_upgrade) {
		return new Response(
			JSON.stringify({
				success: true,
				message: "No upgrade required",
				upgrade_needed: false,
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			}
		);
	}

	const upgradeInfo = upgradeCheck[0];
	const requiredTier = upgradeInfo.required_tier;

	// Get current subscription to maintain billing interval
	const { data: currentSub } = await supabaseClient
		.from("studio_subscriptions")
		.select("*")
		.eq("studio_id", studioId)
		.eq("status", "active")
		.single();

	const billingInterval = currentSub?.billing_interval || "monthly";

	// If lifetime subscription, don't auto-upgrade - require manual intervention
	if (currentSub?.is_lifetime) {
		// Create notification instead
		await supabaseClient.from("notifications").insert({
			user_id: currentSub.studio_id,
			studio_id: studioId,
			type: "upgrade_required",
			title: "Upgrade Required",
			message: `Your student count (${upgradeInfo.current_student_count}) exceeds your lifetime plan limit (${upgradeInfo.max_allowed}). Please upgrade to ${requiredTier} plan.`,
			priority: "high",
			requires_action: true,
		});

		return new Response(
			JSON.stringify({
				success: true,
				message: "Notification created for manual upgrade",
				upgrade_needed: true,
				requires_manual_action: true,
				current_count: upgradeInfo.current_student_count,
				max_allowed: upgradeInfo.max_allowed,
				required_tier: requiredTier,
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			}
		);
	}

	// Perform automatic upgrade for recurring subscriptions
	return await handleUpgrade(req, studioId, requiredTier, billingInterval);
}

async function getOrCreateStripeCustomer(studioId: string) {
	// Get studio data
	const { data: studio, error } = await supabaseClient
		.from("studios")
		.select("*")
		.eq("id", studioId)
		.single();

	if (error || !studio) {
		throw new Error("Studio not found");
	}

	// Check if studio already has a customer ID stored in subscription
	const { data: existingSub } = await supabaseClient
		.from("studio_subscriptions")
		.select("stripe_customer_id")
		.eq("studio_id", studioId)
		.not("stripe_customer_id", "is", null)
		.limit(1)
		.single();

	if (existingSub?.stripe_customer_id) {
		return existingSub.stripe_customer_id;
	}

	// Create new Stripe customer
	const customer = await stripe.customers.create({
		email: studio.email,
		name: studio.name,
		metadata: {
			studio_id: studioId,
		},
	});

	return customer.id;
}

async function checkUpgradeRequired(studioId: string) {
	const { data, error } = await supabaseClient.rpc("check_upgrade_required", {
		p_studio_id: studioId,
	});

	if (error) {
		throw error;
	}

	return new Response(JSON.stringify({ success: true, data: data[0] }), {
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}

async function getPricing() {
	const { data: tiers, error } = await supabaseClient.rpc(
		"get_available_tiers"
	);

	if (error) {
		throw error;
	}

	return new Response(JSON.stringify({ success: true, tiers }), {
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}

async function handleCancellation(studioId: string, subscriptionId: string) {
	console.log("🔄 Processing cancellation request");

	const { data: subscription, error } = await supabaseClient
		.from("studio_subscriptions")
		.select("*")
		.eq("studio_id", studioId)
		.eq("id", subscriptionId)
		.single();

	if (error || !subscription) {
		throw new Error("Subscription not found");
	}

	if (subscription.stripe_subscription_id) {
		// Schedule cancellation at period end instead of immediate cancellation
		await stripe.subscriptions.update(subscription.stripe_subscription_id, {
			cancel_at_period_end: true,
			metadata: {
				cancellation_requested: "true",
				cancellation_requested_at: new Date().toISOString(),
			},
		});

		console.log("✅ Subscription scheduled for cancellation at period end:", {
			current_period_end: subscription.current_period_end,
			subscription_id: subscription.stripe_subscription_id,
		});
	}

	// Update local subscription record
	await supabaseClient
		.from("studio_subscriptions")
		.update({
			cancel_at_period_end: true,
			updated_at: new Date().toISOString(),
		})
		.eq("id", subscriptionId);

	return new Response(
		JSON.stringify({
			success: true,
			message:
				"Subscription will be cancelled at the end of the current billing period",
			current_period_end: subscription.current_period_end,
		}),
		{
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		}
	);
}

async function handleDirectSubscriptionUpdate(
	studioId: string,
	currentSub: Subscription,
	newTierData: TierData
) {
	console.log("🔄 Processing subscription update");

	if (!currentSub.stripe_subscription_id) {
		throw new Error("No Stripe subscription ID found");
	}

	// Get current Stripe subscription
	const subscription = await stripe.subscriptions.retrieve(
		currentSub.stripe_subscription_id
	);

	// Check for any pending updates first
	if (subscription.pending_update) {
		throw new Error(
			"There is already a pending update for this subscription. Please wait for it to complete or cancel it before making changes."
		);
	}

	console.log("📋 Current subscription status:", subscription.status);
	console.log("📋 Current subscription items:", subscription.items.data);

	// Determine if this is an upgrade or downgrade
	const isUpgrade = newTierData.amount_gbp > currentSub.price_gbp;
	const isDowngrade = newTierData.amount_gbp < currentSub.price_gbp;

	// Determine proration behavior based on various factors
	let prorationBehavior: Stripe.SubscriptionUpdateParams.ProrationBehavior;
	let billingCycleAnchor: "now" | "unchanged" = "unchanged";

	if (subscription.status === "trialing") {
		// No proration during trial
		prorationBehavior = "none";
	} else if (isDowngrade) {
		// For downgrades, create credit and apply to future invoices
		prorationBehavior = "create_prorations";
		billingCycleAnchor = "unchanged"; // Keep billing date
	} else if (isUpgrade) {
		// For upgrades, check the latest invoice for immediate payment required
		const latestInvoice = await stripe.invoices.retrieve(
			subscription.latest_invoice as string
		);
		const requiresImmediate =
			latestInvoice.status === "open" &&
			latestInvoice.collection_method === "charge_automatically";

		billingCycleAnchor = "now"; // Reset billing cycle
		prorationBehavior = "always_invoice";
	} else {
		// For same-price changes (e.g., feature changes)
		prorationBehavior = "none";
	}

	// For downgrades, check if we're in a commitment period
	if (isDowngrade) {
		const subscriptionStartDate = new Date(subscription.start_date * 1000);
		const commitmentEndDate = new Date(subscriptionStartDate);
		commitmentEndDate.setFullYear(commitmentEndDate.getFullYear() + 1);

		if (new Date() < commitmentEndDate) {
			throw new Error(
				`Cannot downgrade during commitment period. Your commitment ends on ${commitmentEndDate.toLocaleDateString()}`
			);
		}
	}

	try {
		// Update subscription with new price
		const updatedSubscription = await stripe.subscriptions.update(
			currentSub.stripe_subscription_id,
			{
				items: [
					{
						id: subscription.items.data[0].id,
						price: newTierData.stripe_price_id,
					},
				],
				proration_behavior: prorationBehavior,
				billing_cycle_anchor: billingCycleAnchor,
				payment_behavior: isUpgrade
					? "error_if_incomplete"
					: "allow_incomplete",
				metadata: {
					...subscription.metadata,
					tier_name: newTierData.stripe_products.tier_name,
					previous_tier: currentSub.tier,
					change_type: isUpgrade
						? "upgrade"
						: isDowngrade
						? "downgrade"
						: "change",
					changed_at: new Date().toISOString(),
				},
			}
		);

		console.log("✅ Stripe subscription updated successfully");

		// Update our local subscription record
		await supabaseClient
			.from("studio_subscriptions")
			.update({
				tier: newTierData.stripe_products.tier_name,
				max_students: newTierData.stripe_products.max_students,
				price_gbp: newTierData.amount_gbp,
				stripe_price_id: newTierData.stripe_price_id,
				stripe_product_id: newTierData.stripe_product_id,
				updated_at: new Date().toISOString(),
				commitment_end_date: isUpgrade
					? new Date(
							new Date().setFullYear(new Date().getFullYear() + 1)
					  ).toISOString()
					: currentSub.commitment_end_date,
			})
			.eq("id", currentSub.id);

		// Update studio max_students
		await supabaseClient
			.from("studios")
			.update({
				max_students: newTierData.stripe_products.max_students,
				subscription_tier: newTierData.stripe_products.tier_name,
				updated_at: new Date().toISOString(),
			})
			.eq("id", studioId);

		// Get preview of the changes for the response
		const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
			customer: currentSub.stripe_customer_id,
			subscription: currentSub.stripe_subscription_id,
		});

		const nextPaymentAmount = upcomingInvoice.amount_due / 100;
		let billingExplanation = "";

		if (subscription.status === "trialing") {
			billingExplanation =
				"Changes will take effect when your trial ends. No immediate charges.";
		} else if (isUpgrade) {
			// For upgrades, check the latest invoice for immediate payment required
			const latestInvoice = await stripe.invoices.retrieve(
				updatedSubscription.latest_invoice as string
			);
			const requiresImmediate =
				latestInvoice.status === "open" &&
				latestInvoice.collection_method === "charge_automatically";

			billingExplanation = requiresImmediate
				? `You will be charged £${(latestInvoice.total / 100).toFixed(
						2
				  )} immediately for this upgrade.`
				: `No immediate charge. Your next invoice will be £${(
						upcomingInvoice.amount_due / 100
				  ).toFixed(2)}.`;
		} else if (isDowngrade) {
			const creditAmount =
				Math.abs(
					upcomingInvoice.lines.data
						.filter((line) => line.amount < 0)
						.reduce((sum, line) => sum + line.amount, 0)
				) / 100;
			billingExplanation = `A credit of £${creditAmount.toFixed(
				2
			)} will be applied to your future invoices.`;
		} else {
			billingExplanation =
				"Your plan features have been updated. No price change.";
		}

		return new Response(
			JSON.stringify({
				success: true,
				message: "Subscription updated successfully",
				new_tier: newTierData.stripe_products.tier_name,
				subscription_status: updatedSubscription.status,
				is_trial: subscription.status === "trialing",
				next_payment_amount: nextPaymentAmount,
				billing_explanation: billingExplanation,
				change_type: isUpgrade
					? "upgrade"
					: isDowngrade
					? "downgrade"
					: "change",
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("❌ Error updating subscription:", error);

		// Check if error is related to payment authentication
		if (
			error.type === "card_error" &&
			error.code === "authentication_required"
		) {
			return new Response(
				JSON.stringify({
					success: false,
					status: "requires_authentication",
					message: "This update requires payment authentication",
					payment_intent: error.payment_intent,
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		throw error;
	}
}

async function previewUpgrade(
	studioId: string,
	tierName: string,
	billingInterval: string
) {
	console.log(`🔄 Previewing upgrade to ${tierName} (${billingInterval})`);

	const { data: currentSub, error: subError } = await supabaseClient
		.from("studio_subscriptions")
		.select("*")
		.eq("studio_id", studioId)
		.in("status", ["active", "trialing"])
		.single();

	if (subError || !currentSub) {
		throw new Error("No active subscription found to upgrade");
	}

	const { data: newTierData, error: tierError } = await supabaseClient
		.from("stripe_prices")
		.select("*, stripe_products!inner(*)")
		.eq("stripe_products.tier_name", tierName)
		.eq("billing_interval", billingInterval)
		.eq("active", true)
		.single();

	if (tierError || !newTierData) {
		throw new Error(
			`Tier ${tierName} with ${billingInterval} billing not found`
		);
	}

	if (!currentSub.stripe_subscription_id) {
		// Handle preview for users without a Stripe subscription (e.g., lifetime to new recurring)
		return new Response(
			JSON.stringify({
				success: true,
				preview: {
					is_upgrade: true,
					immediate_total: newTierData.amount_gbp,
					credit_amount: 0,
					proration_amount: 0,
					next_renewal_amount: newTierData.amount_gbp,
					explanation: `You will be charged £${newTierData.amount_gbp.toFixed(
						2
					)} immediately to start your new subscription.`,
					current_tier: currentSub.tier,
					new_tier: newTierData.stripe_products.tier_name,
					billing_interval: billingInterval,
				},
			}),
			{ headers: { ...corsHeaders, "Content-Type": "application/json" } }
		);
	}

	try {
		const isUpgrade = newTierData.amount_gbp > currentSub.price_gbp;
		const prorationBehavior = isUpgrade
			? "always_invoice"
			: "create_prorations";
		const billingCycleAnchor = isUpgrade ? "now" : undefined;

		const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
			customer: currentSub.stripe_customer_id,
			subscription: currentSub.stripe_subscription_id,
			subscription_items: [
				{
					id: (
						await stripe.subscriptions.retrieve(
							currentSub.stripe_subscription_id
						)
					).items.data[0].id,
					price: newTierData.stripe_price_id,
				},
			],
			subscription_proration_behavior: prorationBehavior,
			subscription_billing_cycle_anchor: billingCycleAnchor,
		});

		let prorationCharge = 0;
		let creditAmount = 0;
		upcomingInvoice.lines.data.forEach((line) => {
			if (line.proration) {
				if (line.amount > 0) prorationCharge += line.amount;
				else creditAmount += line.amount;
			}
		});

		const immediateTotal = isUpgrade ? upcomingInvoice.amount_due / 100 : 0;
		const nextRenewalAmount = newTierData.amount_gbp;
		let explanation = "";

		if (isUpgrade) {
			explanation = `You will be charged £${immediateTotal.toFixed(
				2
			)} immediately for the upgrade. Your plan will then renew for £${nextRenewalAmount.toFixed(
				2
			)} on the new anniversary date.`;
		} else {
			const totalCredit = Math.abs(upcomingInvoice.total) / 100;
			explanation = `No immediate charge. A credit of £${totalCredit.toFixed(
				2
			)} will be applied to future invoices. Your plan will renew for £${nextRenewalAmount.toFixed(
				2
			)} on the current schedule.`;
		}

		return new Response(
			JSON.stringify({
				success: true,
				preview: {
					is_upgrade: isUpgrade,
					immediate_total: immediateTotal,
					credit_amount: Math.abs(creditAmount) / 100,
					proration_amount: prorationCharge / 100,
					next_renewal_amount: nextRenewalAmount,
					next_invoice_total: upcomingInvoice.amount_due / 100, // For downgrades, this shows credit
					explanation: explanation,
					current_tier: currentSub.tier,
					new_tier: newTierData.stripe_products.tier_name,
					billing_interval: billingInterval,
				},
			}),
			{ headers: { ...corsHeaders, "Content-Type": "application/json" } }
		);
	} catch (error) {
		console.error("❌ Error previewing upgrade:", error);
		throw new Error(`Failed to preview upgrade: ${error.message}`);
	}
}

async function applyPromotionAndUpgrade(
	studioId: string,
	tierName: string,
	billingInterval: string,
	promotionCode: string
) {
	console.log(
		`🔄 Applying promotion and upgrading to ${tierName} (${billingInterval})`
	);

	if (!promotionCode) {
		throw new Error("Promotion code is required");
	}

	// Get current subscription
	const { data: currentSub, error: subError } = await supabaseClient
		.from("studio_subscriptions")
		.select("*")
		.eq("studio_id", studioId)
		.in("status", ["active", "trialing"])
		.single();

	if (subError || !currentSub) {
		throw new Error("No active subscription found to upgrade");
	}

	// Get new tier pricing
	const { data: newTierData, error: tierError } = await supabaseClient
		.from("stripe_prices")
		.select(
			`
			*,
			stripe_products!inner(*)
		`
		)
		.eq("stripe_products.tier_name", tierName)
		.eq("billing_interval", billingInterval)
		.eq("active", true)
		.single();

	if (tierError || !newTierData) {
		throw new Error(
			`Tier ${tierName} with ${billingInterval} billing not found`
		);
	}

	if (!currentSub.stripe_subscription_id) {
		throw new Error(
			"Cannot apply promotion codes to non-recurring subscriptions automatically"
		);
	}

	try {
		// Validate promotion code
		const promotionCodes = await stripe.promotionCodes.list({
			code: promotionCode,
			active: true,
			limit: 1,
		});

		if (promotionCodes.data.length === 0) {
			throw new Error("Invalid or expired promotion code");
		}

		const validPromotion = promotionCodes.data[0];

		// Get current Stripe subscription
		const subscription = await stripe.subscriptions.retrieve(
			currentSub.stripe_subscription_id
		);

		// Apply promotion code to subscription first
		await stripe.subscriptions.update(currentSub.stripe_subscription_id, {
			promotion_code: validPromotion.id,
		});

		// Then update the subscription with new tier
		const updatedSubscription = await stripe.subscriptions.update(
			currentSub.stripe_subscription_id,
			{
				items: [
					{
						id: subscription.items.data[0].id,
						price: newTierData.stripe_price_id,
					},
				],
				proration_behavior: "create_prorations",
				metadata: {
					...subscription.metadata,
					tier_name: newTierData.stripe_products.tier_name,
					upgraded_at: new Date().toISOString(),
					previous_tier: currentSub.tier,
					promotion_applied: promotionCode,
					upgrade_type: "promo_upgrade",
				},
			}
		);

		// Update our local subscription record
		await supabaseClient
			.from("studio_subscriptions")
			.update({
				tier: newTierData.stripe_products.tier_name,
				max_students: newTierData.stripe_products.max_students,
				price_gbp: newTierData.amount_gbp,
				stripe_price_id: newTierData.stripe_price_id,
				stripe_product_id: newTierData.stripe_product_id,
				updated_at: new Date().toISOString(),
			})
			.eq("id", currentSub.id);

		// Update studio
		await supabaseClient
			.from("studios")
			.update({
				max_students: newTierData.stripe_products.max_students,
				subscription_tier: newTierData.stripe_products.tier_name,
				updated_at: new Date().toISOString(),
			})
			.eq("id", studioId);

		return new Response(
			JSON.stringify({
				success: true,
				message: "Subscription upgraded successfully with promotion code",
				new_tier: newTierData.stripe_products.tier_name,
				promotion_applied: promotionCode,
				subscription_status: updatedSubscription.status,
			}),
			{
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("❌ Error applying promotion and upgrading:", error);
		throw new Error(`Failed to apply promotion: ${error.message}`);
	}
}
