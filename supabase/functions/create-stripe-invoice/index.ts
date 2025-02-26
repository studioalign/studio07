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
			isRecurring,
			recurringInterval,
			recurringEndDate,
			discountType,
			discountValue,
		} = await req.json();

		if (!invoiceId) {
			console.error("No invoice ID provided");
			return new Response(JSON.stringify({ error: "Invoice ID is required" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		console.log("Fetching invoice:", invoiceId);

		// Get the invoice details with parent and items
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
        ),
        items:invoice_items (
          id,
          student_id,
          description,
          quantity,
          unit_price,
          subtotal,
          total,
          type,
          plan_enrollment_id,
          student:students!invoice_items_student_id_fkey (
            name
          )
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

		try {
			// Create a Stripe invoice
			const stripeInvoice = await stripe.invoices.create({
				customer: customerId,
				collection_method: "send_invoice", // Don't auto-charge
				days_until_due: 30, // Default due in 30 days
				metadata: {
					invoice_id: invoice.id,
				},
			});

			// Add invoice items
			for (const item of invoice.items) {
				await stripe.invoiceItems.create({
					customer: customerId,
					invoice: stripeInvoice.id,
					amount: Math.round(item.total * 100),
					currency: "gbp", // Make sure to use the correct currency for your app
					description: `${item.description} - ${item.student.name}`,
				});
			}

			// Apply discount if any
			if (discountValue > 0) {
				if (discountType === "percentage") {
					const coupon = await createOrRetrievePercentageCoupon(discountValue);
					await stripe.invoices.update(stripeInvoice.id, {
						discounts: [
							{
								coupon: coupon.id,
							},
						],
					});
				} else if (discountType === "fixed") {
					const coupon = await createOrRetrieveFixedAmountCoupon(discountValue);
					await stripe.invoices.update(stripeInvoice.id, {
						discounts: [
							{
								coupon: coupon.id,
							},
						],
					});
				}
			}

			// Set up subscription if recurring
			let subscriptionId = null;
			if (isRecurring) {
				// Create products and prices for recurring
				const subscriptionItems = await Promise.all(
					invoice.items.map(async (item) => {
						const product = await stripe.products.create({
							name: `${item.description} - ${item.student.name}`,
							metadata: {
								invoice_item_id: item.id,
							},
						});

						const price = await stripe.prices.create({
							product: product.id,
							unit_amount: Math.round(item.unit_price * 100),
							currency: "gbp",
							recurring: {
								interval: recurringInterval.toLowerCase(),
							},
						});

						return {
							price: price.id,
							quantity: item.quantity,
						};
					})
				);

				// Create subscription - but don't activate it yet
				// It will be activated when the initial invoice is paid
				const subscription = await stripe.subscriptions.create({
					customer: customerId,
					items: subscriptionItems,
					metadata: {
						invoice_id: invoice.id,
					},
					cancel_at: recurringEndDate
						? Math.floor(new Date(recurringEndDate).getTime() / 1000)
						: undefined,
					collection_method: "send_invoice", // don't auto-charge
					days_until_due: 30,
				});

				subscriptionId = subscription.id;

				// Store subscription details
				await supabaseClient.from("subscriptions").insert({
					invoice_id: invoice.id,
					stripe_subscription_id: subscription.id,
					status: "pending",
					interval: recurringInterval,
					amount: invoice.total - (invoice.discount_value || 0),
					end_date: recurringEndDate,
				});
			}

			// Finalize the invoice (but don't send it yet)
			const finalizedInvoice = await stripe.invoices.finalizeInvoice(
				stripeInvoice.id
			);

			// Save stripe invoice ID and PDF URL
			const updateData: {
				stripe_invoice_id: string;
				pdf_url: string | null;
				stripe_subscription_id?: string;
			} = {
				stripe_invoice_id: stripeInvoice.id,
				pdf_url: finalizedInvoice.invoice_pdf,
			};

			if (subscriptionId) {
				updateData.stripe_subscription_id = subscriptionId;
			}

			// Update the invoice record with Stripe details
			await supabaseClient
				.from("invoices")
				.update(updateData)
				.eq("id", invoiceId);

			// Return success with Stripe invoice details
			return new Response(
				JSON.stringify({
					stripe_invoice_id: stripeInvoice.id,
					pdf_url: finalizedInvoice.invoice_pdf,
					subscription_id: subscriptionId,
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		} catch (error) {
			console.error("Stripe error:", error);
			return new Response(
				JSON.stringify({
					error: error.message || "Failed to create Stripe invoice",
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

// Helper function to create or retrieve a percentage coupon
async function createOrRetrievePercentageCoupon(percentOff: number) {
	const couponId = `percent-${percentOff}`;

	try {
		// Try to retrieve existing coupon
		return await stripe.coupons.retrieve(couponId);
	} catch (_) {
		// Create new coupon if it doesn't exist
		return await stripe.coupons.create({
			id: couponId,
			percent_off: percentOff,
			duration: "once",
		});
	}
}

// Helper function to create or retrieve a fixed amount coupon
async function createOrRetrieveFixedAmountCoupon(amountOff: number) {
	const couponId = `fixed-${Math.round(amountOff * 100)}`;

	try {
		// Try to retrieve existing coupon
		return await stripe.coupons.retrieve(couponId);
	} catch (_) {
		// Create new coupon if it doesn't exist
		return await stripe.coupons.create({
			id: couponId,
			amount_off: Math.round(amountOff * 100),
			currency: "gbp",
			duration: "once",
		});
	}
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-stripe-invoice' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"invoiceId":"your-invoice-id"}'

*/
