// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Add type declarations for Deno environment
declare const Deno: {
	env: {
		get(key: string): string | undefined;
	};
};

// Import with type declarations for TypeScript
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

console.log("Starting checkout session");

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		// Initialize Supabase client
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_ANON_KEY") ?? ""
		);

		// Authenticate the user
		const authHeader = req.headers.get("Authorization");
		if (!authHeader) {
			return new Response(
				JSON.stringify({ error: "No authorization header" }),
				{ status: 401, headers: corsHeaders }
			);
		}

		console.log("Auth header:", authHeader);

		const jwt = authHeader.replace("Bearer ", "");
		const {
			data: { user },
			error: userError,
		} = await supabaseClient.auth.getUser(jwt);

		console.log("User:", user);

		if (userError || !user) {
			return new Response(JSON.stringify({ error: "Authentication failed" }), {
				status: 401,
				headers: corsHeaders,
			});
		}

		// Get request parameters
		const { invoiceId, stripeInvoiceId, isRecurring, successUrl } =
			await req.json();

		if (!invoiceId || !stripeInvoiceId) {
			return new Response(
				JSON.stringify({
					error:
						"Missing required parameters: invoiceId and stripeInvoiceId are required",
				}),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Fetch the invoice from the database to get details
		const { data: invoice, error: invoiceError } = await supabaseClient
			.from("invoices")
			.select(
				`*, studio:studios!invoices_studio_id_fkey (*), parent:users (name, email)`
			)
			.eq("id", invoiceId)
			.single();

		if (invoiceError || !invoice) {
			return new Response(
				JSON.stringify({
					error: "Invoice not found",
					details: invoiceError?.message,
				}),
				{ status: 404, headers: corsHeaders }
			);
		}

		// Ensure we have a connected account ID for the studio
		if (!invoice.studio?.stripe_connect_id) {
			return new Response(
				JSON.stringify({
					error: "Studio does not have a connected Stripe account",
				}),
				{ status: 400, headers: corsHeaders }
			);
		}

		// Calculate final amount (with discounts)
		let finalAmount = invoice.total;
		if (invoice.discount_value) {
			if (invoice.discount_type === "percentage") {
				finalAmount = invoice.total * (1 - invoice.discount_value / 100);
			} else if (invoice.discount_type === "fixed") {
				finalAmount = invoice.total - invoice.discount_value;
			}
		}

		// Convert to cents for Stripe
		const amountInCents = Math.round(finalAmount * 100);

		// Instead of creating a new checkout session, we'll get the hosted invoice URL
		try {
			// First, retrieve the invoice from Stripe
			const stripeInvoice = await stripe.invoices.retrieve(stripeInvoiceId, {
				stripeAccount: invoice.studio.stripe_connect_id,
			});

			let hostedInvoiceUrl;

			// If the invoice doesn't have a hosted URL yet, finalize it to get one
			if (!stripeInvoice.hosted_invoice_url) {
				console.log("Invoice doesn't have a hosted URL, finalizing it...");

				// Make sure the invoice is finalized (if not already)
				if (stripeInvoice.status === "draft") {
					const finalizedInvoice = await stripe.invoices.finalizeInvoice(
						stripeInvoiceId,
						{
							auto_advance: false, // Don't automatically charge the customer
						},
						{
							stripeAccount: invoice.studio.stripe_connect_id,
						}
					);

					console.log(
						"Finalized invoice:",
						finalizedInvoice.id,
						"with status:",
						finalizedInvoice.status
					);
					hostedInvoiceUrl = finalizedInvoice.hosted_invoice_url;
				} else {
					hostedInvoiceUrl = stripeInvoice.hosted_invoice_url;
				}
			} else {
				hostedInvoiceUrl = stripeInvoice.hosted_invoice_url;
			}

			// If we still don't have a hosted URL, create a payment link for the invoice
			if (!hostedInvoiceUrl) {
				console.log("Creating a payment link for the invoice...");

				// Create a payment link for this invoice
				const paymentLink = await stripe.paymentLinks.create(
					{
						line_items: [
							{
								price_data: {
									currency: invoice.studio.currency,
									product_data: {
										name: `Invoice #${stripeInvoiceId.slice(-6)}`,
										description: isRecurring
											? `Recurring payment for ${invoice.recurring_interval.toLowerCase()}`
											: "One-time payment",
									},
									unit_amount: amountInCents,
									tax_behavior: "exclusive",
								},
								quantity: 1,
							},
						],
						metadata: {
							invoice_id: invoiceId,
							stripe_invoice_id: stripeInvoiceId,
							is_recurring: isRecurring ? "true" : "false",
							original_amount: invoice.total.toString(),
							final_amount: finalAmount.toString(),
							discount_type: invoice.discount_type || "",
							discount_value: invoice.discount_value?.toString() || "0",
							studio_connect_id: invoice.studio.stripe_connect_id,
						},
						after_completion: {
							type: "redirect",
							redirect: {
								url: successUrl,
							},
						},
					},
					{
						stripeAccount: invoice.studio.stripe_connect_id,
					}
				);

				hostedInvoiceUrl = paymentLink.url;
				console.log("Created payment link:", paymentLink.url);
			}

			// Return the invoice URL
			return new Response(
				JSON.stringify({
					url: hostedInvoiceUrl,
				}),
				{
					status: 200,
					headers: {
						...corsHeaders,
						"Content-Type": "application/json",
					},
				}
			);
		} catch (error) {
			console.error("Error creating invoice payment URL:", error);
			throw error;
		}
	} catch (error) {
		console.error("Error in create-checkout-session:", error);

		return new Response(
			JSON.stringify({
				error: "Failed to create checkout session",
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
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-checkout-session' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
