// src/utils/stripeUtils.ts
import { supabase } from "../lib/supabase";

/**
 * Processes a payment through Stripe
 */
export async function processStripePayment(
	bookingId: string,
	amount: number,
	paymentMethodId: string,
	description: string,
	customerId: string,
	currency: string = "USD",
	connectedAccountId?: string,
	connectedCustomerId?: string
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
	try {
		// Verify the payment method ID format - it should start with 'pm_'
		if (!paymentMethodId.startsWith("pm_")) {
			return {
				success: false,
				error:
					"Invalid payment method ID format. Please use a valid Stripe payment method.",
			};
		}

		// Fetch user details explicitly
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user || user.id !== customerId) {
			return {
				success: false,
				error: "Authentication failed. Please log in again.",
			};
		}

		// Get studio data directly - using the same approach as BookDropInModal
		const { data: userData, error: userError } = await supabase
			.from("users")
			.select("studio_id")
			.eq("id", customerId)
			.single();

		if (userError || !userData?.studio_id) {
			return {
				success: false,
				error: "Could not find studio information",
			};
		}

		// Get studio data directly
		const { data: studioData, error: studioError } = await supabase
			.from("studios")
			.select(
				"currency, stripe_connect_id, stripe_connect_enabled, stripe_connect_onboarding_complete"
			)
			.eq("id", userData.studio_id)
			.single();

		if (studioError || !studioData) {
			return {
				success: false,
				error: "Could not find studio payment information",
			};
		}

		// Validate studio details
		if (!studioData.stripe_connect_id) {
			return {
				success: false,
				error: "Studio payment setup is incomplete: Missing Stripe Connect ID",
			};
		}

		if (studioData.stripe_connect_enabled !== true) {
			console.error(
				"Stripe Connect not enabled",
				studioData.stripe_connect_enabled
			);
			return {
				success: false,
				error: `Studio payment setup is incomplete: Stripe Connect not enabled (current value: ${studioData.stripe_connect_enabled})`,
			};
		}

		// Always use the studio's connected account ID from the database
		const studioConnectId = studioData.stripe_connect_id;

		// Get connected customer ID if not provided
		if (!connectedCustomerId) {
			try {
				const { data: connectedCustomer, error: customerError } = await supabase
					.from("connected_customers")
					.select("stripe_connected_customer_id")
					.eq("parent_id", customerId)
					.eq("studio_id", userData.studio_id)
					.single();

				if (customerError || !connectedCustomer?.stripe_connected_customer_id) {
					console.error("Connected customer not found:", customerError);
					return {
						success: false,
						error: "Payment setup required. Please add a payment method first.",
					};
				}

				connectedCustomerId = connectedCustomer.stripe_connected_customer_id;
			} catch (err) {
				console.error("Error getting connected customer:", err);
				return {
					success: false,
					error: "Error retrieving payment information. Please try again.",
				};
			}
		}

		const functionUrl = `${window.location.origin}/.netlify/functions/process-drop-in-payment`;

		const response = await fetch(functionUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				bookingId,
				amount: Math.round(amount * 100), // Convert to cents for Stripe
				paymentMethodId,
				description,
				customerId: customerId, // Always use the user ID from Supabase
				connectedCustomerId: connectedCustomerId, // Pass the connected customer ID
				currency: (studioData.currency || currency).toLowerCase(),
				studioId: userData.studio_id,
				connectedAccountId: studioConnectId, // Always use the studio's connect ID from database
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error("Netlify function error:", {
				status: response.status,
				data: data,
				requestBody: {
					bookingId,
					amount: Math.round(amount * 100),
					paymentMethodId,
					description,
					customerId,
					connectedCustomerId,
					currency: (studioData.currency || currency).toLowerCase(),
					studioId: userData.studio_id,
					connectedAccountId: studioConnectId,
				},
			});
			return {
				success: false,
				error: data.error || `Payment processing failed (${response.status})`,
			};
		}

		if (!data?.success) {
			console.error("Payment processing error:", data?.error);
			return {
				success: false,
				error: data?.error || "Payment could not be processed",
			};
		}

		return {
			success: true,
			paymentId: data.paymentId,
		};
	} catch (err) {
		console.error("Error processing payment (detailed):", {
			errorName: err.name,
			errorMessage: err.message,
			errorStack: err.stack,
		});
		return {
			success: false,
			error:
				err instanceof Error ? err.message : "An unexpected error occurred",
		};
	}
}

