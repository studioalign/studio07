// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
	createClient,
	type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
	apiVersion: "2024-06-20",
	httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

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
			lifetime: 850,
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
			lifetime: 1000,
		},
	},
];

console.log("Listening for Stripe webhooks...");

// Helper function to sync a single product
async function syncProduct(
	supabaseClient: SupabaseClient,
	stripeProduct: Stripe.Product
) {
	console.log(`🔄 Processing product: ${stripeProduct.name}`);

	let tierInfo = TIER_CONFIG.find((tier) =>
		stripeProduct.name.toLowerCase().includes(tier.tier_name.toLowerCase())
	);

	if (!tierInfo && stripeProduct.metadata?.tier_name) {
		tierInfo = TIER_CONFIG.find(
			(tier) => tier.tier_name === stripeProduct.metadata.tier_name
		);
	}

	if (!tierInfo) {
		console.log(
			`⚠️ Skipping product ${stripeProduct.name} - no tier info found`
		);
		return;
	}

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
		return;
	}

	console.log(`✅ Product synced: ${productData.name}`);
	return productData;
}

// Helper function to sync a single price
async function syncPrice(
	supabaseClient: SupabaseClient,
	stripePrice: Stripe.Price
) {
	console.log(`💰 Processing price: ${stripePrice.id}`);

	const { data: productData, error: productError } = await supabaseClient
		.from("stripe_products")
		.select("id")
		.eq("stripe_product_id", stripePrice.product)
		.single();

	if (productError || !productData) {
		console.error(
			`❌ Product not found for price ${stripePrice.id}. Error:`,
			productError
		);
		return;
	}

	let billingInterval = "monthly";
	if (stripePrice.type === "one_time") {
		billingInterval = "lifetime";
	} else if (stripePrice.recurring?.interval === "year") {
		billingInterval = "yearly";
	}

	const amountGbp = (stripePrice.unit_amount || 0) / 100;

	const { error: priceError } = await supabaseClient
		.from("stripe_prices")
		.upsert(
			{
				stripe_price_id: stripePrice.id,
				stripe_product_id: stripePrice.product,
				product_id: productData.id,
				amount_gbp: amountGbp,
				currency: stripePrice.currency,
				billing_interval: billingInterval,
				interval_count: stripePrice.recurring?.interval_count || 1,
				trial_period_days: 5,
				active: stripePrice.active,
				updated_at: new Date().toISOString(),
			},
			{
				onConflict: "stripe_price_id",
			}
		);

	if (priceError) {
		console.error(`❌ Error upserting price ${stripePrice.id}:`, priceError);
		return;
	}

	console.log(`✅ Price synced: ${amountGbp} GBP (${billingInterval})`);
}

// Helper function to get tier data from database
async function getTierDataFromStripe(
	supabaseClient: SupabaseClient,
	stripeProductId: string,
	stripePriceId: string
) {
	const { data: priceData, error } = await supabaseClient
		.from("stripe_prices")
		.select(
			`
			*,
			stripe_products!inner(*)
		`
		)
		.eq("stripe_price_id", stripePriceId)
		.eq("stripe_product_id", stripeProductId)
		.single();

	if (error) {
		console.error("❌ Error fetching tier data:", error);
		return null;
	}

	return priceData;
}

// Helper function to get receipt URL and send receipt email
async function getReceiptAndSendEmail(
	paymentIntentId: string,
	customerEmail: string
): Promise<string | null> {
	try {
		if (!paymentIntentId) {
			console.log("⚠️ No payment intent ID provided for receipt");
			return null;
		}

		// Get the payment intent to find the latest charge
		const paymentIntent = await stripe.paymentIntents.retrieve(
			paymentIntentId,
			{
				expand: ["latest_charge"],
			}
		);

		if (
			!paymentIntent.latest_charge ||
			typeof paymentIntent.latest_charge === "string"
		) {
			console.log("⚠️ No charge found for payment intent:", paymentIntentId);
			return null;
		}

		const charge = paymentIntent.latest_charge;
		const receiptUrl = charge.receipt_url;

		if (receiptUrl) {
			console.log("📧 Sending receipt email to customer:", customerEmail);

			// Send receipt via email using Stripe's receipt feature
			try {
				await stripe.charges.update(charge.id, {
					receipt_email: customerEmail,
				});
				console.log("✅ Receipt email sent successfully");
			} catch (emailError) {
				console.error("❌ Error sending receipt email:", emailError.message);
				// Continue with receipt URL even if email fails
			}

			console.log("📄 Receipt URL obtained:", receiptUrl);
			return receiptUrl;
		} else {
			console.log("⚠️ No receipt URL available for charge:", charge.id);
			return null;
		}
	} catch (error) {
		console.error("❌ Error getting receipt and sending email:", error.message);
		return null;
	}
}

