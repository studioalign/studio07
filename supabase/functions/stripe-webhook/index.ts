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

serve(async (req) => {
	const signature = req.headers.get("Stripe-Signature");

	// First step is to verify the event. The .text() method must be used as the
	// verification relies on the raw request body rather than the parsed JSON.
	const body = await req.text();
	let event;
	try {
		const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

		event = await stripe.webhooks.constructEventAsync(
			body,
			signature!,
			webhookSecret!,
			undefined,
			cryptoProvider
		);
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_ANON_KEY") ?? ""
		);

		switch (event.type) {
			case "payment_intent.succeeded": {
				const paymentIntent = event.data.object;
				const invoiceId = paymentIntent.metadata.invoice_id;

				// Update invoice status
				const { error: updateError } = await supabaseClient
					.from("invoices")
					.update({
						status: "paid",
						paid_at: new Date().toISOString(),
					})
					.eq("id", invoiceId);

				if (updateError) {
					throw updateError;
				}

				// Create payment record
				const { error: paymentError } = await supabaseClient
					.from("payments")
					.insert([
						{
							invoice_id: invoiceId,
							amount: paymentIntent.amount / 100, // Convert from cents
							payment_method: "card",
							transaction_id: paymentIntent.id,
							status: "completed",
							payment_date: new Date().toISOString(),
							stripe_payment_intent_id: paymentIntent.id,
						},
					]);

				if (paymentError) {
					throw paymentError;
				}

				break;
			}

			case "invoice.paid": {
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

				// Calculate the actual amount paid after discount
				let finalAmount = invoice.total;
				if (invoice.discount_value) {
					if (invoice.discount_type === "percentage") {
						finalAmount = invoice.total * (1 - invoice.discount_value / 100);
					} else {
						finalAmount = invoice.total - invoice.discount_value;
					}
				}

				// Create payment record
				const { error: paymentError } = await supabaseClient
					.from("payments")
					.insert([
						{
							invoice_id: invoice.id,
							amount: finalAmount,
							original_amount: invoice.total,
							discount_amount:
								invoice.discount_value > 0
									? invoice.discount_type === "percentage"
										? invoice.total * (invoice.discount_value / 100)
										: invoice.discount_value
									: null,
							payment_method:
								stripeInvoice.collection_method === "charge_automatically"
									? "card"
									: "manual",
							transaction_id: stripeInvoice.payment_intent || stripeInvoice.id,
							status: "completed",
							payment_date: new Date().toISOString(),
							stripe_payment_intent_id: stripeInvoice.payment_intent,
							is_recurring: invoice.is_recurring || false,
							recurring_interval: invoice.is_recurring
								? invoice.recurring_interval
								: null,
						},
					]);

				if (paymentError) {
					throw paymentError;
				}

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

				// Calculate the actual amount paid after discount
				let finalAmount = invoice.total;
				if (invoice.discount_value) {
					if (invoice.discount_type === "percentage") {
						finalAmount = invoice.total * (1 - invoice.discount_value / 100);
					} else {
						finalAmount = invoice.total - invoice.discount_value;
					}
				}

				// Update invoice status if needed
				const { error: paymentError } = await supabaseClient
					.from("payments")
					.insert([
						{
							invoice_id: invoice.id,
							amount: finalAmount,
							original_amount: invoice.total,
							discount_amount:
								invoice.discount_value > 0
									? invoice.discount_type === "percentage"
										? invoice.total * (invoice.discount_value / 100)
										: invoice.discount_value
									: null,
							transaction_id: stripeInvoice.id,
							status: "failed",
							payment_date: new Date().toISOString(),
							stripe_payment_intent_id: stripeInvoice.payment_intent,
							is_recurring: invoice.is_recurring || false,
							recurring_interval: invoice.is_recurring
								? invoice.recurring_interval
								: "",
						},
					]);

				if (paymentError) {
					throw paymentError;
				}

				break;
			}

			case "payment_intent.payment_failed": {
				const paymentIntent = event.data.object;
				const invoiceId = paymentIntent.metadata.invoice_id;

				// Find our invoice associated with this Stripe invoice
				const { data: invoice, error: fetchError } = await supabaseClient
					.from("invoices")
					.select(
						"id, total, discount_value, discount_type, is_recurring, recurring_interval"
					)
					.eq("stripe_invoice_id", invoiceId)
					.single();

				if (fetchError) {
					console.error("Error finding invoice:", fetchError);
					throw fetchError;
				}

				if (!invoice) {
					console.error(
						"No matching invoice found for Stripe invoice:",
						invoiceId
					);
					break;
				}

				// Calculate the actual amount paid after discount
				let finalAmount = invoice.total;
				if (invoice.discount_value) {
					if (invoice.discount_type === "percentage") {
						finalAmount = invoice.total * (1 - invoice.discount_value / 100);
					} else {
						finalAmount = invoice.total - invoice.discount_value;
					}
				}

				// Update invoice status if needed
				const { error: paymentError } = await supabaseClient
					.from("payments")
					.insert([
						{
							invoice_id: invoice.id,
							amount: finalAmount,
							original_amount: invoice.total,
							discount_amount:
								invoice.discount_value > 0
									? invoice.discount_type === "percentage"
										? invoice.total * (invoice.discount_value / 100)
										: invoice.discount_value
									: null,
							transaction_id: invoiceId,
							status: "failed",
							payment_date: new Date().toISOString(),
							stripe_payment_intent_id: paymentIntent.id,
							is_recurring: invoice.is_recurring || false,
							recurring_interval: invoice.is_recurring
								? invoice.recurring_interval
								: "",
						},
					]);

				if (paymentError) {
					throw paymentError;
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
		return new Response(err.message, { status: 400 });
	}
});
