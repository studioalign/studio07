import React, { useState, useEffect } from "react";
import {
	CreditCard,
	Building2,
	ExternalLink,
	AlertCircle,
	CheckCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface StripeAccount {
	id: string;
	charges_enabled: boolean;
	payouts_enabled: boolean;
	details_submitted?: boolean;
	bank_account?: {
		last4: string;
		bank_name: string;
		country: string;
		currency: string;
	} | null;
	onboarding_url?: string;
}

// Force typescript to accept these properties until migration is applied
interface StudioWithStripe {
	id: string;
	name: string;
	address: string;
	phone: string;
	email: string;
	stripe_connect_id?: string;
	stripe_connect_enabled?: boolean;
	stripe_connect_onboarding_complete?: boolean;
	bank_account_name?: string;
	bank_account_last4?: string;
	// Other standard studio fields
	owner_id: string;
	created_at: string;
	updated_at: string;
	country?: string;
	timezone?: string;
}

export default function BankAccountSetup() {
	const { profile } = useAuth();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(
		null
	);
	const [accountStatus, setAccountStatus] = useState<
		"not_created" | "pending" | "active"
	>("not_created");

	// Check for URL parameters that indicate Stripe redirect
	useEffect(() => {
		const queryParams = new URLSearchParams(window.location.search);
		const stripeSuccess = queryParams.get("stripe_success");
		const stripeRefresh = queryParams.get("stripe_refresh");

		if (stripeSuccess === "true") {
			checkAccountStatus();
			// Clean up the URL
			window.history.replaceState({}, document.title, window.location.pathname);
		} else if (stripeRefresh === "true") {
			createAccount();
			// Clean up the URL
			window.history.replaceState({}, document.title, window.location.pathname);
		}
	}, []);

	useEffect(() => {
		checkAccountStatus();
	}, []);

	const checkAccountStatus = async () => {
		if (!profile?.studio?.id) return;

		setLoading(true);
		setError(null);

		try {
			// Check if the studio already has a Stripe Connect account
			const { data, error: studioError } = await supabase
				.from("studios")
				.select("*")
				.eq("id", profile.studio.id)
				.single();

			if (studioError) throw studioError;

			// Cast the data to include our new fields
			const studioData = data as StudioWithStripe;

			if (!studioData.stripe_connect_id) {
				setAccountStatus("not_created");
				return;
			}

			// Call the edge function to check the account status
			const { data: connectData, error } = await supabase.functions.invoke(
				"create-connect-account",
				{
					body: { action: "check_status" },
				}
			);

			if (error) throw error;

			setStripeAccount(connectData.account);

			if (
				connectData.account.charges_enabled &&
				connectData.account.payouts_enabled
			) {
				setAccountStatus("active");
			} else {
				setAccountStatus("pending");
			}
		} catch (err) {
			console.error("Error checking account status:", err);
			setError(
				err instanceof Error ? err.message : "Failed to check account status"
			);
		} finally {
			setLoading(false);
		}
	};

	const createAccount = async () => {
		if (!profile?.studio?.id) return;

		setLoading(true);
		setError(null);

		try {
			const { data, error } = await supabase.functions.invoke(
				"create-connect-account",
				{
					body: { action: "create_account" },
				}
			);

			if (error) throw error;

			setStripeAccount(data.account);
			setAccountStatus("pending");

			if (data.account.onboarding_url) {
				window.location.href = data.account.onboarding_url;
			}
		} catch (err) {
			console.error("Error creating account:", err);
			setError(
				err instanceof Error
					? err.message
					: "Failed to create Stripe Connect account"
			);
		} finally {
			setLoading(false);
		}
	};

	const manageAccount = async () => {
		if (!profile?.studio?.id || !stripeAccount?.id) return;

		setLoading(true);
		setError(null);

		try {
			const { data, error } = await supabase.functions.invoke(
				"create-connect-account",
				{
					body: { action: "create_login_link" },
				}
			);

			if (error) throw error;

			if (data.url) {
				window.location.href = data.url;
			}
		} catch (err) {
			console.error("Error creating login link:", err);
			setError(
				err instanceof Error ? err.message : "Failed to access Stripe dashboard"
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div>
			<div className="flex items-center mb-4">
				<Building2 className="w-5 h-5 text-brand-accent mr-2" />
				<h3 className="font-medium">Payment Settings</h3>
			</div>

			{error && (
				<div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
					<AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
					<p>{error}</p>
				</div>
			)}

			<div className="space-y-4 pl-7">
				{accountStatus === "not_created" && (
					<div className="p-4 border border-gray-200 rounded-lg">
						<h4 className="font-medium mb-2">Accept Payments Directly</h4>
						<p className="text-gray-600 mb-4">
							Connect your bank account to receive payments directly from
							parents. StudioAlign uses Stripe to securely process payments.
						</p>
						<button
							onClick={createAccount}
							disabled={loading}
							className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
						>
							<CreditCard className="w-4 h-4 mr-2" />
							{loading ? "Setting up..." : "Set Up Bank Account"}
						</button>
					</div>
				)}

				{accountStatus === "pending" && stripeAccount && (
					<div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
						<h4 className="font-medium mb-2 flex items-center">
							<AlertCircle className="w-5 h-5 mr-2 text-yellow-500" />
							Bank Account Setup Incomplete
						</h4>
						<p className="text-gray-600 mb-4">
							Please complete your Stripe onboarding to start receiving payments
							directly. Until this is completed, invoices will display
							StudioAlign details and payments will be processed centrally.
						</p>
						<button
							onClick={createAccount}
							disabled={loading}
							className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
						>
							<ExternalLink className="w-4 h-4 mr-2" />
							{loading ? "Loading..." : "Complete Stripe Setup"}
						</button>
					</div>
				)}

				{accountStatus === "active" && stripeAccount && (
					<div className="p-4 border border-green-200 bg-green-50 rounded-lg">
						<h4 className="font-medium mb-2 flex items-center">
							<CheckCircle className="w-5 h-5 mr-2 text-green-500" />
							Bank Account Connected
						</h4>

						{stripeAccount.bank_account && (
							<div className="mb-4">
								<p className="text-gray-800">
									<span className="font-medium">
										{stripeAccount.bank_account.bank_name}
									</span>{" "}
									•••• {stripeAccount.bank_account.last4}
								</p>
								<p className="text-sm text-gray-500">
									{stripeAccount.bank_account.country} •{" "}
									{stripeAccount.bank_account.currency.toUpperCase()}
								</p>
							</div>
						)}

						<p className="text-gray-600 mb-4">
							Your bank account is connected and ready to receive payments. When
							parents pay invoices, the money will be sent directly to your
							account.
						</p>

						<button
							onClick={manageAccount}
							disabled={loading}
							className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100"
						>
							<ExternalLink className="w-4 h-4 mr-2" />
							{loading ? "Loading..." : "Manage Bank Account"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
