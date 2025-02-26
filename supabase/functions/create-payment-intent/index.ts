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

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
	// Handle CORS
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		// Create Supabase client
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_ANON_KEY") ?? ""
		);

		// Get the authorization header from the request
		const authHeader = req.headers.get("Authorization");
		if (!authHeader) {
			console.error("No authorization header provided");
			return new Response(
				JSON.stringify({ error: "No authorization header" }),
				{
					status: 401,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		// Get the JWT token from the authorization header
		const jwt = authHeader.replace("Bearer ", "");

		// Get the user from the JWT token
		const {
			data: { user },
			error: userError,
		} = await supabaseClient.auth.getUser(jwt);

		if (userError) {
			console.error("User authentication error:", userError);
			return new Response(JSON.stringify({ error: "Authentication failed" }), {
				status: 401,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		if (!user) {
			console.error("No user found");
			return new Response(JSON.stringify({ error: "User not found" }), {
				status: 404,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		// Get the request body
		const {
			invoiceId,
			amount,
			isRecurring,
			recurringInterval,
			recurringEndDate,
			setup,
			paymentMethodId,
		} = await req.json();

		if (!invoiceId || !amount) {
			console.error("No invoice ID or amount provided");
			return new Response(
				JSON.stringify({ error: "Invoice ID and amount are required" }),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		console.log("Fetching invoice:", invoiceId);

		// Get the invoice details
		const { data: invoice, error: invoiceError } = await supabaseClient
			.from("invoices")
			.select(
				`
				*,
				parent:users!invoices_parent_id_fkey (
					id,
					email,
					name,
					stripe_customer_id
				)
			`
			)
			.eq("id", invoiceId)
			.single();

		if (invoiceError) {
			console.error("Error fetching invoice:", invoiceError);
			return new Response(
				JSON.stringify({ error: "Failed to fetch invoice" }),
				{
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		if (!invoice) {
			console.error("Invoice not found:", invoiceId);
			return new Response(JSON.stringify({ error: "Invoice not found" }), {
				status: 404,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		console.log("Invoice found:", invoice);

		// Check if the parent has a Stripe customer ID
		let customerId = invoice.parent.stripe_customer_id;

		// If not, create a new customer
		if (!customerId) {
			console.log("Creating new Stripe customer for:", invoice.parent.email);
			try {
				const customer = await stripe.customers.create({
					email: invoice.parent.email,
					name: invoice.parent.name,
				});
				customerId = customer.id;

				// Save the customer ID
				const { error: updateError } = await supabaseClient
					.from("users")
					.update({ stripe_customer_id: customerId })
					.eq("id", invoice.parent.id);

				if (updateError) {
					console.error("Error saving customer ID:", updateError);
					throw updateError;
				}
			} catch (error) {
				console.error("Error creating Stripe customer:", error);
				return new Response(
					JSON.stringify({ error: "Failed to create Stripe customer" }),
					{
						status: 500,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					}
				);
			}
		}

		console.log("Creating payment intent for amount:", amount);

		try {
			if (setup) {
				// Create SetupIntent for saving card
				const setupIntent = await stripe.setupIntents.create({
					customer: customerId,
					payment_method_types: ["card"],
					metadata: {
						invoice_id: invoice.id,
					},
				});

				return new Response(
					JSON.stringify({
						client_secret: setupIntent.client_secret,
					}),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					}
				);
			} else if (isRecurring && paymentMethodId) {
				// Create a product for this subscription
				const product = await stripe.products.create({
					name: `Invoice ${invoice.id} Subscription`,
					metadata: {
						invoice_id: invoice.id,
					},
				});

				// Create a price for the subscription
				const price = await stripe.prices.create({
					product: product.id,
					unit_amount: Math.round(amount * 100),
					currency: "gbp",
					recurring: {
						interval: recurringInterval.toLowerCase(),
					},
				});

				// Create the subscription
				const subscription = await stripe.subscriptions.create({
					customer: customerId,
					items: [{ price: price.id }],
					default_payment_method: paymentMethodId,
					metadata: {
						invoice_id: invoice.id,
					},
					cancel_at: Math.floor(new Date(recurringEndDate).getTime() / 1000),
				});

				// After creating the subscription, fetch and store the invoice PDF
				if (subscription.latest_invoice) {
					const invoice = await stripe.invoices.retrieve(
						subscription.latest_invoice as string,
						{
							expand: ["invoice_pdf"],
						}
					);

					if (invoice.invoice_pdf) {
						// Update the invoice record with the PDF URL
						await supabaseClient
							.from("invoices")
							.update({ pdf_url: invoice.invoice_pdf })
							.eq("id", invoiceId);
					}
				}

				return new Response(
					JSON.stringify({
						subscription_id: subscription.id,
						latest_invoice: subscription.latest_invoice,
					}),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					}
				);
			} else {
				// Create one-time payment intent
				const paymentIntent = await stripe.paymentIntents.create({
					amount: Math.round(amount * 100),
					currency: "gbp",
					customer: customerId,
					metadata: {
						invoice_id: invoice.id,
					},
				});

				// Create a Stripe invoice for the payment
				const stripeInvoice = await stripe.invoices.create({
					customer: customerId,
					pending_invoice_items_behavior: "exclude",
					metadata: {
						invoice_id: invoice.id,
					},
				});

				// Add the invoice item
				await stripe.invoiceItems.create({
					customer: customerId,
					invoice: stripeInvoice.id,
					amount: Math.round(amount * 100),
					currency: "gbp",
					description: `Invoice ${invoice.id}`,
				});

				// Finalize and pay the invoice
				const finalizedInvoice = await stripe.invoices.finalizeInvoice(
					stripeInvoice.id
				);

				if (finalizedInvoice.invoice_pdf) {
					// Update the invoice record with the PDF URL
					await supabaseClient
						.from("invoices")
						.update({ pdf_url: finalizedInvoice.invoice_pdf })
						.eq("id", invoiceId);
				}

				return new Response(
					JSON.stringify({
						client_secret: paymentIntent.client_secret,
						invoice_id: stripeInvoice.id,
					}),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					}
				);
			}
		} catch (error) {
			console.error("Stripe error:", error);
			return new Response(
				JSON.stringify({
					error: error.message || "Failed to process payment",
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}
	} catch (error) {
		console.error("Unexpected error:", error);
		return new Response(
			JSON.stringify({
				error: error.message || "An unexpected error occurred",
			}),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			}
		);
	}
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-payment-intent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
