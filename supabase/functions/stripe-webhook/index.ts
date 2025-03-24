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
			Deno.env.get("SUPABASE_ANON_KEY") ?? ""
		);

		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object;
				console.log("Checkout session completed:", session.id);

				// Extract metadata from the session
				// Try both direct metadata and payment_link metadata (for payment links)
				const invoiceId =
					session.metadata?.invoice_id ||
					session.payment_link?.metadata?.invoice_id;
				const stripeInvoiceId =
					session.metadata?.stripe_invoice_id ||
					session.payment_link?.metadata?.stripe_invoice_id;
				const studioConnectId =
					session.metadata?.studio_connect_id ||
					session.payment_link?.metadata?.studio_connect_id;

				console.log("Session data:", session);
				console.log("Session metadata:", {
					invoiceId,
					stripeInvoiceId,
					studioConnectId,
				});

				if (!invoiceId) {
					console.error(
						"No invoice ID found in session or payment link metadata"
					);
					break;
				}

				// If we have a Stripe invoice ID and studio connect ID, mark the invoice as paid in Stripe
				if (stripeInvoiceId && studioConnectId) {
					try {
						// Retrieve the invoice
						const stripeInvoice = await stripe.invoices.retrieve(
							stripeInvoiceId,
							{
								stripeAccount: studioConnectId,
							}
						);

						console.log(
							"Retrieved Stripe invoice:",
							stripeInvoice.id,
							"with status:",
							stripeInvoice.status
						);

						// If the invoice is not paid yet, mark it as paid
						if (stripeInvoice.status !== "paid") {
							console.log("Attempting to mark invoice as paid");

							// Pay the invoice using paid_out_of_band
							const paidInvoice = await stripe.invoices.pay(
								stripeInvoiceId,
								{
									paid_out_of_band: true, // Mark as paid without charging again
								},
								{
									stripeAccount: studioConnectId,
								}
							);

							console.log(
								"Updated invoice status to paid:",
								paidInvoice.id,
								"New status:",
								paidInvoice.status
							);

							// Verify the invoice status after marking it as paid
							const verifiedInvoice = await stripe.invoices.retrieve(
								stripeInvoiceId,
								{
									stripeAccount: studioConnectId,
									expand: ["payment_intent"],
								}
							);

							console.log("Verified invoice status:", verifiedInvoice.status);

							// If still not paid, try updating it directly
							if (verifiedInvoice.status !== "paid") {
								console.log(
									"Invoice still not paid, trying to update it directly"
								);

								// Update the invoice status directly
								const updatedInvoice = await stripe.invoices.update(
									stripeInvoiceId,
									{
										status: "paid",
									},
									{
										stripeAccount: studioConnectId,
									}
								);

								console.log(
									"Directly updated invoice status:",
									updatedInvoice.status
								);
							}
						}
					} catch (err) {
						console.error("Error updating Stripe invoice:", err);
						// Continue processing even if Stripe invoice update fails
					}
				}

				// Update invoice status in the database
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

				// Create payment record
				const { data: invoice, error: fetchError } = await supabaseClient
					.from("invoices")
					.select(
						"total, discount_value, discount_type, is_recurring, recurring_interval"
					)
					.eq("id", invoiceId)
					.single();

				if (fetchError) {
					console.error("Error fetching invoice:", fetchError);
					throw fetchError;
				}

				// Calculate the actual amount paid after discount
				let finalAmount = invoice.total;
				let discountAmount = 0;
				
				if (invoice.discount_value) {
				  if (invoice.discount_type === "percentage") {
				    discountAmount = invoice.total * (invoice.discount_value / 100);
				    finalAmount = invoice.total - discountAmount;
				  } else {
				    discountAmount = invoice.discount_value;
				    finalAmount = invoice.total - discountAmount;
				  }
				
				  // ENSURE finalAmount is rounded to 2 decimal places
				  finalAmount = Number(finalAmount.toFixed(2));
				}

				// Check if a payment record already exists for this invoice to prevent duplicates
				const { data: existingPayment, error: paymentCheckError } =
					await supabaseClient
						.from("payments")
						.select("id")
						.match({
							invoice_id: invoiceId,
							status: "completed",
							transaction_id: session.id,
						})
						.single();

				if (
					paymentCheckError &&
					!paymentCheckError.message.includes("No rows found")
				) {
					console.error(
						"Error checking for existing payment:",
						paymentCheckError
					);
					throw paymentCheckError;
				}

				// Only create payment record if one doesn't already exist
				if (!existingPayment) {
					console.log("No existing payment found, creating new payment record");

					// Create payment record
					// Replace the existing payment record insertion code with:
					const { error: paymentError } = await supabaseClient
					  .from("payments")
					  .insert([
					    {
					      invoice_id: invoice.id,
					      amount: finalAmount, // Use pre-discounted total
					      original_amount: invoice.total,
					      discount_amount: invoice.discount_value > 0 
					        ? (invoice.discount_type === 'percentage' 
					            ? invoice.total * (invoice.discount_value / 100)
					            : invoice.discount_value)
					        : null,
					      transaction_id: stripeInvoice.id,
					      status: "failed",
					      payment_date: new Date().toISOString(),
					      stripe_payment_intent_id: stripeInvoice.payment_intent,
					      stripe_invoice_id: stripeInvoice.id,
					      is_recurring: invoice.is_recurring || false,
					      recurring_interval: invoice.is_recurring
					        ? invoice.recurring_interval
					        : "",
					    },
					  ]);

					if (paymentError) {
						console.error("Error creating payment record:", paymentError);
						throw paymentError;
					}

					console.log(
						"Payment record created successfully for checkout session"
					);
				} else {
					console.log(
						"Payment record already exists for this checkout session, skipping creation"
					);
				}

				console.log("Successfully processed checkout.session.completed event");
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
					// This might be an invoice not created through our system
					break;
				}

				if (!invoice) {
					console.log(
						"No matching invoice found in our database for this Stripe invoice"
					);
					break;
				}

				console.log("Found matching invoice in our database:", invoice.id);

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
				      amount: finalAmount, // Use pre-discounted total
				      original_amount: invoice.total,
				      discount_amount: invoice.discount_value > 0 
				        ? (invoice.discount_type === 'percentage' 
				            ? invoice.total * (invoice.discount_value / 100)
				            : invoice.discount_value)
				        : null,
				      payment_method: "card",
				      transaction_id: session.id,
				      status: "completed",
				      payment_date: new Date().toISOString(),
				      stripe_payment_intent_id: session.payment_intent,
				      stripe_invoice_id: stripeInvoiceId,
				      is_recurring: invoice.is_recurring || false,
				      recurring_interval: invoice.is_recurring
				        ? invoice.recurring_interval
				        : null,
				    },
				  ]);

				console.log(
					"Payment record created:",
					paymentError ? "Error" : "Success"
				);

				if (paymentError) {
					throw paymentError;
				}

				console.log("Successfully processed invoice.payment_succeeded event");
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
				// Replace the existing payment record insertion code with:
				const { error: paymentError } = await supabaseClient
				  .from("payments")
				  .insert([
				    {
				      invoice_id: invoice.id,
				      amount: finalAmount, // Use pre-discounted total
				      original_amount: invoice.total,
				      discount_amount: invoice.discount_value > 0 
				        ? (invoice.discount_type === 'percentage' 
				            ? invoice.total * (invoice.discount_value / 100)
				            : invoice.discount_value)
				        : null,
				      transaction_id: stripeInvoice.id,
				      status: "failed",
				      payment_date: new Date().toISOString(),
				      stripe_payment_intent_id: stripeInvoice.payment_intent,
				      stripe_invoice_id: stripeInvoice.id,
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
				// Replace the existing payment record insertion code with:
				const { error: paymentError } = await supabaseClient
				  .from("payments")
				  .insert([
				    {
				      invoice_id: invoice.id,
				      amount: finalAmount, // Use pre-discounted total
				      original_amount: invoice.total,
				      discount_amount: invoice.discount_value > 0 
				        ? (invoice.discount_type === 'percentage' 
				            ? invoice.total * (invoice.discount_value / 100)
				            : invoice.discount_value)
				        : null,
				      transaction_id: stripeInvoice.id,
				      status: "failed",
				      payment_date: new Date().toISOString(),
				      stripe_payment_intent_id: stripeInvoice.payment_intent,
				      stripe_invoice_id: stripeInvoice.id,
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
