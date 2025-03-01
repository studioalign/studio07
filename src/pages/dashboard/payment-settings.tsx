import { useEffect, useState } from "react";
import { Building2, CreditCard, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "../../components/ui/tabs";
import { Switch } from "../../components/ui/switch";
import { supabase } from "../../lib/supabase";

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
	uses_platform_payments?: boolean;
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

	const checkAccountStatus = async () => {
		if (!profile?.studio?.id) return;

		setLoading((prev) => ({ ...prev, page: true }));
		setError(null);

		try {
			const { data: connectData, error } = await supabase.functions.invoke(
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
					setStudioData(data);

					alert({
						title: "Bank account connected successfully!",
						description:
							"Your bank account has been connected to receive payments.",
					});
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
						action: studioData.stripe_connect_id
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

	// Toggle platform payments setting
	const togglePlatformPayments = async (enabled: boolean) => {
		if (!studioData) return;

		setLoading((prev) => ({ ...prev, platformPayments: true }));

		try {
			const { error } = await supabase
				.from("studios")
				.update({ uses_platform_payments: enabled })
				.eq("id", studioData.id);

			if (error) throw error;

			setStudioData((prev) =>
				prev ? { ...prev, uses_platform_payments: enabled } : null
			);

			alert({
				title: enabled
					? "Platform payments enabled"
					: "Platform payments disabled",
				description: enabled
					? "Payments will be processed by StudioAlign and transferred to your bank account."
					: "Clients will see your studio name on invoices and payments will go directly to your account.",
			});
		} catch (err: Error | unknown) {
			console.error("Error updating platform payments setting:", err);
			alert({
				variant: "destructive",
				title: "Update Failed",
				description:
					err instanceof Error
						? err.message
						: "Failed to update payment settings",
			});
		} finally {
			setLoading((prev) => ({ ...prev, platformPayments: false }));
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
				<Tabs defaultValue="bank-account" className="w-full">
					<TabsList className="grid w-full max-w-md grid-cols-2">
						<TabsTrigger value="bank-account">Bank Account</TabsTrigger>
						<TabsTrigger value="invoice-settings">Invoice Settings</TabsTrigger>
					</TabsList>

					<TabsContent value="bank-account" className="space-y-4 mt-6">
						<Card>
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
						</Card>
					</TabsContent>

					<TabsContent value="invoice-settings" className="space-y-4 mt-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<CreditCard className="h-5 w-5" />
									Invoice Settings
								</CardTitle>
								<CardDescription>
									Configure how your clients see your invoices and process
									payments
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<div className="flex items-center gap-2">
												<label
													htmlFor="platform-payments"
													className="font-medium"
												>
													Use Platform Payments
												</label>
												<span
													className={`text-xs px-2 py-0.5 rounded-full ${
														studioData?.uses_platform_payments
															? "bg-green-100 text-green-700"
															: "bg-gray-100 text-gray-700"
													}`}
												>
													{studioData?.uses_platform_payments
														? "Enabled"
														: "Disabled"}
												</span>
											</div>
											<p className="text-sm text-muted-foreground">
												When enabled, StudioAlign processes payments on your
												behalf and transfers them to your account. When
												disabled, your clients see your studio name on invoices
												and payments go directly to your bank account.
											</p>
										</div>
										<div className="flex flex-col items-end gap-2">
											<Switch
												id="platform-payments"
												checked={studioData?.uses_platform_payments || false}
												onCheckedChange={togglePlatformPayments}
												disabled={
													loading.platformPayments ||
													!studioData?.stripe_connect_onboarding_complete
												}
												className={`${
													loading.platformPayments
														? "opacity-50 cursor-not-allowed"
														: ""
												}`}
											/>
											{loading.platformPayments && (
												<span className="text-xs text-muted-foreground">
													Updating...
												</span>
											)}
										</div>
									</div>

									{!studioData?.stripe_connect_onboarding_complete ? (
										<div className="text-sm text-amber-600 p-3 bg-amber-50 rounded-md flex items-start gap-2">
											<Building2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
											<p>
												You need to connect your bank account first before you
												can change this setting.
											</p>
										</div>
									) : (
										!studioData?.uses_platform_payments && (
											<div className="text-sm text-blue-600 p-3 bg-blue-50 rounded-md flex items-start gap-2">
												<CreditCard className="h-4 w-4 mt-0.5 flex-shrink-0" />
												<p>
													Payments will be processed directly through your
													Stripe account. Your studio name will appear on all
													invoices.
												</p>
											</div>
										)
									)}
								</div>

								<div className="border-t my-4" />

								<div>
									<h3 className="font-medium mb-2">Invoice Branding</h3>
									<p className="text-sm text-muted-foreground mb-4">
										How your studio information appears on invoices to clients:
									</p>

									<div className="p-4 border rounded-md">
										<div className="flex items-center justify-between mb-4">
											<div>
												<h4 className="font-medium">
													{studioData?.uses_platform_payments
														? "StudioAlign"
														: studioData?.name || "Your Studio Name"}
												</h4>
												<p className="text-sm text-muted-foreground">
													{studioData?.uses_platform_payments
														? "Payment processed by StudioAlign on behalf of your studio"
														: "Payment processed directly by your studio"}
												</p>
											</div>
											<div
												className={`p-2 rounded-full ${
													studioData?.uses_platform_payments
														? "bg-blue-100"
														: "bg-green-100"
												}`}
											>
												<CreditCard
													className={`h-5 w-5 ${
														studioData?.uses_platform_payments
															? "text-blue-600"
															: "text-green-600"
													}`}
												/>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</>
	);
}
