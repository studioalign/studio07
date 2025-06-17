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

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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

		if (!studioConnectAccountId) {
			console.error("Missing Stripe Connect account ID for studio");
			return new Response(
				JSON.stringify({
					error: "Missing Stripe Connect account ID for studio",
				}),
				{ status: 400, headers: corsHeaders }
			);
		}

		console.log("Studio Connect Account ID:", studioConnectAccountId);
		const options = { stripeAccount: studioConnectAccountId };

		let connectedCustomerId = null;

		// First check if customer already exists in connected account
		const { data: parentData, error: parentError } = await supabaseClient
			.from("users")
			.select("email, name")
			.eq("id", invoiceData.parent_id)
			.single();

		if (parentError || !parentData) {
			return new Response(JSON.stringify({ error: "Parent data not found" }), {
				status: 400,
				headers: corsHeaders,
			});
		}

		console.log(`Parent email: ${parentData.email}, name: ${parentData.name}`);

		try {
			// First check if customer already exists in connected account
			const { data: connectedCustomer, error: connectedCustomerError } =
				await supabaseClient
					.from("connected_customers")
					.select("stripe_connected_customer_id")
					.eq("parent_id", invoiceData.parent_id)
					.eq("studio_id", invoiceData.studio_id)
					.single();

			console.log(
				"Connected customer DB lookup result:",
				connectedCustomerError ? "Error" : "Found",
				connectedCustomer?.stripe_connected_customer_id || "none"
			);

			// Try to find customer by email in connected account as fallback
			let customerLookupByEmail = null;
			try {
				// Search for customer by email in connected account
				const customersList = await stripe.customers.list(
					{
						email: parentData.email,
						limit: 1,
					},
					options
				);

				if (
					customersList &&
					customersList.data &&
					customersList.data.length > 0
				) {
					customerLookupByEmail = customersList.data[0];
					console.log(
						"Found customer by email in connected account:",
						customerLookupByEmail.id
					);
				}
			} catch (emailLookupError) {
				console.error("Error looking up customer by email:", emailLookupError);
			}

			if (connectedCustomerError || !connectedCustomer) {
				// No record in our database, but check if we found by email
				if (customerLookupByEmail) {
					// Save the connected customer ID we found by email
					await supabaseClient.from("connected_customers").insert({
						parent_id: invoiceData.parent_id,
						studio_id: invoiceData.studio_id,
						stripe_connected_customer_id: customerLookupByEmail.id,
					});

					connectedCustomerId = customerLookupByEmail.id;
					console.log(
						"Using customer found by email lookup:",
						connectedCustomerId
					);
				} else {
					// Create a new customer in connected account
					console.log("Creating new customer in connected account");
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
					await supabaseClient.from("connected_customers").insert({
						parent_id: invoiceData.parent_id,
						studio_id: invoiceData.studio_id,
						stripe_connected_customer_id: connectedStripeCustomer.id,
					});

					connectedCustomerId = connectedStripeCustomer.id;
					console.log(
						"Created new customer in connected account:",
						connectedCustomerId
					);
				}
			} else {
				// We have a customer ID in our database, verify it exists in Stripe
				const existingCustomerId =
					connectedCustomer.stripe_connected_customer_id;
				console.log("Verifying customer exists in Stripe:", existingCustomerId);

				try {
					// Try to retrieve the customer from Stripe
					const existingCustomer = await stripe.customers.retrieve(
						existingCustomerId,
						options
					);

					if (existingCustomer && !existingCustomer.deleted) {
						// Customer exists and is not deleted
						connectedCustomerId = existingCustomerId;
						console.log(
							"Verified customer exists in Stripe:",
							connectedCustomerId
						);
					} else {
						// Customer is deleted, use the one from email lookup or create new
						if (customerLookupByEmail) {
							connectedCustomerId = customerLookupByEmail.id;

							// Update our database with the correct ID
							await supabaseClient
								.from("connected_customers")
								.update({
									stripe_connected_customer_id: connectedCustomerId,
								})
								.eq("parent_id", invoiceData.parent_id)
								.eq("studio_id", invoiceData.studio_id);

							console.log(
								"Updated to use customer found by email:",
								connectedCustomerId
							);
						} else {
							// Create a new customer
							console.log("Creating new customer as existing one is deleted");
							const newCustomer = await stripe.customers.create(
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

							// Update our database with the new ID
							await supabaseClient
								.from("connected_customers")
								.update({
									stripe_connected_customer_id: newCustomer.id,
								})
								.eq("parent_id", invoiceData.parent_id)
								.eq("studio_id", invoiceData.studio_id);

							connectedCustomerId = newCustomer.id;
							console.log("Created new customer:", connectedCustomerId);
						}
					}
				} catch (stripeError) {
					// Customer doesn't exist in Stripe
					console.error("Error retrieving customer from Stripe:", stripeError);

					// Use customer from email lookup or create new
					if (customerLookupByEmail) {
						connectedCustomerId = customerLookupByEmail.id;

						// Update our database with the correct ID
						await supabaseClient
							.from("connected_customers")
							.update({
								stripe_connected_customer_id: connectedCustomerId,
							})
							.eq("parent_id", invoiceData.parent_id)
							.eq("studio_id", invoiceData.studio_id);

						console.log(
							"Using customer found by email after retrieval error:",
							connectedCustomerId
						);
					} else {
						// Create a new customer
						console.log("Creating new customer after retrieval error");
						const newCustomer = await stripe.customers.create(
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

						// Update our database with the new ID
						await supabaseClient
							.from("connected_customers")
							.update({
								stripe_connected_customer_id: newCustomer.id,
							})
							.eq("parent_id", invoiceData.parent_id)
							.eq("studio_id", invoiceData.studio_id);

						connectedCustomerId = newCustomer.id;
						console.log(
							"Created new customer after retrieval error:",
							connectedCustomerId
						);
					}
				}
			}

			console.log("Final connected customer ID:", connectedCustomerId);
		} catch (error) {
			console.error("Error handling connected customer:", error);
			return new Response(
				JSON.stringify({
					error:
						"Failed to handle customer in connected account: " + error.message,
				}),
				{ status: 400, headers: corsHeaders }
			);
		}

		if (!connectedCustomerId) {
			return new Response(
				JSON.stringify({
					error: "Could not determine customer ID for connected account",
				}),
				{ status: 400, headers: corsHeaders }
			);
		}

		try {
			// Skip payment method sharing and use direct payment on the invoice
			console.log(
				"Paying invoice:",
				stripeInvoiceId,
				"using direct payment on invoice"
			);

			// Try to pay the invoice directly with the source payment method ID
			// When using stripe.invoices.pay, it will authorize using the original payment method
			const paidInvoice = await stripe.invoices.pay(
				stripeInvoiceId,
				{
					expand: ["payment_intent"],
				},
				options
			);

			console.log("Invoice paid successfully:", paidInvoice.id);

			// Update the invoice status in our database
			await supabaseClient
				.from("invoices")
				.update({
					paid_at: new Date().toISOString(),
					status: "paid",
				})
				.eq("id", invoiceId);

			// Save payment record
			const { error: paymentError } = await supabaseClient
				.from("payments")
				.insert({
					invoice_id: invoiceId,
					amount: paidInvoice.amount_paid / 100,
					original_amount: paidInvoice.amount_paid / 100, // Corrected: use paid amount
					payment_method: "card",
					status: "completed",
					stripe_payment_intent_id: paidInvoice.payment_intent as string,
					payment_date: new Date().toISOString(),
					destination_account_id: studioConnectAccountId,
				});

			if (paymentError) {
				console.error("Error saving payment record:", paymentError);
				// Don't fail the request if only the payment record save failed
			}

			return new Response(
				JSON.stringify({
					success: true,
					invoice_id: paidInvoice.id,
					payment_intent_id: paidInvoice.payment_intent,
					uses_connect_account: true,
				}),
				{ headers: corsHeaders }
			);
		} catch (paymentError) {
			// If direct payment fails, try a different approach with default payment method
			console.error(
				"Direct payment failed, trying with default method:",
				paymentError
			);

			try {
				// Ensure the customer has a default payment method in the connected account
				// This approach doesn't try to share the payment method but assumes the customer already has a payment method
				// or will use the one specified in Stripe when creating the invoice

				// Update the invoice to make it explicitly use this customer
				await stripe.invoices.update(
					stripeInvoiceId,
					{ customer: connectedCustomerId },
					options
				);

				// Try to pay the invoice again
				const paidInvoice = await stripe.invoices.pay(
					stripeInvoiceId,
					{
						expand: ["payment_intent"],
					},
					options
				);

				console.log(
					"Invoice paid successfully with fallback method:",
					paidInvoice.id
				);

				// Update the invoice status in our database
				await supabaseClient
					.from("invoices")
					.update({
						paid_at: new Date().toISOString(),
						status: "paid",
					})
					.eq("id", invoiceId);

				// Save payment record
				const { error: paymentError } = await supabaseClient
					.from("payments")
					.insert({
						invoice_id: invoiceId,
						amount: paidInvoice.amount_paid / 100,
						original_amount: paidInvoice.total / 100,
						payment_method: "card",
						status: "completed",
						stripe_payment_intent_id: paidInvoice.payment_intent as string,
						payment_date: new Date().toISOString(),
						destination_account_id: studioConnectAccountId,
					});

				if (paymentError) {
					console.error("Error saving payment record:", paymentError);
				}

				return new Response(
					JSON.stringify({
						success: true,
						invoice_id: paidInvoice.id,
						payment_intent_id: paidInvoice.payment_intent,
						uses_connect_account: true,
					}),
					{ headers: corsHeaders }
				);
			} catch (fallbackError) {
				console.error("Both payment methods failed:", fallbackError);
				return new Response(
					JSON.stringify({
						error:
							"Failed to process payment after multiple attempts. Original error: " +
							paymentError.message +
							". Fallback error: " +
							fallbackError.message,
					}),
					{ status: 400, headers: corsHeaders }
				);
			}
		}
	} catch (error) {
		console.error("Stripe error:", error);
		return new Response(
			JSON.stringify({ error: error.message || "Failed to process payment" }),
			{ status: 400, headers: corsHeaders }
		);
	}
});
