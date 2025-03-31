import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
			apiVersion: "2023-10-16",
			httpClient: Stripe.createFetchHttpClient(),
		});

		// Create Supabase client
		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL") ?? "",
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
		);

		const { paymentId, amount, reason, studioId } = await req.json();

		// Basic validation
		if (!paymentId || !amount || !studioId) {
			return new Response(
				JSON.stringify({
					success: false,
					error: "Missing required fields: paymentId, amount, or studioId",
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		// Get the studio's connected account ID from the database
		const { data: studioData, error: studioError } = await supabaseClient
			.from("studios")
			.select("stripe_connect_id")
			.eq("id", studioId)
			.single();

		if (studioError || !studioData?.stripe_connect_id) {
			return new Response(
				JSON.stringify({
					success: false,
					error: "Could not find studio's Stripe account",
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		const connectedAccountId = studioData.stripe_connect_id;

		// Get the payment intent using the connected account ID
		const paymentIntent = await stripe.paymentIntents.retrieve(paymentId, {
			stripeAccount: connectedAccountId,
		});

		const refund = await stripe.refunds.create(
			{
				payment_intent: paymentId,
				amount,
				reason: reason || "requested_by_customer",
				metadata: {
					reason: reason || "Customer requested refund",
					studio_id: studioId,
				},
			},
			{
				stripeAccount: connectedAccountId, // Process refund on behalf of the connected account
			}
		);

		if (refund.status === "succeeded") {
			return new Response(
				JSON.stringify({
					success: true,
					refundId: refund.id,
				}),
				{
					status: 200,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		} else {
			return new Response(
				JSON.stringify({
					success: false,
					error: `Refund failed with status: ${refund.status}`,
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}
	} catch (error) {
		console.error("Error processing refund:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error:
					error instanceof Error
						? error.message
						: "An unexpected error occurred",
			}),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			}
		);
	}
});
