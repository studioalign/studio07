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
		const { invoiceId, stripeInvoiceId, paymentMethodId, isRecurring } =
			await req.json();

		if (!invoiceId || !stripeInvoiceId || !paymentMethodId) {
			console.error("Missing required fields");
			return new Response(
				JSON.stringify({
					error:
						"Invoice ID, Stripe Invoice ID, and Payment Method ID are required",
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		console.log(
			`Processing payment for invoice ${invoiceId} with Stripe invoice ${stripeInvoiceId}`
		);

		try {
			// Retrieve the Stripe invoice
			const stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId);

			if (!stripeInvoice) {
				throw new Error(`Stripe invoice ${stripeInvoiceId} not found`);
			}

			// Attach the payment method to the customer
			await stripe.paymentMethods.attach(paymentMethodId, {
				customer: stripeInvoice.customer as string,
			});

			// Set as default payment method for the customer
			await stripe.customers.update(stripeInvoice.customer as string, {
				invoice_settings: {
					default_payment_method: paymentMethodId,
				},
			});

			// Pay the invoice
			const paidInvoice = await stripe.invoices.pay(stripeInvoiceId, {
				payment_method: paymentMethodId,
			});

			// If this is a recurring invoice, we need to update the subscription's default payment method
			if (isRecurring) {
				// Get the subscription ID for this invoice
				const { data: invoice, error: fetchError } = await supabaseClient
					.from("invoices")
					.select("stripe_subscription_id")
					.eq("id", invoiceId)
					.single();

				if (fetchError) {
					console.error("Error fetching invoice data:", fetchError);
				} else if (invoice?.stripe_subscription_id) {
					// Update the subscription's default payment method
					await stripe.subscriptions.update(invoice.stripe_subscription_id, {
						default_payment_method: paymentMethodId,
					});

					// Update subscription status in database
					await supabaseClient
						.from("subscriptions")
						.update({ status: "active", payment_method_id: paymentMethodId })
						.eq("stripe_subscription_id", invoice.stripe_subscription_id);
				}
			}

			console.log(`Invoice ${stripeInvoiceId} paid successfully`);

			return new Response(
				JSON.stringify({
					success: true,
					invoice_id: paidInvoice.id,
					payment_intent_id: paidInvoice.payment_intent,
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/pay-stripe-invoice' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"invoiceId":"your-invoice-id", "stripeInvoiceId":"your-stripe-invoice-id", "paymentMethodId":"pm_123456"}'

*/
