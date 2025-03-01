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
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_ANON_KEY") ?? ""
		);

		const authHeader = req.headers.get("Authorization");
		if (!authHeader) {
			return new Response(
				JSON.stringify({ error: "No authorization header" }),
				{ status: 401, headers: corsHeaders }
			);
		}

		const jwt = authHeader.replace("Bearer ", "");
		const {
			data: { user },
			error: userError,
		} = await supabaseClient.auth.getUser(jwt);

		if (userError || !user) {
			return new Response(JSON.stringify({ error: "Authentication failed" }), {
				status: 401,
				headers: corsHeaders,
			});
		}

		const { invoiceId, stripeInvoiceId, paymentMethodId } = await req.json();
		if (!invoiceId || !stripeInvoiceId || !paymentMethodId) {
			return new Response(
				JSON.stringify({
					error:
						"Invoice ID, Stripe Invoice ID, and Payment Method ID are required",
				}),
				{ status: 400, headers: corsHeaders }
			);
		}

		console.log(
			`Processing payment for invoice ${invoiceId} with Stripe invoice ${stripeInvoiceId}`
		);

		const { data: invoiceData, error: invoiceError } = await supabaseClient
			.from("invoices")
			.select(
				"stripe_invoice_id, studio:studios!invoices_studio_id_fkey (stripe_connect_id), parent_id, studio_id"
			)
			.eq("id", invoiceId)
			.single();

		if (invoiceError || !invoiceData) {
			return new Response(
				JSON.stringify({ error: "Invoice not found in Supabase" }),
				{ status: 404, headers: corsHeaders }
			);
		}

		const studioConnectAccountId =
			invoiceData.studio?.stripe_connect_id || null;
		const useConnectAccount = studioConnectAccountId !== null;
		const options = useConnectAccount
			? { stripeAccount: studioConnectAccountId }
			: {};

		let connectedCustomerId = null;

		if (useConnectAccount) {
			try {
				// First check if customer already exists in connected account
				const { data: connectedCustomer, error: connectedCustomerError } =
					await supabaseClient
						.from("connected_customers")
						.select("stripe_connected_customer_id")
						.eq("parent_id", invoiceData.parent_id)
						.eq("studio_id", invoiceData.studio_id)
						.single();

				if (connectedCustomerError || !connectedCustomer) {
					// If no connected customer exists, create one
					const { data: parentData, error: parentError } = await supabaseClient
						.from("users")
						.select("email, name")
						.eq("id", invoiceData.parent_id)
						.single();

					if (parentError || !parentData) {
						throw new Error("Parent data not found");
					}

					// Create customer in connected account
					const connectedStripeCustomer = await stripe.customers.create(
						{
							email: parentData.email,
							name: parentData.name,
							metadata: {
								parent_id: invoiceData.parent_id,
								studio_id: invoiceData.studio_id,
							},
						},
						options
					);

					// Save the connected customer ID
					const { error: saveError } = await supabaseClient
						.from("connected_customers")
						.insert({
							parent_id: invoiceData.parent_id,
							studio_id: invoiceData.studio_id,
							stripe_connected_customer_id: connectedStripeCustomer.id,
						});

					if (saveError) {
						throw new Error("Failed to save connected customer");
					}

					connectedCustomerId = connectedStripeCustomer.id;
				} else {
					connectedCustomerId = connectedCustomer.stripe_connected_customer_id;
				}

				console.log("Connected customer ID:", connectedCustomerId);
			} catch (error) {
				console.error("Error handling connected customer:", error);
				throw error;
			}
		}

		if (!connectedCustomerId) {
			return new Response(
				JSON.stringify({
					error: "No valid customer found in the connected account.",
				}),
				{
					status: 400,
					headers: corsHeaders,
				}
			);
		}

		// For connected accounts, we need to share the payment method
		let connectedPaymentMethodId = paymentMethodId;
		if (useConnectAccount) {
			try {
				// Create a payment method on the connected account
				const paymentMethodSharing = await stripe.paymentMethods.create(
					{
						payment_method: paymentMethodId,
						customer: connectedCustomerId,
					},
					options
				);

				connectedPaymentMethodId = paymentMethodSharing.id;
				console.log(
					"Created shared payment method ID:",
					connectedPaymentMethodId
				);
			} catch (error) {
				console.error(
					"Error sharing payment method with connected account:",
					error
				);
				throw new Error(
					"Failed to share payment method with connected account: " +
						error.message
				);
			}
		}

		// Use the connected payment method ID for connected accounts
		await stripe.customers.update(
			connectedCustomerId,
			{
				invoice_settings: { default_payment_method: connectedPaymentMethodId },
			},
			options
		);

		console.log("Paying invoice");
		const paidInvoice = await stripe.invoices.pay(
			stripeInvoiceId,
			{ payment_method: connectedPaymentMethodId },
			options
		);

		console.log("Invoice paid successfully", paidInvoice);

		await supabaseClient
			.from("invoices")
			.update({
				paid_at: new Date().toISOString(),
			})
			.eq("id", invoiceId);

		const { error: paymentError } = await supabaseClient
			.from("payments")
			.insert({
				invoice_id: invoiceId,
				amount: paidInvoice.amount_paid / 100,
				original_amount: paidInvoice.total / 100,
				payment_method: "card",
				status: "completed",
				transaction_id: paidInvoice.payment_intent as string,
				payment_date: new Date().toISOString(),
				destination_account_id: useConnectAccount
					? studioConnectAccountId
					: null,
			});

		if (paymentError) {
			throw new Error(
				"Payment processed but failed to save payment record: " +
					paymentError.message
			);
		}

		const { error: updateError } = await supabaseClient
			.from("invoices")
			.update({ status: "paid" })
			.eq("id", invoiceId);

		if (updateError) {
			console.error("Error updating invoice status in Supabase:", updateError);
		}

		return new Response(
			JSON.stringify({
				success: true,
				invoice_id: paidInvoice.id,
				payment_intent_id: paidInvoice.payment_intent,
				uses_connect_account: useConnectAccount,
			}),
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error("Stripe error:", error);
		return new Response(
			JSON.stringify({ error: error.message || "Failed to process payment" }),
			{ status: 400, headers: corsHeaders }
		);
	}
});
