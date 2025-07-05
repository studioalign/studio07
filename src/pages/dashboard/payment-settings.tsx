import { useEffect, useState } from "react";
import { Building2, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import { supabase } from "../../lib/supabase";
import { getStudioPaymentMethods } from "../../utils/studioUtils";

interface DashboardHeaderProps {
	title: string;
	description: string;
	icon: React.ReactNode;
}

function DashboardHeader({ title, description, icon }: DashboardHeaderProps) {
	return (
		<div className="flex items-center justify-between mb-6">
			<div className="flex items-center gap-4">
				<div className="p-2 bg-brand-secondary-100 rounded-lg">{icon}</div>
				<div>
					<h1 className="text-2xl font-bold text-brand-primary">{title}</h1>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
			</div>
		</div>
	);
}

interface Studio {
	id: string;
	name: string;
	stripe_connect_id?: string;
	stripe_connect_onboarding_complete?: boolean;
	bank_account_name?: string;
	bank_account_last4?: string;
}

export default function PaymentSettings() {
	const { profile } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const [studioData, setStudioData] = useState<Studio | null>(
		profile?.studio || null
	);
	const [loading, setLoading] = useState({
		page: true,
		connectAccount: false,
		platformPayments: false,
	});
	const [error, setError] = useState<string | null>(null);
	
	// Get studio payment methods
	const studioPaymentMethods = studioData ? 
		getStudioPaymentMethods(studioData) : 
		{ stripe: true, bacs: false };

	const checkAccountStatus = async () => {
		if (!profile?.studio?.id) return;

		setLoading((prev) => ({ ...prev, page: true }));
		setError(null);

		try {
			const { error } = await supabase.functions.invoke(
				"create-connect-account",
				{
					body: { action: "check_status" },
				}
			);

			if (error) throw error;

			// Fetch latest studio data
			const { data: studioData, error: studioError } = await supabase
				.from("studios")
				.select("*")
				.eq("id", profile.studio.id as string)
				.single();

			if (studioError) throw studioError;

			if (studioData) {
				setStudioData(studioData as Studio);
			}
		} catch (err) {
			console.error("Error checking account status:", err);
			setError(
				err instanceof Error ? err.message : "Failed to check account status"
			);
		} finally {
			setLoading((prev) => ({ ...prev, page: false }));
		}
	};

	// Handle redirect from Stripe onboarding
	useEffect(() => {
		// Get search params
		const searchParams = new URLSearchParams(location.search);
		const success = searchParams.get("success");
		const type = searchParams.get("type");

		if (success === "true" && type === "stripe_connect") {
			// Fetch latest studio data to get updated bank account info
			const fetchStudioData = async () => {
				try {
					const { data, error } = await supabase
						.from("studios")
						.select("*")
						.eq("id", profile?.studio?.id + "")
						.single();

					if (error) throw error;
					setStudioData(data as Studio);
				} catch (err) {
					console.error("Error fetching studio data:", err);
				}
			};

			fetchStudioData();
			// Remove query parameters by navigating to the base path
			navigate(location.pathname, { replace: true });
		}
	}, [location, navigate, profile?.studio?.id]);

	// Check account status on mount and after redirect
	useEffect(() => {
		if (profile?.studio?.id) {
			checkAccountStatus();
		}
	}, [profile?.studio?.id]);

	// Connect a new Stripe account
	const connectStripeAccount = async () => {
		if (!studioData) return;

		setLoading((prev) => ({ ...prev, connectAccount: true }));
		setError(null);

		try {
			const response = await fetch(
				`${
					import.meta.env.VITE_SUPABASE_URL
				}/functions/v1/create-connect-account`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${
							(
								await supabase.auth.getSession()
							).data.session?.access_token
						}`,
					},
					body: JSON.stringify({
						action:
							studioData.stripe_connect_id &&
							studioData.stripe_connect_onboarding_complete
								? "create_login_link"
								: "create_account",
						studio_id: studioData.id,
					}),
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to connect with Stripe");
			}

			const data = await response.json();

			if (data.account?.onboarding_url) {
				window.location.href = data.account.onboarding_url;
			}
			if (data.url) {
				window.location.href = data.url;
			}
		} catch (err: Error | unknown) {
			console.error("Error connecting Stripe account:", err);
			setError(
				err instanceof Error ? err.message : "Failed to connect with Stripe"
			);
			alert({
				variant: "destructive",
				title: "Connection Failed",
				description:
					err instanceof Error ? err.message : "Failed to connect with Stripe",
			});
		} finally {
			setLoading((prev) => ({ ...prev, connectAccount: false }));
		}
	};

	return (
		<>
			<DashboardHeader
				title="Payment Settings"
				description="Manage how you receive payments from clients"
				icon={<Settings className="h-6 w-6" />}
			/>

			<div className="space-y-6">
				<main className="w-full space-y-4 mt-6 bg-white">
					<Card>
						{studioPaymentMethods.stripe ? (
							<>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Building2 className="h-5 w-5" />
										Bank Account Connection
									</CardTitle>
									<CardDescription>
										Connect your bank account to receive payments directly from
										clients
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									{error && (
										<div className="bg-red-50 text-red-800 p-3 rounded-md text-sm mb-4">
											{error}
										</div>
									)}
		
									{studioData?.stripe_connect_onboarding_complete ? (
										<div className="space-y-4">
											<div className="flex items-center justify-between p-4 bg-green-50 rounded-md">
												<div>
													<h3 className="font-medium text-green-800">
														Bank Account Connected
													</h3>
													{studioData.bank_account_name &&
														studioData.bank_account_last4 && (
															<p className="text-sm text-green-700 mt-1">
																{studioData.bank_account_name} (ending in{" "}
																{studioData.bank_account_last4})
															</p>
														)}
												</div>
												<div className="bg-green-100 rounded-full p-2">
													<Building2 className="h-5 w-5 text-green-600" />
												</div>
											</div>
		
											<button
												onClick={connectStripeAccount}
												className="px-4 py-2 text-sm font-medium bg-accent text-brand-primary"
												disabled={loading.connectAccount}
											>
												{loading.connectAccount
													? "Loading..."
													: "Manage Bank Account"}
											</button>
										</div>
									) : (
										<div className="space-y-4">
											<div className="flex items-center justify-between p-4 bg-amber-50 rounded-md">
												<div>
													<h3 className="font-medium text-amber-800">
														Bank Account Not Connected
													</h3>
													<p className="text-sm text-amber-700 mt-1">
														Connect your bank account to receive payments directly
														from clients.
													</p>
												</div>
												<div className="bg-amber-100 rounded-full p-2">
													<Building2 className="h-5 w-5 text-amber-600" />
												</div>
											</div>
		
											<button
												onClick={connectStripeAccount}
												disabled={loading.connectAccount}
												className="px-4 py-2 text-sm font-medium bg-brand-primary text-white"
											>
												{loading.connectAccount
													? "Loading..."
													: studioData?.stripe_connect_id
													? "Complete Onboarding"
													: "Connect Bank Account"}
											</button>
										</div>
									)}
								</CardContent>
							</>
						) : (
							<>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Building2 className="h-5 w-5" />
										Payment Settings
									</CardTitle>
									<CardDescription>
										Manage your studio payment settings
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="p-4 bg-blue-50 rounded-lg">
										<h3 className="font-medium text-blue-800">Bank Transfer Payments Only</h3>
										<p className="text-sm text-blue-700 mt-1">
											Your studio is configured for bank transfer payments only. 
											To accept card payments, enable Stripe in your Studio Info settings.
										</p>
										<button
											onClick={() => navigate('/dashboard/studio')}
											className="mt-4 px-4 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
										>
											Go to Studio Settings
										</button>
									</div>
								</CardContent>
							</>
						)}
					</Card>
				</main>
			</div>
		</>
	);
}