// Helper function to get customer email from studio
async function getCustomerEmail(
	supabaseClient: SupabaseClient,
	studioId: string
): Promise<string | null> {
	try {
		const { data: studio, error } = await supabaseClient
			.from("studios")
			.select("email, name")
			.eq("id", studioId)
			.single();

		if (error || !studio) {
			console.error("❌ Error getting studio email:", error);
			return null;
		}

		return studio.email;
	} catch (error) {
		console.error("❌ Error fetching customer email:", error);
		return null;
	}
}

serve(async (req) => {
	const signature = req.headers.get("Stripe-Signature");

	// First step is to verify the event. The .text() method must be used as the
	// verification relies on the raw request body rather than the parsed JSON.
	const body = await req.text();

	let event;
	try {
		const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_ACCOUNT");

		if (!webhookSecret) {
			console.error("❌ STRIPE_WEBHOOK_SECRET environment variable is not set");
			return new Response("Webhook secret not configured", { status: 500 });
		}

		event = await stripe.webhooks.constructEventAsync(
			body,
			signature!,
			webhookSecret!,
			undefined,
			cryptoProvider
		);

		// Use service role key for webhook database operations
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
		);

		switch (event.type) {
			//== PRODUCT AND PRICE SYNCING ==//
			case "product.created":
			case "product.updated": {
				const product = event.data.object as Stripe.Product;
				await syncProduct(supabaseClient, product);
				break;
			}
			case "product.deleted": {
				const product = event.data.object as Stripe.Product;
				console.log(`🗑️ Deactivating product: ${product.id}`);
				await supabaseClient
					.from("stripe_products")
					.update({ active: false })
					.eq("stripe_product_id", product.id);
				break;
			}
			case "price.created":
			case "price.updated": {
				const price = event.data.object as Stripe.Price;
				await syncPrice(supabaseClient, price);
				break;
			}
			case "price.deleted": {
				const price = event.data.object as Stripe.Price;
				console.log(`🗑️ Deactivating price: ${price.id}`);
				await supabaseClient
					.from("stripe_prices")
					.update({ active: false })
					.eq("stripe_price_id", price.id);
				break;
			}

			//== SUBSCRIPTION AND CHECKOUT HANDLING ==//
			case "customer.subscription.created": {
				const subscription = event.data.object;
				console.log("🔄 Processing subscription.created:", {
					subscriptionId: subscription.id,
					customerId: subscription.customer,
					status: subscription.status,
					items: subscription.items.data,
					metadata: subscription.metadata,
				});

				// Extract metadata to find the studio
				const studioId = subscription.metadata?.studio_id;
				const tierName = subscription.metadata?.tier_name;
				const billingInterval = subscription.metadata?.billing_interval;

				console.log("📋 Extracted metadata:", {
					studioId,
					tierName,
					billingInterval,
				});

				if (!studioId || !tierName) {
					console.error(
						"❌ Missing studio_id or tier_name in subscription metadata:",
						{
							studioId,
							tierName,
							allMetadata: subscription.metadata,
						}
					);
					break;
				}

				// Get the subscription item to find the price
				const subscriptionItem = subscription.items.data[0];
				if (!subscriptionItem) {
					console.error("❌ No subscription items found");
					break;
				}

				const stripePrice = subscriptionItem.price;
				console.log("💰 Stripe price details:", {
					priceId: stripePrice.id,
					productId: stripePrice.product,
					unitAmount: stripePrice.unit_amount,
					interval: stripePrice.recurring?.interval,
				});

				// Get tier data from our database
				const tierData = await getTierDataFromStripe(
					supabaseClient,
					stripePrice.product,
					stripePrice.id
				);

				if (!tierData) {
					console.error("❌ Could not find tier data for:", {
						productId: stripePrice.product,
						priceId: stripePrice.id,
					});
					break;
				}

				console.log("✅ Found tier data:", tierData);

				// Check if studio exists
				const { data: studioCheck, error: studioCheckError } =
					await supabaseClient
						.from("studios")
						.select("id, name")
						.eq("id", studioId)
						.single();

				if (studioCheckError || !studioCheck) {
					console.error("❌ Studio not found:", {
						studioId,
						error: studioCheckError,
					});
					break;
				}

				console.log("✅ Studio found:", studioCheck);

				// Determine if this is a lifetime subscription
				const isLifetime = tierData.billing_interval === "lifetime";

				// Calculate trial dates
				let trialStart: string | null = null;
				let trialEnd: string | null = null;
				if (subscription.trial_start && subscription.trial_end) {
					trialStart = new Date(subscription.trial_start * 1000).toISOString();
					trialEnd = new Date(subscription.trial_end * 1000).toISOString();
				}

				// Create subscription record with enhanced fields
				const subscriptionData = {
					studio_id: studioId,
					stripe_subscription_id: subscription.id,
					stripe_customer_id: subscription.customer,
					stripe_price_id: stripePrice.id,
					stripe_product_id: stripePrice.product,
					tier: tierData.stripe_products.tier_name,
					max_students: tierData.stripe_products.max_students,
					price_gbp: tierData.amount_gbp,
					billing_interval: tierData.billing_interval,
					is_lifetime: isLifetime,
					status: subscription.status,
					current_period_start: new Date(
						subscription.current_period_start * 1000
					).toISOString(),
					current_period_end: new Date(
						subscription.current_period_end * 1000
					).toISOString(),
					trial_start: trialStart,
					trial_end: trialEnd,
					cancel_at_period_end: subscription.cancel_at_period_end,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};

				console.log("💾 Upserting subscription data:", subscriptionData);

				const { error: upsertError } = await supabaseClient
					.from("studio_subscriptions")
					.upsert(subscriptionData, {
						onConflict: "studio_id",
					});

				if (upsertError) {
					console.error("❌ Error upserting subscription:", upsertError);
					throw upsertError;
				}

				console.log("✅ Subscription upserted successfully");

				// Update studio with new subscription details
				const studioUpdateData = {
					subscription_tier: tierData.stripe_products.tier_name,
					max_students: tierData.stripe_products.max_students,
					updated_at: new Date().toISOString(),
				};

				console.log("💾 Updating studio:", studioUpdateData);

				const { error: studioUpdateError } = await supabaseClient
					.from("studios")
					.update(studioUpdateData)
					.eq("id", studioId);

				if (studioUpdateError) {
					console.error("❌ Error updating studio:", studioUpdateError);
				} else {
					console.log("✅ Studio updated successfully");
				}

				// Create billing history for active/trialing subscriptions
				if (
					subscription.status === "active" ||
					subscription.status === "trialing"
				) {
					// Check if billing history already exists
					const { data: existingBilling } = await supabaseClient
						.from("billing_history")
						.select("id")
						.eq("stripe_subscription_id", subscription.id)
						.eq("studio_id", studioId)
						.single();

					if (!existingBilling) {
						// Get customer email for receipt
						const customerEmail = await getCustomerEmail(
							supabaseClient,
							studioId
						);
						let receiptUrl: string | null = null;
						let stripeInvoiceId = null;

						// Only create billing history for active subscriptions, not trials
						// Trials will get billing history when they convert to paid via invoice.payment_succeeded
						if (subscription.status === "active") {
							// Try to get receipt URL and send email for active subscriptions
							try {
								const invoices = await stripe.invoices.list({
									subscription: subscription.id,
									limit: 1,
								});

								if (invoices.data.length > 0) {
									const latestInvoice = invoices.data[0];
									stripeInvoiceId = latestInvoice.id;
									if (latestInvoice.payment_intent && customerEmail) {
										receiptUrl = await getReceiptAndSendEmail(
											latestInvoice.payment_intent as string,
											customerEmail
										);
									}
									console.log("📄 Receipt handling completed:", { receiptUrl });
								}
							} catch (receiptError) {
								console.log(
									"⚠️ Could not process receipt:",
									receiptError.message
								);
							}

							// Create enhanced billing history record
							const billingData = {
								studio_id: studioId,
								amount_gbp: tierData.amount_gbp,
								description: `${tierData.stripe_products.tier_name} subscription activated (${tierData.billing_interval})`,
								status: "paid",
								transaction_type: isLifetime ? "lifetime" : "subscription",
								billing_interval: tierData.billing_interval,
								stripe_subscription_id: subscription.id,
								stripe_invoice_id: stripeInvoiceId,
								invoice_url: receiptUrl || null, // Store receipt URL in invoice_url field for now
								created_at: new Date().toISOString(),
							};

							console.log("💾 Creating enhanced billing history:", billingData);

							const { error: billingError } = await supabaseClient
								.from("billing_history")
								.insert([billingData]);

							if (billingError) {
								console.error(
									"❌ Error creating billing history:",
									billingError
								);
							} else {
								console.log("✅ Enhanced billing history created successfully");
							}
						} else {
							console.log(
								"⚠️ Skipping billing history for trial subscription - will create when trial converts to paid"
							);
						}
					}
				}

				console.log(
					"🎉 Subscription creation processing completed successfully"
				);
				break;
			}

			case "customer.subscription.updated": {
				const subscription = event.data.object;
				console.log("🔄 Processing subscription.updated:", subscription);

				// Find the subscription in our database
				const { data: existingSubscription, error: findError } =
					await supabaseClient
						.from("studio_subscriptions")
						.select("*")
						.eq("stripe_subscription_id", subscription.id)
						.single();

				if (findError || !existingSubscription) {
					console.error("❌ Subscription not found:", {
						stripeSubscriptionId: subscription.id,
						error: findError,
					});
					break;
				}

				// Get current subscription item and price
				const subscriptionItem = subscription.items.data[0];
				if (!subscriptionItem) {
					console.error("❌ No subscription items found in update");
					break;
				}

				const stripePrice = subscriptionItem.price;
				console.log("💰 Updated price details:", {
					priceId: stripePrice.id,
					productId: stripePrice.product,
					unitAmount: stripePrice.unit_amount,
				});

				// Get updated tier data
				const tierData = await getTierDataFromStripe(
					supabaseClient,
					stripePrice.product,
					stripePrice.id
				);

				if (!tierData) {
					console.error("❌ Could not find updated tier data");
					break;
				}

				// Calculate trial dates for update
				let trialStart: string | null = null;
				let trialEnd: string | null = null;
				if (subscription.trial_start && subscription.trial_end) {
					trialStart = new Date(subscription.trial_start * 1000).toISOString();
					trialEnd = new Date(subscription.trial_end * 1000).toISOString();
				}

				// Update subscription with enhanced fields
				const updateData = {
					stripe_price_id: stripePrice.id,
					stripe_product_id: stripePrice.product,
					tier: tierData.stripe_products.tier_name,
					max_students: tierData.stripe_products.max_students,
					price_gbp: tierData.amount_gbp,
					billing_interval: tierData.billing_interval,
					is_lifetime: tierData.billing_interval === "lifetime",
					status: subscription.status,
					current_period_start: new Date(
						subscription.current_period_start * 1000
					).toISOString(),
					current_period_end: new Date(
						subscription.current_period_end * 1000
					).toISOString(),
					trial_start: trialStart,
					trial_end: trialEnd,
					cancel_at_period_end: subscription.cancel_at_period_end,
					updated_at: new Date().toISOString(),
				};

				console.log("💾 Updating subscription with enhanced data:", updateData);

				const { error: updateError } = await supabaseClient
					.from("studio_subscriptions")
					.update(updateData)
					.eq("id", existingSubscription.id);

				if (updateError) {
					console.error("❌ Error updating subscription:", updateError);
					throw updateError;
				}

				// Update studio if tier changed or subscription reactivated
				if (
					subscription.status === "active" &&
					(existingSubscription.status !== "active" ||
						existingSubscription.tier !== tierData.stripe_products.tier_name)
				) {
					await supabaseClient
						.from("studios")
						.update({
							subscription_tier: tierData.stripe_products.tier_name,
							max_students: tierData.stripe_products.max_students,
							updated_at: new Date().toISOString(),
						})
						.eq("id", existingSubscription.studio_id);

					// Create billing history for the change
					const changeType =
						existingSubscription.tier !== tierData.stripe_products.tier_name
							? "upgrade"
							: "reactivation";

					await supabaseClient.from("billing_history").insert([
						{
							studio_id: existingSubscription.studio_id,
							amount_gbp: tierData.amount_gbp,
							description:
								changeType === "upgrade"
									? `Subscription updated from ${existingSubscription.tier} to ${tierData.stripe_products.tier_name}`
									: `${tierData.stripe_products.tier_name} subscription reactivated`,
							status: "active",
							transaction_type: "upgrade",
							billing_interval: tierData.billing_interval,
							upgrade_from_tier:
								changeType === "upgrade" ? existingSubscription.tier : null,
							upgrade_to_tier:
								changeType === "upgrade"
									? tierData.stripe_products.tier_name
									: null,
							stripe_subscription_id: subscription.id,
							created_at: new Date().toISOString(),
						},
					]);

					console.log("✅ Studio and billing history updated for change");
				}

				console.log("🎉 Subscription update processing completed");
				break;
			}

			case "customer.subscription.deleted": {
				const subscription = event.data.object;
				console.log("🔄 Processing subscription.deleted:", subscription.id);

				// Find the subscription in our database
				const { data: existingSubscription, error: findError } =
					await supabaseClient
						.from("studio_subscriptions")
						.select("*")
						.eq("stripe_subscription_id", subscription.id)
						.single();

				if (findError || !existingSubscription) {
					console.error("❌ Subscription not found for deletion:", {
						stripeSubscriptionId: subscription.id,
						error: findError,
					});
					break;
				}

				// Check if this subscription is being superseded/replaced
				const isBeingSuperseded =
					subscription.metadata?.superseded_by === "lifetime_purchase" ||
					subscription.metadata?.being_replaced === "true" ||
					subscription.metadata?.superseded_at;

				console.log("🔍 Subscription deletion context:", {
					subscriptionId: subscription.id,
					isBeingSuperseded,
					metadata: subscription.metadata,
					existingStatus: existingSubscription.status,
				});

				if (isBeingSuperseded) {
					console.log(
						"🔄 Subscription is being superseded - marking as superseded instead of canceled"
					);

					// Update subscription status to superseded instead of canceled
					const { error: updateError } = await supabaseClient
						.from("studio_subscriptions")
						.update({
							status: "superseded",
							superseded_by: subscription.metadata?.superseded_by || "upgrade",
							superseded_at:
								subscription.metadata?.superseded_at ||
								new Date().toISOString(),
							updated_at: new Date().toISOString(),
						})
						.eq("stripe_subscription_id", subscription.id);

					if (updateError) {
						console.error(
							"❌ Error updating superseded subscription:",
							updateError
						);
						throw updateError;
					}

					// Create billing history for supersession (not cancellation)
					const supersessionDescription =
						subscription.metadata?.superseded_by === "lifetime_purchase"
							? `${existingSubscription.tier} subscription superseded by lifetime purchase`
							: `${existingSubscription.tier} subscription superseded by upgrade`;

					await supabaseClient.from("billing_history").insert([
						{
							studio_id: existingSubscription.studio_id,
							amount_gbp: 0,
							description: supersessionDescription,
							status: "superseded",
							transaction_type: "upgrade",
							billing_interval: existingSubscription.billing_interval,
							stripe_subscription_id: subscription.id,
							upgrade_from_tier: existingSubscription.tier,
							superseded_by: subscription.metadata?.superseded_by || "upgrade",
							created_at: new Date().toISOString(),
						},
					]);

					console.log(
						"✅ Subscription marked as superseded - studio tier will be maintained by new subscription"
					);
				} else {
					console.log("🔄 Processing genuine subscription cancellation");

					// This is a genuine cancellation (not replacement) - mark as canceled
					const { error: updateError } = await supabaseClient
						.from("studio_subscriptions")
						.update({
							status: "canceled",
							updated_at: new Date().toISOString(),
						})
						.eq("stripe_subscription_id", subscription.id);

					if (updateError) {
						console.error(
							"❌ Error updating canceled subscription:",
							updateError
						);
						throw updateError;
					}

					// Create billing history for cancellation
					await supabaseClient.from("billing_history").insert([
						{
							studio_id: existingSubscription.studio_id,
							amount_gbp: 0,
							description: `${existingSubscription.tier} subscription canceled`,
							status: "canceled",
							transaction_type: "downgrade",
							billing_interval: existingSubscription.billing_interval,
							stripe_subscription_id: subscription.id,
							created_at: new Date().toISOString(),
						},
					]);

					// Reset studio to default tier for genuine cancellations
					await supabaseClient
						.from("studios")
						.update({
							subscription_tier: "Starter",
							max_students: 100,
							updated_at: new Date().toISOString(),
						})
						.eq("id", existingSubscription.studio_id);

					console.log("✅ Studio reset to default tier due to cancellation");
				}

				console.log("🎉 Subscription deletion processing completed");
				break;
			}

			case "checkout.session.completed": {
				const session = event.data.object;
				console.log("🔄 Processing checkout.session.completed:", {
					sessionId: session.id,
					mode: session.mode,
					subscriptionId: session.subscription,
					paymentIntentId: session.payment_intent,
					metadata: session.metadata,
				});

				const studioId = session.metadata?.studio_id;

				if (session.mode === "payment" && studioId) {
					// Handle lifetime subscription payment
					console.log("💳 Processing lifetime subscription payment");

					const tierName = session.metadata?.tier_name;
					const billingInterval = session.metadata?.billing_interval;

					if (tierName && billingInterval === "lifetime") {
						// Check if user has an existing active subscription that needs to be superseded
						const { data: existingSubscription, error: existingSubError } =
							await supabaseClient
								.from("studio_subscriptions")
								.select("*")
								.eq("studio_id", studioId)
								.in("status", ["active", "trialing"])
								.single();

						if (existingSubscription && !existingSubError) {
							console.log("🔄 Found existing subscription to supersede:", {
								subscriptionId: existingSubscription.stripe_subscription_id,
								tier: existingSubscription.tier,
								billingInterval: existingSubscription.billing_interval,
								isLifetime: existingSubscription.is_lifetime,
							});

							// Only cancel Stripe subscription if it's a recurring subscription
							if (
								existingSubscription.stripe_subscription_id &&
								!existingSubscription.is_lifetime
							) {
								try {
									await stripe.subscriptions.update(
										existingSubscription.stripe_subscription_id,
										{
											cancel_at_period_end: false, // Cancel immediately
											metadata: {
												superseded_by: "lifetime_purchase",
												superseded_at: new Date().toISOString(),
												superseded_session_id: session.id,
											},
										}
									);

									// Actually cancel the subscription immediately
									await stripe.subscriptions.cancel(
										existingSubscription.stripe_subscription_id
									);

									console.log(
										"✅ Existing recurring subscription canceled in Stripe"
									);
								} catch (stripeError) {
									console.error(
										"❌ Error canceling existing subscription in Stripe:",
										stripeError
									);
									// Continue with the process even if Stripe cancellation fails
								}
							} else if (existingSubscription.is_lifetime) {
								console.log(
									"⚠️ Existing subscription is already lifetime - no Stripe cancellation needed"
								);
							} else {
								console.log(
									"⚠️ No Stripe subscription ID found - skipping Stripe cancellation"
								);
							}

							// Mark existing subscription as superseded in our database
							await supabaseClient
								.from("studio_subscriptions")
								.update({
									status: "superseded",
									superseded_by: "lifetime_purchase",
									superseded_at: new Date().toISOString(),
									updated_at: new Date().toISOString(),
								})
								.eq("id", existingSubscription.id);

							// Create billing history for the superseded subscription
							const supersededDescription = existingSubscription.is_lifetime
								? `${existingSubscription.tier} lifetime plan replaced by ${tierName} lifetime`
								: `${existingSubscription.tier} ${existingSubscription.billing_interval} subscription superseded by lifetime purchase`;

							await supabaseClient.from("billing_history").insert([
								{
									studio_id: studioId,
									amount_gbp: 0,
									description: supersededDescription,
									status: "canceled",
									transaction_type: "downgrade",
									billing_interval: existingSubscription.billing_interval,
									stripe_subscription_id:
										existingSubscription.stripe_subscription_id,
									upgrade_from_tier: existingSubscription.tier,
									upgrade_to_tier: tierName,
									created_at: new Date().toISOString(),
								},
							]);

							console.log("✅ Existing subscription marked as superseded");
						}

						// Get tier data for the lifetime subscription
						const { data: tierData, error: tierError } = await supabaseClient
							.from("stripe_products")
							.select("*")
							.eq("tier_name", tierName)
							.single();

						if (tierError || !tierData) {
							console.error(
								"❌ Could not find tier data for lifetime subscription:",
								tierName
							);
							break;
						}

						// Create new lifetime subscription record
						const lifetimeSubscriptionData = {
							studio_id: studioId,
							stripe_customer_id: session.customer,
							tier: tierName,
							max_students: tierData.max_students,
							price_gbp: (session.amount_total || 0) / 100,
							billing_interval: "lifetime",
							is_lifetime: true,
							status: "active",
							created_at: new Date().toISOString(),
							updated_at: new Date().toISOString(),
						};

						console.log(
							"💾 Creating lifetime subscription record:",
							lifetimeSubscriptionData
						);

						const { error: lifetimeSubError } = await supabaseClient
							.from("studio_subscriptions")
							.upsert(lifetimeSubscriptionData, { onConflict: "studio_id" });

						if (lifetimeSubError) {
							console.error(
								"❌ Error creating lifetime subscription:",
								lifetimeSubError
							);
							throw lifetimeSubError;
						}

						// Update studio with new lifetime tier
						await supabaseClient
							.from("studios")
							.update({
								subscription_tier: tierName,
								max_students: tierData.max_students,
								updated_at: new Date().toISOString(),
							})
							.eq("id", studioId);

						// Create billing history for the lifetime purchase
						const lifetimeBillingData = {
							studio_id: studioId,
							amount_gbp: (session.amount_total || 0) / 100,
							description: existingSubscription
								? `Upgraded from ${existingSubscription.tier} ${existingSubscription.billing_interval} to ${tierName} lifetime`
								: `${tierName} lifetime subscription purchased`,
							status: "paid",
							transaction_type: "lifetime",
							billing_interval: "lifetime",
							stripe_payment_intent_id: session.payment_intent,
							upgrade_from_tier: existingSubscription?.tier || null,
							upgrade_to_tier: tierName,
							invoice_url: null as string | null, // Initialize for receipt URL
							created_at: new Date().toISOString(),
						};

						// Get customer email and receipt URL for lifetime purchase
						const customerEmail = await getCustomerEmail(
							supabaseClient,
							studioId
						);
						if (session.payment_intent && customerEmail) {
							try {
								const receiptUrl = await getReceiptAndSendEmail(
									session.payment_intent as string,
									customerEmail
								);
								if (receiptUrl) {
									lifetimeBillingData.invoice_url = receiptUrl;
								}
								console.log("📧 Receipt processed for lifetime purchase:", {
									receiptUrl,
								});
							} catch (receiptError) {
								console.error(
									"❌ Error processing lifetime receipt:",
									receiptError.message
								);
							}
						}

						const { error: lifetimeBillingError } = await supabaseClient
							.from("billing_history")
							.insert([lifetimeBillingData]);

						if (lifetimeBillingError) {
							console.error(
								"❌ Error creating lifetime billing history:",
								lifetimeBillingError
							);
						} else {
							console.log("✅ Lifetime subscription processed successfully", {
								previousSubscription: existingSubscription
									? {
											tier: existingSubscription.tier,
											interval: existingSubscription.billing_interval,
									  }
									: null,
								newSubscription: {
									tier: tierName,
									interval: "lifetime",
									amount: (session.amount_total || 0) / 100,
								},
							});
						}
					}
				} else if (
					session.mode === "subscription" &&
					session.subscription &&
					studioId
				) {
					// Handle recurring subscription checkout
					console.log("💳 Processing recurring subscription checkout");

					// Create billing history for subscription checkout
					await supabaseClient.from("billing_history").insert([
						{
							studio_id: studioId,
							amount_gbp: (session.amount_total || 0) / 100,
							description: "Subscription checkout completed",
							status: "paid",
							transaction_type: "subscription",
							stripe_payment_intent_id: session.payment_intent,
							stripe_subscription_id: session.subscription,
							created_at: new Date().toISOString(),
						},
					]);

					console.log("✅ Subscription checkout billing history created");
				}

				console.log("🎉 Checkout session processing completed");
				break;
			}

			case "invoice.payment_succeeded": {
				const stripeInvoice = event.data.object;
				console.log("🔄 Processing invoice.payment_succeeded:", {
					invoiceId: stripeInvoice.id,
					subscriptionId: stripeInvoice.subscription,
					amountPaid: stripeInvoice.amount_paid,
					amountTotal: stripeInvoice.total,
					customerId: stripeInvoice.customer,
					metadata: stripeInvoice.metadata,
				});

				if (stripeInvoice.subscription) {
					// Handle subscription-based invoices
					console.log(
						"📋 Processing subscription invoice:",
						stripeInvoice.subscription
					);

					// Find subscription and create billing history
					const { data: subscription, error: subError } = await supabaseClient
						.from("studio_subscriptions")
						.select("*")
						.eq("stripe_subscription_id", stripeInvoice.subscription)
						.single();

					if (subError) {
						console.error("❌ Error finding subscription for invoice:", {
							subscriptionId: stripeInvoice.subscription,
							error: subError,
						});
					}

					if (subscription && !subError) {
						console.log("✅ Found subscription for invoice:", {
							studioId: subscription.studio_id,
							tier: subscription.tier,
							billingInterval: subscription.billing_interval,
						});

						// Check if billing history already exists
						const { data: existingBilling, error: existingError } =
							await supabaseClient
								.from("billing_history")
								.select("id")
								.eq("stripe_invoice_id", stripeInvoice.id)
								.single();

						if (existingError && existingError.code !== "PGRST116") {
							console.error(
								"❌ Error checking existing billing history:",
								existingError
							);
						}

						if (!existingBilling) {
							console.log(
								"💾 Creating billing history for subscription invoice"
							);

							// Get customer email and receipt URL
							const customerEmail = await getCustomerEmail(
								supabaseClient,
								subscription.studio_id
							);
							let receiptUrl: string | null = null;

							// Get receipt URL and send email if payment intent exists
							if (stripeInvoice.payment_intent && customerEmail) {
								try {
									receiptUrl = await getReceiptAndSendEmail(
										stripeInvoice.payment_intent as string,
										customerEmail
									);
									console.log(
										"📧 Receipt processed for subscription payment:",
										{ receiptUrl }
									);
								} catch (receiptError) {
									console.error(
										"❌ Error processing receipt:",
										receiptError.message
									);
								}
							}

							// Create billing history with enhanced fields
							const billingData = {
								studio_id: subscription.studio_id,
								amount_gbp:
									(stripeInvoice.amount_paid || stripeInvoice.total) / 100,
								description: `${subscription.tier} subscription payment`,
								status: "paid",
								transaction_type: subscription.is_lifetime
									? "lifetime"
									: "subscription",
								billing_interval: subscription.billing_interval,
								stripe_invoice_id: stripeInvoice.id,
								stripe_payment_intent_id: stripeInvoice.payment_intent,
								stripe_subscription_id: stripeInvoice.subscription,
								invoice_url: receiptUrl || null, // Store receipt URL in invoice_url field
								created_at: new Date().toISOString(),
							};

							console.log("💾 Billing data to insert:", billingData);

							const { error: billingError } = await supabaseClient
								.from("billing_history")
								.insert([billingData]);

							if (billingError) {
								console.error(
									"❌ Error creating billing history for invoice payment:",
									{
										invoiceId: stripeInvoice.id,
										error: billingError,
										billingData,
									}
								);
							} else {
								console.log(
									"✅ Enhanced billing history created for invoice payment with receipt"
								);
							}
						} else {
							console.log(
								"⚠️ Billing history already exists for invoice:",
								stripeInvoice.id
							);
						}

						// Update subscription status if needed
						if (subscription.status !== "active") {
							console.log("🔄 Updating subscription status to active");
							const { error: statusError } = await supabaseClient
								.from("studio_subscriptions")
								.update({
									status: "active",
									updated_at: new Date().toISOString(),
								})
								.eq("id", subscription.id);

							if (statusError) {
								console.error(
									"❌ Error updating subscription status:",
									statusError
								);
							}
						}
					} else {
						console.error("❌ No subscription found for invoice:", {
							invoiceId: stripeInvoice.id,
							subscriptionId: stripeInvoice.subscription,
						});
					}
				}

				console.log("🎉 Invoice payment processing completed");
				break;
			}

			default:
				console.log("Unhandled event type:", event.type);
				break;
		}

		return new Response(JSON.stringify({ ok: true }), { status: 200 });
	} catch (err) {
		console.error("Webhook error:", err.message);
		console.error(
			"Full error:",
			JSON.stringify(
				{
					message: err.message,
					type: err.type,
					stack: err.stack,
				},
				null,
				2
			)
		);

		return new Response(err.message, { status: 400 });
	}
});
