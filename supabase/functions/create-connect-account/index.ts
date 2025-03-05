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

		// Verify that the user is a studio owner
		const { data: userData, error: roleError } = await supabaseClient
			.from("users")
			.select("role, studio_id")
			.eq("id", user.id)
			.single();

		if (roleError || !userData) {
			console.error("Error fetching user role:", roleError);
			return new Response(
				JSON.stringify({ error: "Failed to verify user role" }),
				{
					status: 401,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		if (userData.role !== "owner" || !userData.studio_id) {
			return new Response(
				JSON.stringify({
					error: "Only studio owners can create Connect accounts",
				}),
				{
					status: 403,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		// Get the studio information
		const { data: studioData, error: studioError } = await supabaseClient
			.from("studios")
			.select("*")
			.eq("id", userData.studio_id)
			.single();

		if (studioError || !studioData) {
			console.error("Error fetching studio:", studioError);
			return new Response(
				JSON.stringify({ error: "Failed to fetch studio information" }),
				{
					status: 404,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		// Get the request parameters
		const { action } = await req.json();

		if (action === "create_account") {
			// Check if the studio already has a Stripe Connect account
			if (studioData.stripe_connect_id) {
				// If it exists, get the account details
				const account = await stripe.accounts.retrieve(
					studioData.stripe_connect_id
				);

				// Create an account link for onboarding
				const accountLink = await stripe.accountLinks.create({
					account: studioData.stripe_connect_id,
					refresh_url: `${Deno.env.get(
						"WEBSITE_URL"
					)}/dashboard/payment-settings?type=stripe_connect&refresh=true`,
					return_url: `${Deno.env.get(
						"WEBSITE_URL"
					)}/dashboard/payment-settings?type=stripe_connect&success=true`,
					type: "account_onboarding",
				});

				return new Response(
					JSON.stringify({
						success: true,
						account: {
							id: account.id,
							charges_enabled: account.charges_enabled,
							payouts_enabled: account.payouts_enabled,
							onboarding_url: accountLink.url,
						},
					}),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					}
				);
			}

			// Create a new Connected Account
			try {
				const account = await stripe.accounts.create({
					type: "express",
					country: studioData.country || "GB",
					email: studioData.email,
					business_type: "company",
					company: {
						name: studioData.name,
						address: {
							line1: studioData.address || "",
							city: "",
							postal_code: "",
							country: studioData.country || "GB",
						},
					},
					capabilities: {
						card_payments: { requested: true },
						transfers: { requested: true },
					},
				});

				// Update the studio with the new Stripe Connect ID
				const { error: updateError } = await supabaseClient
					.from("studios")
					.update({
						stripe_connect_id: account.id,
						stripe_connect_enabled: false,
						stripe_connect_onboarding_complete: false,
					})
					.eq("id", studioData.id);

				if (updateError) {
					console.error("Error updating studio:", updateError);
					return new Response(
						JSON.stringify({ error: "Failed to update studio information" }),
						{
							status: 500,
							headers: { ...corsHeaders, "Content-Type": "application/json" },
						}
					);
				}

				// Create an account link for onboarding
				const accountLink = await stripe.accountLinks.create({
					account: account.id,
					refresh_url: `${Deno.env.get(
						"WEBSITE_URL"
					)}/dashboard/payment-settings?type=stripe_connect&refresh=true`,
					return_url: `${Deno.env.get(
						"WEBSITE_URL"
					)}/dashboard/payment-settings?type=stripe_connect&success=true`,
					type: "account_onboarding",
				});

				return new Response(
					JSON.stringify({
						success: true,
						account: {
							id: account.id,
							charges_enabled: account.charges_enabled,
							payouts_enabled: account.payouts_enabled,
							onboarding_url: accountLink.url,
						},
					}),
					{
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					}
				);
			} catch (err) {
				if (err.message?.includes("platform-profile")) {
					console.error("Stripe Connect platform profile not configured:", err);
					return new Response(
						JSON.stringify({
							error:
								"Stripe Connect platform profile needs to be configured. Please contact support.",
							details:
								"The platform administrator needs to configure loss liability settings in the Stripe Dashboard.",
						}),
						{
							status: 400,
							headers: { ...corsHeaders, "Content-Type": "application/json" },
						}
					);
				}
				throw err;
			}
		} else if (action === "check_status") {
			// If the studio doesn't have a Connect account yet, return an error
			if (!studioData.stripe_connect_id) {
				return new Response(
					JSON.stringify({ error: "Studio has no Stripe Connect account" }),
					{
						status: 404,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					}
				);
			}

			// Retrieve the Connect account to check its status
			const account = await stripe.accounts.retrieve(
				studioData.stripe_connect_id
			);

			// Update the studio with the latest account status
			const { error: updateError } = await supabaseClient
				.from("studios")
				.update({
					stripe_connect_enabled:
						account.charges_enabled && account.payouts_enabled,
					stripe_connect_onboarding_complete:
						account.details_submitted &&
						account.charges_enabled &&
						account.payouts_enabled,
				})
				.eq("id", studioData.id);

			if (updateError) {
				console.error("Error updating studio:", updateError);
			}

			// If required, get external account information (bank account)
			let bankAccount = null;
			if (
				account.external_accounts?.data &&
				account.external_accounts.data.length > 0
			) {
				const bankAccounts = account.external_accounts.data.filter(
					(acc: any) => acc.object === "bank_account"
				);

				if (bankAccounts.length > 0) {
					const defaultBank = bankAccounts[0];
					// Update bank account details in the database
					const { error: updateError } = await supabaseClient
						.from("studios")
						.update({
							bank_account_last4: defaultBank.last4,
							bank_account_name: defaultBank.bank_name,
							stripe_connect_enabled:
								account.charges_enabled && account.payouts_enabled,
							stripe_connect_onboarding_complete:
								account.details_submitted &&
								account.charges_enabled &&
								account.payouts_enabled,
						})
						.eq("id", studioData.id);

					if (updateError) {
						console.error("Error updating bank account details:", updateError);
					}

					bankAccount = {
						last4: defaultBank.last4,
						bank_name: defaultBank.bank_name,
						country: defaultBank.country,
						currency: defaultBank.currency,
					};
				}
			}

			return new Response(
				JSON.stringify({
					success: true,
					account: {
						id: account.id,
						charges_enabled: account.charges_enabled,
						payouts_enabled: account.payouts_enabled,
						details_submitted: account.details_submitted,
						bank_account: bankAccount,
					},
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		} else if (action === "create_login_link") {
			// If the studio doesn't have a Connect account yet, return an error
			if (!studioData.stripe_connect_id) {
				return new Response(
					JSON.stringify({ error: "Studio has no Stripe Connect account" }),
					{
						status: 404,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					}
				);
			}

			// Create a login link for the Connect account
			const loginLink = await stripe.accounts.createLoginLink(
				studioData.stripe_connect_id
			);

			return new Response(
				JSON.stringify({
					success: true,
					url: loginLink.url,
				}),
				{
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		} else {
			return new Response(JSON.stringify({ error: "Invalid action" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-connect-account' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"action":"create_account"}'

*/
