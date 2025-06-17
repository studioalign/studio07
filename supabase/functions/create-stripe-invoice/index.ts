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

		const { invoiceId } = await req.json();
		if (!invoiceId) {
			return new Response(JSON.stringify({ error: "Invoice ID is required" }), {
				status: 400,
				headers: corsHeaders,
			});
		}

		const { data: invoice, error: invoiceError } = await supabaseClient
			.from("invoices")
			.select(
				"*, parent:users!invoices_parent_id_fkey (id, email, name, stripe_customer_id), items:invoice_items (*)"
			)
			.eq("id", invoiceId)
			.single();

		if (invoiceError || !invoice) {
			return new Response(JSON.stringify({ error: "Invoice not found" }), {
				status: 404,
				headers: corsHeaders,
			});
		}

		const { data: studioData } = await supabaseClient
			.from("studios")
			.select(
				"stripe_connect_id, stripe_connect_enabled, stripe_connect_onboarding_complete, currency"
			)
			.eq("id", invoice.studio_id)
			.single();

		const studioConnectAccountId = studioData?.stripe_connect_id || null;
		const useConnectAccount = studioConnectAccountId !== null;
		let connectedCustomerId = null;

		if (useConnectAccount) {
			console.log("Using Stripe Connect Account:", studioConnectAccountId);

			try {
				const { data: connectedCustomer, error: connectedCustomerError } =
					await supabaseClient
						.from("connected_customers")
						.select("stripe_connected_customer_id")
						.eq("parent_id", invoice.parent.id)
						.eq("studio_id", invoice.studio_id)
						.single();

				if (connectedCustomerError) {
					console.error(
						"Error fetching connected customer:",
						connectedCustomerError
					);
				} else if (connectedCustomer) {
					connectedCustomerId = connectedCustomer.stripe_connected_customer_id;
					console.log(
						"Customer found in connected account:",
						connectedCustomerId
					);
				}
			} catch (error) {
				console.error("Error checking customer in connected account:", error);
			}

			if (!connectedCustomerId) {
				console.log(
					"Creating customer in connected account:",
					studioConnectAccountId
				);

				const connectedCustomer = await stripe.customers.create(
					{
						email: invoice.parent.email,
						name: invoice.parent.name,
						metadata: {
							platform_customer_id: invoice.parent.stripe_customer_id,
						},
					},
					{ stripeAccount: studioConnectAccountId }
				);

				connectedCustomerId = connectedCustomer.id;
				console.log(
					"Created new customer in connected account:",
					connectedCustomerId
				);

				await supabaseClient.from("connected_customers").insert([
					{
						parent_id: invoice.parent.id,
						studio_id: invoice.studio_id,
						stripe_connected_customer_id: connectedCustomerId,
					},
				]);
			}
		}

		const invoiceCreateParams = {
			customer: useConnectAccount
				? connectedCustomerId
				: invoice.parent.stripe_customer_id,
			auto_advance: true,
			collection_method: "send_invoice",
			days_until_due: calculateDaysUntilDue(invoice.due_date),
			currency: studioData?.currency,
			metadata: {
				internal_invoice_id: invoice.id,
				studio_id: invoice.studio_id,
			},
		};

		// Helper function to calculate days until due based on invoice.due_date
		function calculateDaysUntilDue(dueDate: string): number {
			if (!dueDate) return 30; // Fallback to 30 days if no due date is provided

			const currentDate = new Date();
			const dueDateObj = new Date(dueDate);

			// Calculate the difference in milliseconds
			const diffTime = dueDateObj.getTime() - currentDate.getTime();

			// Convert milliseconds to days and round up to ensure we don't set it to less than 1 day
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

			// Ensure at least 1 day until due
			return Math.max(1, diffDays);
		}

		try {
			const stripeInvoice = useConnectAccount
				? await stripe.invoices.create(invoiceCreateParams, {
						stripeAccount: studioConnectAccountId,
				  })
				: await stripe.invoices.create(invoiceCreateParams);

			console.log("Invoice Created Successfully:", stripeInvoice.id);

			for (const item of invoice.items) {
				await stripe.invoiceItems.create(
					{
						customer: connectedCustomerId,
						invoice: stripeInvoice.id,
						unit_amount: Math.round(item.unit_price * 100), // Convert to pence
						currency: studioData?.currency,
						description: item.description,
						quantity: item.quantity,
						metadata: {
							student_id: item.student_id,
							internal_item_id: item.id,
						},
					},
					useConnectAccount
						? { stripeAccount: studioConnectAccountId }
						: undefined
				);
			}

			console.log("Invoice Items Added Successfully");

			// Apply discount if provided
			if (invoice.discount_type && invoice.discount_value) {
				try {
					let coupon;
					const options = useConnectAccount
						? { stripeAccount: studioConnectAccountId }
						: undefined;

					if (invoice.discount_type === "percentage") {
						// Create or retrieve percentage coupon
						const couponId = `percent-${Math.round(invoice.discount_value)}`;
						try {
							coupon = await stripe.coupons.retrieve(couponId, options);
						} catch {
							coupon = await stripe.coupons.create(
								{
									id: couponId,
									percent_off: invoice.discount_value,
									duration: "once",
								},
								options
							);
						}
					} else {
						// Create or retrieve fixed amount coupon
						const couponId = `fixed-${Math.round(
							invoice.discount_value * 100
						)}`;
						try {
							coupon = await stripe.coupons.retrieve(couponId, options);
						} catch {
							coupon = await stripe.coupons.create(
								{
									id: couponId,
									amount_off: Math.round(invoice.discount_value * 100),
									currency: studioData?.currency,
									duration: "once",
								},
								options
							);
						}
					}

					// Apply the coupon to the invoice
					await stripe.invoices.update(
						stripeInvoice.id,
						{ discounts: [{ coupon: coupon.id }] },
						options
					);

					console.log(
						`Applied ${invoice.discount_type} discount of ${invoice.discount_value} to invoice`
					);
				} catch (discountError) {
					console.error("Error applying discount:", discountError);
					// Continue with invoice creation even if discount fails
				}
			}

			const finalizedInvoice = await stripe.invoices.finalizeInvoice(
				stripeInvoice.id,
				useConnectAccount
					? { stripeAccount: studioConnectAccountId }
					: undefined
			);

			console.log("Finalized Invoice:", finalizedInvoice.id);

			const { error: updateError } = await supabaseClient
				.from("invoices")
				.update({
					stripe_invoice_id: finalizedInvoice.id,
					pdf_url: finalizedInvoice.invoice_pdf, // Stripe provides this URL
				})
				.eq("id", invoice.id);

			if (updateError) {
				console.error("Error updating invoice in Supabase:", updateError);
			} else {
				console.log("Invoice updated in Supabase successfully");
			}

			return new Response(
				JSON.stringify({ success: true, invoice_id: finalizedInvoice.id }),
				{ headers: corsHeaders }
			);
		} catch (error) {
			console.error("Error creating invoice:", error);
			return new Response(
				JSON.stringify({
					error: "Failed to create Stripe invoice",
					details: error.message,
				}),
				{ status: 500, headers: corsHeaders }
			);
		}
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: error.message || "An unexpected error occurred",
			}),
			{ status: 500, headers: corsHeaders }
		);
	}
});
