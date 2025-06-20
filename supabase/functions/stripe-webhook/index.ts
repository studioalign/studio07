// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0";

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
		const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

		if (!webhookSecret) {
			console.error("STRIPE_WEBHOOK_SECRET environment variable is not set");
			return new Response("Webhook secret not configured", { status: 500 });
		}

		event = await stripe.webhooks.constructEventAsync(
			body,
			signature!,
			webhookSecret!,
			undefined,
			cryptoProvider
		);
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
		);

		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object;
				console.log("Checkout session completed:", session.id);

				// Extract metadata from the session
				const invoiceId =
					session.metadata?.invoice_id ||
					session.payment_link?.metadata?.invoice_id;
				const stripeInvoiceId =
					session.metadata?.stripe_invoice_id ||
					session.payment_link?.metadata?.stripe_invoice_id;
				const studioConnectId =
					session.metadata?.studio_connect_id ||
					session.payment_link?.metadata?.studio_connect_id;

				if (!invoiceId) {
					console.error(
						"No invoice ID found in session or payment link metadata"
					);
					break;
				}

				// Mark the invoice as paid in Stripe if needed
				if (stripeInvoiceId && studioConnectId) {
					try {
						// Pay the invoice using paid_out_of_band
						await stripe.invoices.pay(
							stripeInvoiceId,
							{ paid_out_of_band: true },
							{ stripeAccount: studioConnectId }
						);
					} catch (err) {
						console.error("Error updating Stripe invoice:", err);
						// Continue processing even if Stripe invoice update fails
					}
				}

				// Update invoice status in our database
				const { error: updateError } = await supabaseClient
					.from("invoices")
					.update({
						status: "paid",
						paid_at: new Date().toISOString(),
					})
					.eq("id", invoiceId);

				if (updateError) {
					console.error("Error updating invoice in database:", updateError);
					throw updateError;
				}

				// Fetch the invoice to get the amount paid (after any discount)
				const { data: invoice, error: fetchError } = await supabaseClient
					.from("invoices")
					.select(
						"id, total, discount_value, discount_type, is_recurring, recurring_interval"
					)
					.eq("id", invoiceId)
					.single();

				if (fetchError) {
					console.error("Error fetching invoice:", fetchError);
					throw fetchError;
				}

				// Check if a payment record already exists
				const { data: existingPayment } = await supabaseClient
					.from("payments")
					.select("id")
					.eq("invoice_id", invoiceId)
					.eq("status", "completed")
					.single();

				if (!existingPayment) {
					// Create payment record - EXPLICITLY SPECIFY ONLY NECESSARY FIELDS
					const paymentRecord = {
						invoice_id: invoiceId,
						amount: invoice.total,
						original_amount: invoice.subtotal,
						discount_amount: invoice.subtotal - invoice.total,
						payment_method: "card",
						status: "completed",
						payment_date: new Date().toISOString(),
						stripe_payment_intent_id: session.payment_intent,
						stripe_invoice_id: stripeInvoiceId,
						is_recurring: invoice.is_recurring || false,
						recurring_interval: invoice.is_recurring
							? invoice.recurring_interval
							: null,
					};

					// Only add recurring_interval if it exists and is recurring
					if (invoice.is_recurring && invoice.recurring_interval) {
						paymentRecord.recurring_interval = invoice.recurring_interval;
					}

					const { error: paymentError } = await supabaseClient
						.from("payments")
						.insert([paymentRecord]);

					if (paymentError) {
						console.error("Error creating payment record:", paymentError);
						throw paymentError;
					}

					console.log("Payment record created successfully");
				} else {
					console.log(
						"Payment record already exists for this invoice, skipping creation"
					);
				}

				break;
			}

			case "invoice.updated": {
				console.log("Stripe invoice updated event received");
				await handleInvoiceEvent(event.data.object, supabaseClient);
				break;
			}

			case "invoice.created": {
				console.log("Stripe invoice created event received");
				await handleInvoiceEvent(event.data.object, supabaseClient);
				break;
			}

			case "invoice.paid": {
				const stripeInvoice = event.data.object;
				console.log("Stripe invoice:", stripeInvoice);

				// Find our invoice associated with this Stripe invoice
				const { data: invoice, error: fetchError } = await supabaseClient
					.from("invoices")
					.select(
						"id, total, discount_value, discount_type, is_recurring, recurring_interval"
					)
					.eq("stripe_invoice_id", stripeInvoice.id)
					.single();

				if (fetchError) {
					console.error("Error finding invoice:", fetchError);
					throw fetchError;
				}

				if (!invoice) {
					console.error(
						"No matching invoice found for Stripe invoice:",
						stripeInvoice.id
					);
					break;
				}

				console.log("Invoice data:", invoice);

				// Update invoice status
				const { error: updateError } = await supabaseClient
					.from("invoices")
					.update({
						status: "paid",
						paid_at: new Date().toISOString(),
					})
					.eq("id", invoice.id);

				if (updateError) {
					throw updateError;
				}

				console.log("Invoice status updated to paid");

				// If this was a recurring invoice and there's a subscription, update its status
				if (invoice.is_recurring) {
					await supabaseClient
						.from("subscriptions")
						.update({ status: "active" })
						.eq("invoice_id", invoice.id)
						.neq("stripe_subscription_id", null);
				}

				break;
			}

			case "invoice.payment_succeeded": {
				const stripeInvoice = event.data.object;
				console.log("Invoice payment succeeded:", stripeInvoice.id);

				// Check if this is an invoice created through our system
				const { data: invoice, error: fetchError } = await supabaseClient
					.from("invoices")
					.select(
						"id, total, discount_value, discount_type, is_recurring, recurring_interval"
					)
					.eq("stripe_invoice_id", stripeInvoice.id)
					.single();

				if (fetchError) {
					console.error("Error finding invoice:", fetchError);
					break;
				}

				if (!invoice) {
					console.log(
						"No matching invoice found in our database for this Stripe invoice"
					);
					break;
				}

				// Check if a payment record already exists
				const { data: existingPayment } = await supabaseClient
					.from("payments")
					.select("id")
					.eq("invoice_id", invoice.id)
					.eq("status", "completed")
					.single();

				if (!existingPayment) {
					// Create payment record - EXPLICITLY SPECIFY ONLY NECESSARY FIELDS
					const paymentRecord = {
						invoice_id: invoice.id,
						amount: invoice.total,
						original_amount: invoice.subtotal,
						discount_amount: invoice.subtotal - invoice.total,
						payment_method: "card",
						status: "completed",
						payment_date: new Date().toISOString(),
						stripe_payment_intent_id: stripeInvoice.payment_intent,
						stripe_invoice_id: stripeInvoice.id,
						is_recurring: invoice.is_recurring || false,
						recurring_interval: invoice.is_recurring
							? invoice.recurring_interval
							: null,
					};

					// Only add recurring_interval if it exists and is recurring
					if (invoice.is_recurring && invoice.recurring_interval) {
						paymentRecord.recurring_interval = invoice.recurring_interval;
					}

					const { error: paymentError } = await supabaseClient
						.from("payments")
						.insert([paymentRecord]);

					if (paymentError) {
						console.error("Error creating payment record:", paymentError);
						throw paymentError;
					}

					console.log("Payment record created successfully");
				}

				break;
			}

			case "invoice.payment_failed": {
				const stripeInvoice = event.data.object;

				// Find our invoice associated with this Stripe invoice
				const { data: invoice, error: fetchError } = await supabaseClient
					.from("invoices")
					.select(
						"id, total, discount_value, discount_type, is_recurring, recurring_interval"
					)
					.eq("stripe_invoice_id", stripeInvoice.id)
					.single();

				if (fetchError) {
					throw fetchError;
				}

				if (!invoice) {
					console.error(
						"No matching invoice found for Stripe invoice:",
						stripeInvoice.id
					);
					break;
				}

				// Create a failed payment record - NO DISCOUNT TRACKING
				const { error: paymentError } = await supabaseClient
					.from("payments")
					.insert([
						{
							invoice_id: invoice.id,
							amount: invoice.total,
							original_amount: invoice.subtotal,
							discount_amount: invoice.subtotal - invoice.total,
							payment_method: "card",
							status: "failed",
							payment_date: new Date().toISOString(),
							stripe_payment_intent_id: stripeInvoice.payment_intent,
							stripe_invoice_id: stripeInvoice.id,
							is_recurring: invoice.is_recurring || false,
							recurring_interval: invoice.is_recurring
								? invoice.recurring_interval
								: null,
						},
					]);

				if (paymentError) {
					throw paymentError;
				}

				break;
			}

			case "payment_intent.payment_failed": {
				const paymentIntent = event.data.object;
				const invoiceId = paymentIntent.metadata?.invoice_id;

				if (!invoiceId) {
					console.log("No invoice ID found in payment intent metadata");
					break;
				}

				// Find our invoice associated with this payment intent
				const { data: invoice, error: fetchError } = await supabaseClient
					.from("invoices")
					.select(
						"id, total, discount_value, discount_type, is_recurring, recurring_interval"
					)
					.eq("id", invoiceId)
					.single();

				if (fetchError) {
					console.error("Error finding invoice:", fetchError);
					break;
				}

				// Calculate the final amount after discount
				let finalAmount = invoice.total;

				if (invoice.discount_value) {
					if (invoice.discount_type === "percentage") {
						finalAmount = invoice.total * (1 - invoice.discount_value / 100);
					} else {
						finalAmount = invoice.total - invoice.discount_value;
					}
				}

				// Round to 2 decimal places
				finalAmount = Math.round(finalAmount * 100) / 100;

				// Create a failed payment record - EXPLICITLY SPECIFY ONLY NECESSARY FIELDS
				const paymentRecord = {
					invoice_id: invoice.id,
					amount: finalAmount,
					payment_method: "card",
					status: "failed",
					payment_date: new Date().toISOString(),
					stripe_payment_intent_id: paymentIntent.id,
					is_recurring: invoice.is_recurring || false,
					recurring_interval: invoice.is_recurring
						? invoice.recurring_interval
						: null,
				};

				// Only add recurring_interval if it exists and is recurring
				if (invoice.is_recurring && invoice.recurring_interval) {
					paymentRecord.recurring_interval = invoice.recurring_interval;
				}

				const { error: paymentError } = await supabaseClient
					.from("payments")
					.insert([paymentRecord]);

				if (paymentError) {
					console.error("Error creating failed payment record:", paymentError);
				}

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

/**
 * Type definitions for Stripe invoice object and Supabase client
 */
interface StripeInvoice {
	id: string;
	invoice_pdf?: string;
	subtotal: number;
	total: number;
	status: string;
	charge?: string;
	payment_intent?: string;
	metadata?: {
		internal_invoice_id?: string;
		[key: string]: string | undefined;
	};
}

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Handles invoice.created and invoice.updated events
 */
async function handleInvoiceEvent(
	stripeInvoice: StripeInvoice,
	supabaseClient: SupabaseClient
) {
	try {
		// Extract the internal invoice ID from metadata
		const internalInvoiceId = stripeInvoice.metadata?.internal_invoice_id;

		if (!internalInvoiceId) {
			console.log(
				"No internal invoice ID found in metadata",
				stripeInvoice.metadata
			);
			return;
		}

		console.log(
			`Processing invoice event for internal invoice ID: ${internalInvoiceId}`
		);

		// Update the invoice in our database with the latest Stripe data
		const { error } = await supabaseClient
			.from("invoices")
			.update({
				stripe_invoice_id: stripeInvoice.id,
				pdf_url: stripeInvoice.invoice_pdf,
				status: mapStripeInvoiceStatus(stripeInvoice.status),
				updated_at: new Date().toISOString(),
			})
			.eq("id", internalInvoiceId);

		if (error) {
			console.error("Error updating invoice in database:", error);
			throw error;
		}

		console.log(
			`Successfully updated invoice ${internalInvoiceId} with Stripe data`
		);
	} catch (error) {
		console.error("Error handling invoice event:", error);
	}
}

/**
 * Maps Stripe invoice status to our internal status
 */
function mapStripeInvoiceStatus(stripeStatus: string): string {
	switch (stripeStatus) {
		case "draft":
			return "draft";
		case "open":
			return "pending";
		case "paid":
			return "paid";
		case "uncollectible":
			return "failed";
		case "void":
			return "cancelled";
		default:
			return "pending";
	}
}