/**
 * Retrieves Stripe payment methods for a user
 */
export async function getStripePaymentMethods(userId: string): Promise<any[]> {
	try {
		const functionUrl = `${window.location.origin}/.netlify/functions/get-payment-methods`;

		const response = await fetch(functionUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ userId }),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error("Error retrieving payment methods:", data.error);
			return [];
		}

		return data?.paymentMethods || [];
	} catch (err) {
		console.error("Error getting payment methods:", err);
		return [];
	}
}

/**
 * Adds a new payment method for a user
 */
export async function addStripePaymentMethod(
	userId: string,
	paymentMethodId: string,
	connectedAccountId: string | null = null
): Promise<{ success: boolean; error?: string }> {
	try {
		const functionUrl = `${window.location.origin}/.netlify/functions/add-payment-method`;

		const response = await fetch(functionUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				userId,
				paymentMethodId,
				connectedAccountId,
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error("Error adding payment method:", data.error);
			return { success: false, error: data.error };
		}

		return { success: !!data?.success };
	} catch (err) {
		console.error("Error adding payment method:", err);
		return {
			success: false,
			error:
				err instanceof Error ? err.message : "Failed to add payment method",
		};
	}
}

/**
 * Creates a setup intent for adding a new payment method
 */
export async function createSetupIntent(userId: string): Promise<{
	success: boolean;
	clientSecret?: string;
	error?: string;
	isConnectedAccount?: boolean;
	connectedAccountId?: string;
}> {
	try {
		const functionUrl = `${window.location.origin}/.netlify/functions/create-setup-intent`;

		const response = await fetch(functionUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ userId }),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error("Setup intent error:", data.error);
			return { success: false, error: data.error };
		}

		if (!data?.clientSecret) {
			console.error("No client secret returned");
			return { success: false, error: "No client secret returned" };
		}

		return {
			success: true,
			clientSecret: data.clientSecret,
			isConnectedAccount: data.isConnectedAccount,
			connectedAccountId: data.connectedAccountId,
		};
	} catch (err) {
		console.error("Error creating setup intent:", err);
		return {
			success: false,
			error:
				err instanceof Error ? err.message : "Failed to create setup intent",
		};
	}
}

/**
 * Gets a Stripe payment intent status
 */
export async function getPaymentIntentStatus(
	paymentIntentId: string
): Promise<{ status: string; error?: string }> {
	try {
		const functionUrl = `${window.location.origin}/.netlify/functions/get-payment-intent`;

		const response = await fetch(functionUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ paymentIntentId }),
		});

		const data = await response.json();

		if (!response.ok) {
			return { status: "error", error: data.error };
		}

		return { status: data?.status || "unknown" };
	} catch (err) {
		console.error("Error getting payment intent status:", err);
		return {
			status: "error",
			error:
				err instanceof Error ? err.message : "Failed to get payment status",
		};
	}
}

/**
 * Converts payment method details to a readable format
 */
export function formatPaymentMethodDetails(method: any): string {
	if (!method) return "Unknown payment method";

	if (method.type === "card") {
		const card = method.card;
		return `${capitalizeFirstLetter(card.brand)} •••• ${card.last4}`;
	}

	if (method.type === "bank_account") {
		const bank = method.bank_account;
		return `${bank.bank_name} •••• ${bank.last4}`;
	}

	return `${capitalizeFirstLetter(method.type)} payment method`;
}

/**
 * Helper function to capitalize the first letter of a string
 */
function capitalizeFirstLetter(string: string): string {
	if (!string) return "";
	return string.charAt(0).toUpperCase() + string.slice(1);
}
