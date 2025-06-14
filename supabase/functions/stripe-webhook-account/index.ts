// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0";

// Tier mapping for subscription plans
const TIER_MAPPING = {
	Starter: { maxStudents: 100, price: 15 },
	Growth: { maxStudents: 200, price: 20 },
	Professional: { maxStudents: 300, price: 25 },
	Scale: { maxStudents: 500, price: 35 },
	Enterprise: { maxStudents: 1000, price: 50 },
} as const;

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
	apiVersion: "2025-01-27.acacia",
	httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

console.log("Listening for Stripe webhooks...");

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
			case "customer.subscription.created": {
				const subscription = event.data.object;
				console.log("🔄 Processing subscription.created:", {
					subscriptionId: subscription.id,
					customerId: subscription.customer,
					status: subscription.status,
					metadata: subscription.metadata,
				});

				// Extract metadata to find the studio
				const studioId = subscription.metadata?.studio_id;
				const tierName = subscription.metadata?.tier_name;

				console.log("📋 Extracted metadata:", { studioId, tierName });

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

				// Map tier name to details
				const tierDetails = TIER_MAPPING[tierName];
				if (!tierDetails) {
					console.error(
						"❌ Unknown tier name:",
						tierName,
						"Available tiers:",
						Object.keys(TIER_MAPPING)
					);
					break;
				}

				console.log("✅ Found tier details:", tierDetails);

				// Check if studio exists
				const { data: studioCheck, error: studioCheckError } =
					await supabaseClient
						.from("studios")
						.select("id, name")
						.eq("id", studioId)
						.single();

				if (studioCheckError) {
					console.error(
						"❌ Error checking studio existence:",
						studioCheckError
					);
					break;
				}

				if (!studioCheck) {
					console.error("❌ Studio not found with ID:", studioId);
					break;
				}

				console.log("✅ Studio found:", studioCheck);

				// Create or update subscription in our database
				const subscriptionData = {
					studio_id: studioId,
					stripe_subscription_id: subscription.id,
					stripe_customer_id: subscription.customer,
					tier: tierName,
					max_students: tierDetails.maxStudents,
					price_gbp: tierDetails.price,
					status: subscription.status,
					current_period_start: new Date(
						subscription.current_period_start * 1000
					).toISOString(),
					current_period_end: new Date(
						subscription.current_period_end * 1000
					).toISOString(),
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
					console.error(
						"❌ Full error details:",
						JSON.stringify(upsertError, null, 2)
					);
					throw upsertError;
				}

				console.log("✅ Subscription upserted successfully");

				// Update studio subscription tier
				const studioUpdateData = {
					subscription_tier: tierName,
					max_students: tierDetails.maxStudents,
					updated_at: new Date().toISOString(),
				};

				console.log("💾 Updating studio:", studioUpdateData);

				const { error: studioUpdateError } = await supabaseClient
					.from("studios")
					.update(studioUpdateData)
					.eq("id", studioId);

				if (studioUpdateError) {
					console.error("❌ Error updating studio:", studioUpdateError);
					console.error(
						"❌ Full studio update error:",
						JSON.stringify(studioUpdateError, null, 2)
					);
				} else {
					console.log("✅ Studio updated successfully");
				}

				// Only create billing history for successful subscriptions
				if (
					subscription.status === "active" ||
					subscription.status === "trialing"
				) {
					// Check if we already have a billing history entry for this subscription
					const { data: existingBilling } = await supabaseClient
						.from("billing_history")
						.select("id")
						.eq("stripe_subscription_id", subscription.id)
						.eq("studio_id", studioId)
						.single();

					if (!existingBilling) {
						// Try to get the latest invoice for this subscription
						let invoiceUrl = null;
						let stripeInvoiceId = null;
						try {
							const invoices = await stripe.invoices.list({
								subscription: subscription.id,
								limit: 1,
							});

							if (invoices.data.length > 0) {
								const latestInvoice = invoices.data[0];
								invoiceUrl = latestInvoice.invoice_pdf;
								stripeInvoiceId = latestInvoice.id;
								console.log("📄 Found invoice URL:", invoiceUrl);
							}
						} catch (invoiceError) {
							console.log(
								"⚠️ No invoice found for new subscription:",
								invoiceError.message
							);
						}

						// Create billing history record for subscription creation
						const billingData = {
							studio_id: studioId,
							amount_gbp: tierDetails.price,
							description: `${tierName} subscription activated`,
							status: subscription.status === "active" ? "paid" : "pending",
							stripe_subscription_id: subscription.id,
							stripe_invoice_id: stripeInvoiceId,
							invoice_url: invoiceUrl,
							created_at: new Date().toISOString(),
						};

						console.log("💾 Creating billing history:", billingData);

						const { error: billingError } = await supabaseClient
							.from("billing_history")
							.insert([billingData]);

						if (billingError) {
							console.error("❌ Error creating billing history:", billingError);
							console.error(
								"❌ Full billing error details:",
								JSON.stringify(billingError, null, 2)
							);
						} else {
							console.log("✅ Billing history created successfully");
						}
					} else {
						console.log(
							"⚠️ Billing history entry already exists for this subscription"
						);
					}
				}

				console.log(
					"🎉 Subscription creation processing completed successfully"
				);
				break;
			}

			case "customer.subscription.updated": {
				const subscription = event.data.object;
				console.log("🔄 Processing subscription.updated:", {
					subscriptionId: subscription.id,
					status: subscription.status,
					cancelAtPeriodEnd: subscription.cancel_at_period_end,
					metadata: subscription.metadata,
				});

				// Find the subscription in our database
				const { data: existingSubscription, error: findError } =
					await supabaseClient
						.from("studio_subscriptions")
						.select("*")
						.eq("stripe_subscription_id", subscription.id)
						.single();

				if (findError || !existingSubscription) {
					console.error("❌ Subscription not found in database:", {
						stripeSubscriptionId: subscription.id,
						error: findError,
					});
					break;
				}

				console.log("✅ Found existing subscription:", existingSubscription);

				// Get the tier details from metadata
				const tierName = subscription.metadata?.tier_name;
				if (!tierName) {
					console.error("❌ Missing tier_name in subscription metadata");
					break;
				}

				// Get tier details from shared mapping
				const tierDetails = TIER_MAPPING[tierName];
				if (!tierDetails) {
					console.error("❌ Invalid tier name:", tierName);
					break;
				}

				// Update subscription details
				const updateData = {
					status: subscription.status,
					current_period_start: new Date(
						subscription.current_period_start * 1000
					).toISOString(),
					current_period_end: new Date(
						subscription.current_period_end * 1000
					).toISOString(),
					cancel_at_period_end: subscription.cancel_at_period_end,
					tier: tierName,
					max_students: tierDetails.maxStudents,
					price_gbp: tierDetails.price,
					updated_at: new Date().toISOString(),
				};

				console.log("💾 Updating subscription with:", updateData);

				const { error: updateError } = await supabaseClient
					.from("studio_subscriptions")
					.update(updateData)
					.eq("id", existingSubscription.id);

				if (updateError) {
					console.error("❌ Error updating subscription:", updateError);
					throw updateError;
				}

				console.log("✅ Subscription updated successfully");

				// If subscription was reactivated or tier changed, update studio tier
				if (
					(subscription.status === "active" &&
						existingSubscription.status !== "active") ||
					existingSubscription.tier !== tierName
				) {
					console.log("🔄 Updating studio tier");

					await supabaseClient
						.from("studios")
						.update({
							subscription_tier: tierName,
							max_students: tierDetails.maxStudents,
							updated_at: new Date().toISOString(),
						})
						.eq("id", existingSubscription.studio_id);

					// Create billing history for tier change
					await supabaseClient.from("billing_history").insert([
						{
							studio_id: existingSubscription.studio_id,
							amount_gbp: tierDetails.price,
							description:
								existingSubscription.tier !== tierName
									? `Subscription changed from ${existingSubscription.tier} to ${tierName}`
									: `${tierName} subscription reactivated`,
							status: "active",
							stripe_subscription_id: subscription.id,
							created_at: new Date().toISOString(),
						},
					]);

					console.log("✅ Studio tier updated");
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

				console.log("✅ Found subscription to delete:", existingSubscription);

				// Update subscription status to canceled
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

				console.log("✅ Subscription marked as canceled");

				// Create billing history for cancellation
				const { error: billingError } = await supabaseClient
					.from("billing_history")
					.insert([
						{
							studio_id: existingSubscription.studio_id,
							amount_gbp: 0,
							description: `${existingSubscription.tier} subscription canceled`,
							status: "canceled",
							stripe_subscription_id: subscription.id,
							created_at: new Date().toISOString(),
						},
					]);

				if (billingError) {
					console.error(
						"❌ Error creating cancellation billing history:",
						billingError
					);
				} else {
					console.log("✅ Cancellation billing history created");
				}

				// Reset studio to basic tier
				const { error: studioResetError } = await supabaseClient
					.from("studios")
					.update({
						subscription_tier: "Starter",
						max_students: 100,
						updated_at: new Date().toISOString(),
					})
					.eq("id", existingSubscription.studio_id);

				if (studioResetError) {
					console.error("❌ Error resetting studio tier:", studioResetError);
				} else {
					console.log("✅ Studio tier reset to Starter");
				}

				console.log("🎉 Subscription deletion processing completed");
				break;
			}

			case "invoice.payment_succeeded": {
				const stripeInvoice = event.data.object;
				console.log("🔄 Processing invoice.payment_succeeded:", {
					invoiceId: stripeInvoice.id,
					subscriptionId: stripeInvoice.subscription,
					amountPaid: stripeInvoice.amount_paid,
					invoiceUrl: stripeInvoice.invoice_pdf,
				});

				// Check if this is a subscription invoice
				if (stripeInvoice.subscription) {
					console.log("💳 Processing subscription payment");

					// Find subscription in our database
					const { data: subscription, error: subError } = await supabaseClient
						.from("studio_subscriptions")
						.select("*")
						.eq("stripe_subscription_id", stripeInvoice.subscription)
						.single();

					if (subscription && !subError) {
						console.log("✅ Found subscription for payment:", subscription);

						// Check if we already have a billing history entry for this invoice
						const { data: existingBilling } = await supabaseClient
							.from("billing_history")
							.select("id")
							.eq("stripe_invoice_id", stripeInvoice.id)
							.single();

						if (!existingBilling) {
							// Create billing history for successful payment
							const billingData = {
								studio_id: subscription.studio_id,
								amount_gbp:
									(stripeInvoice.amount_paid || stripeInvoice.total) / 100,
								description: `${subscription.tier} subscription payment`,
								status: "paid",
								stripe_invoice_id: stripeInvoice.id,
								stripe_payment_intent_id: stripeInvoice.payment_intent,
								stripe_subscription_id: stripeInvoice.subscription,
								invoice_url: stripeInvoice.invoice_pdf,
								created_at: new Date().toISOString(),
							};

							console.log(
								"💾 Creating billing history for payment:",
								billingData
							);

							const { error: billingError } = await supabaseClient
								.from("billing_history")
								.insert([billingData]);

							if (billingError) {
								console.error(
									"❌ Error creating billing history for subscription payment:",
									billingError
								);
							} else {
								console.log("✅ Billing history created for payment");
							}
						} else {
							console.log(
								"⚠️ Billing history entry already exists for this invoice"
							);
						}

						// Update subscription status if needed
						if (subscription.status !== "active") {
							console.log("🔄 Updating subscription status to active");

							await supabaseClient
								.from("studio_subscriptions")
								.update({
									status: "active",
									updated_at: new Date().toISOString(),
								})
								.eq("id", subscription.id);

							console.log("✅ Subscription status updated to active");
						}
					} else {
						console.error("❌ Subscription not found for payment:", {
							stripeSubscriptionId: stripeInvoice.subscription,
							error: subError,
						});
					}
				}

				console.log("🎉 Invoice payment processing completed");
				break;
			}

			case "checkout.session.completed": {
				const session = event.data.object;
				console.log("🔄 Processing checkout.session.completed:", {
					sessionId: session.id,
					mode: session.mode,
					subscriptionId: session.subscription,
					metadata: session.metadata,
				});

				// Check if this is a subscription checkout
				if (session.mode === "subscription" && session.subscription) {
					console.log("💳 Processing subscription checkout completion");

					// Handle subscription checkout success
					const subscription = await stripe.subscriptions.retrieve(
						session.subscription
					);
					const studioId = session.metadata?.studio_id;

					console.log("✅ Retrieved Stripe subscription:", {
						subscriptionId: subscription.id,
						status: subscription.status,
						studioId,
					});

					if (studioId && subscription) {
						// Try to get the invoice for this session
						let invoiceUrl = null;
						try {
							if (session.invoice) {
								const invoice = await stripe.invoices.retrieve(session.invoice);
								invoiceUrl = invoice.invoice_pdf;
								console.log("📄 Found checkout invoice URL:", invoiceUrl);
							} else {
								// Fallback: get latest invoice for subscription
								const invoices = await stripe.invoices.list({
									subscription: subscription.id,
									limit: 1,
								});

								if (invoices.data.length > 0) {
									invoiceUrl = invoices.data[0].invoice_pdf;
									console.log("📄 Found subscription invoice URL:", invoiceUrl);
								}
							}
						} catch (invoiceError) {
							console.log(
								"⚠️ Could not fetch invoice for checkout:",
								invoiceError.message
							);
						}

						// Create billing history for subscription checkout
						const billingData = {
							studio_id: studioId,
							amount_gbp: (session.amount_total || 0) / 100,
							description: `Subscription checkout completed`,
							status: "paid",
							stripe_payment_intent_id: session.payment_intent,
							stripe_subscription_id: subscription.id,
							invoice_url: invoiceUrl,
							created_at: new Date().toISOString(),
						};

						console.log(
							"💾 Creating checkout completion billing history:",
							billingData
						);

						const { error: billingError } = await supabaseClient
							.from("billing_history")
							.insert([billingData]);

						if (billingError) {
							console.error(
								"❌ Error creating checkout billing history:",
								billingError
							);
						} else {
							console.log("✅ Checkout billing history created");
						}
					} else {
						console.error("❌ Missing studioId or subscription for checkout:", {
							studioId,
							subscriptionExists: !!subscription,
						});
					}
				}

				console.log("🎉 Checkout session processing completed");
				break;
			}

			default:
				console.log("Unhandled event type:", event.type);
				break;
		}
		return new Response(JSON.stringify({ ok: true }), { status: 200 });
	} catch (err) {
		console.error("Webhook error:", err.message);

		// Detailed error logging for debugging
		if (err.type === "StripeSignatureVerificationError") {
			console.error("⚠️ Signature verification failed!");
			console.error("Header present:", !!signature);
			if (signature) {
				console.error("Signature preview:", signature.substring(0, 20) + "...");
			}
			console.error("Timestamp issue:", err.message.includes("timestamp"));
			console.error("Signature issue:", err.message.includes("signature"));
		} else {
			console.error("Other error type:", err.type);
		}

		// Log event processing details
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
