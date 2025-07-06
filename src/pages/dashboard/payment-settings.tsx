import { useEffect, useState } from "react";
import { Building2, Settings, CreditCard } from "lucide-react";
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
	payment_methods_enabled?: {
		stripe: boolean;
		bacs: boolean;
	} | null;
	bacs_enabled?: boolean;
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

	// Local payment methods state
	const [localPaymentMethods, setLocalPaymentMethods] = useState(() => {
		return getStudioPaymentMethods(studioData);
	});
	const [hasActiveStripeSubscriptions, setHasActiveStripeSubscriptions] = useState(false);

	// Update payment methods when studio data changes
	useEffect(() => {
		if (studioData) {
			setLocalPaymentMethods(getStudioPaymentMethods(studioData));
		}
	}, [studioData]);

	// Check for active Stripe subscriptions
	useEffect(() => {
		const checkSubscriptions = async () => {
			if (!studioData?.id) return;
			
			try {
				const { count, error } = await supabase
					.from('invoices')
					.select('*', { count: 'exact', head: true })
					.eq('studio_id', studioData.id)
					.eq('payment_method', 'stripe')
					.eq('is_recurring', true)
					.eq('status', 'active');
					
				if (error) throw error;
				setHasActiveStripeSubscriptions(count > 0);
			} catch (err) {
				console.error('Error checking for active subscriptions:', err);
			}
		};
		
		if (studioData?.id) {
			checkSubscriptions();
		}
	}, [studioData?.id]);

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
				err instanceof Error ?
					err.message :
					"Failed to check account status"
			);
		} finally {
			setLoading((prev) => ({ ...prev, page: false }));
		}
	};

	const savePaymentMethods = async () => {
		if (!studioData?.id) return;
		
		setLoading(prev => ({ ...prev, platformPayments: true }));
		setError(null);
		
		try {
			const { error } = await supabase
				.from('studios')
				.update({
					payment_methods_enabled: localPaymentMethods,
					bacs_enabled: localPaymentMethods.bacs,
				})
				.eq('id', studioData.id);
				
			if (error) throw error;
			
			// Update local state
			setStudioData(prev => prev ? {
				...prev,
				payment_methods_enabled: localPaymentMethods,
				bacs_enabled: localPaymentMethods.bacs
			} : null);
			
			// Show success message
			alert('Payment method settings updated successfully');
		} catch (err) {
			console.error('Error updating payment methods:', err);
			setError(err instanceof Error ? err.message : 'Failed to update payment method settings');
		} finally {
			setLoading(prev => ({ ...prev, platformPayments: false }));
		}
	};

	const handleConnectAccount = async () => {
		setLoading((prev) => ({ ...prev, connectAccount: true }));
		setError(null);

		try {
			const { data, error } = await supabase.functions.invoke(
				"create-connect-account",
				{
					body: { action: "create_or_get_link" },
				}
			);

			if (error) throw error;

			if (data?.url) {
				window.location.href = data.url;
			} else {
				throw new Error("No onboarding URL received");
			}
		} catch (err) {
			console.error("Error creating connect account:", err);
			setError(
				err instanceof Error ?
					err.message :
					"Failed to initiate Stripe Connect onboarding"
			);
		} finally {
			setLoading((prev) => ({ ...prev, connectAccount: false }));
		}
	};

	const handleEnablePlatformPayments = async () => {
		setLoading((prev) => ({ ...prev, platformPayments: true }));
		setError(null);

		try {
			const { error } = await supabase.functions.invoke("enable-platform-payments");

			if (error) throw error;

			// Refresh account status
			await checkAccountStatus();
		} catch (err) {
			console.error("Error enabling platform payments:", err);
			setError(
				err instanceof Error ?
					err.message :
					"Failed to enable platform payments"
			);
		} finally {
			setLoading((prev) => ({ ...prev, platformPayments: false }));
		}
	};

	useEffect(() => {
		checkAccountStatus();
	}, []);

	// Handle return from Stripe Connect onboarding
	useEffect(() => {
		const urlParams = new URLSearchParams(location.search);
		if (urlParams.get("setup") === "success") {
			// Remove the URL parameters and refresh status
			navigate("/dashboard/payment-settings", { replace: true });
			checkAccountStatus();
		}
	}, [location.search, navigate]);

	if (loading.page) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<DashboardHeader
				title="Payment Settings"
				description="Manage your payment methods and Stripe integration"
				icon={<Settings className="h-6 w-6 text-brand-primary" />}
			/>

			{error && (
				<div className="bg-red-50 border border-red-200 rounded-md p-4">
					<p className="text-sm text-red-600">{error}</p>
				</div>
			)}

			{/* Payment Methods Configuration */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CreditCard className="w-5 h-5" />
						Payment Methods
					</CardTitle>
					<CardDescription>
						Configure which payment methods your studio accepts
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="space-y-2">
							<label className="flex items-center space-x-2">
								<input 
									type="checkbox" 
									checked={localPaymentMethods.stripe}
									onChange={(e) => {
										const newValue = e.target.checked;
										if (!newValue && !localPaymentMethods.bacs) {
											setError("At least one payment method must be enabled");
											return;
										}
										setError(null);
										setLocalPaymentMethods(prev => ({ ...prev, stripe: newValue }));
									}}
									disabled={hasActiveStripeSubscriptions && !localPaymentMethods.bacs}
									className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
								/>
								<span className="text-sm text-gray-700">Stripe Payments (Card payments with automatic processing)</span>
							</label>
							{hasActiveStripeSubscriptions && !localPaymentMethods.bacs && (
								<p className="text-sm text-red-600 ml-6">
									Cannot disable while you have active Stripe subscriptions
								</p>
							)}
							
							<label className="flex items-center space-x-2">
								<input 
									type="checkbox" 
									checked={localPaymentMethods.bacs}
									onChange={(e) => {
										const newValue = e.target.checked;
										if (!newValue && !localPaymentMethods.stripe) {
											setError("At least one payment method must be enabled");
											return;
										}
										setError(null);
										setLocalPaymentMethods(prev => ({ ...prev, bacs: newValue }));
									}}
									className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
								/>
								<span className="text-sm text-gray-700">BACS/Bank Transfer (Manual payments via bank transfer)</span>
							</label>
						</div>
						
						{localPaymentMethods.bacs && (
							<div className="mt-4 p-4 bg-blue-50 rounded-lg">
								<p className="text-sm text-blue-800">
									When BACS is enabled, you can create invoices that parents pay manually via bank transfer. 
									You'll need to mark these payments as received in StudioAlign.
								</p>
							</div>
						)}
						
						<button
							onClick={savePaymentMethods}
							disabled={loading.platformPayments}
							className="w-full px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
						>
							{loading.platformPayments ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
									Saving...
								</>
							) : (
								'Save Payment Method Settings'
							)}
						</button>
					</div>
				</CardContent>
			</Card>

			{/* Stripe Connect Section - Only show if Stripe is enabled */}
			{studioPaymentMethods.stripe ? (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CreditCard className="w-5 h-5" />
							Stripe Connect
						</CardTitle>
						<CardDescription>
							Connect your Stripe account to accept card payments
						</CardDescription>
					</CardHeader>
					<CardContent>
						{!studioData?.stripe_connect_id ? (
							<div className="space-y-4">
								<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
									<h3 className="font-medium text-blue-900 mb-2">
										Get started with Stripe payments
									</h3>
									<p className="text-sm text-blue-800 mb-4">
										Connect your Stripe account to start accepting card payments.
										Stripe handles secure payment processing and transfers funds
										directly to your bank account.
									</p>
									<ul className="text-sm text-blue-700 space-y-1 mb-4">
										<li>• Accept credit and debit cards</li>
										<li>• Automatic payment processing</li>
										<li>• Secure, PCI-compliant transactions</li>
										<li>• Direct bank transfers</li>
									</ul>
								</div>
								<button
									onClick={handleConnectAccount}
									disabled={loading.connectAccount}
									className="w-full px-4 py-2 bg-[#635BFF] text-white rounded-md hover:bg-[#5851DF] disabled:opacity-50 flex items-center justify-center"
								>
									{loading.connectAccount ? (
										<>
											<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
											Connecting...
										</>
									) : (
										'Connect with Stripe'
									)}
								</button>
							</div>
						) : !studioData?.stripe_connect_onboarding_complete ? (
							<div className="space-y-4">
								<div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
									<h3 className="font-medium text-yellow-900 mb-2">
										Complete your Stripe setup
									</h3>
									<p className="text-sm text-yellow-800">
										Your Stripe account is connected but setup is incomplete.
										Complete the onboarding process to start accepting payments.
									</p>
								</div>
								<button
									onClick={handleConnectAccount}
									disabled={loading.connectAccount}
									className="w-full px-4 py-2 bg-[#635BFF] text-white rounded-md hover:bg-[#5851DF] disabled:opacity-50 flex items-center justify-center"
								>
									{loading.connectAccount ? (
										<>
											<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
											Completing setup...
										</>
									) : (
										'Complete Stripe Setup'
									)}
								</button>
							</div>
						) : (
							<div className="space-y-4">
								<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
									<h3 className="font-medium text-green-900 mb-2">
										✓ Stripe Connected
									</h3>
									<p className="text-sm text-green-800">
										Your Stripe account is connected and ready to accept payments.
									</p>
									{studioData?.bank_account_last4 && (
										<p className="text-sm text-green-700 mt-2">
											Bank account ending in {studioData.bank_account_last4}
										</p>
									)}
								</div>
								<button
									onClick={handleEnablePlatformPayments}
									disabled={loading.platformPayments}
									className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center"
								>
									{loading.platformPayments ? (
										<>
											<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
											Updating...
										</>
									) : (
										'Update Stripe Settings'
									)}
								</button>
							</div>
						)}
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Building2 className="w-5 h-5" />
							Bank Transfer Payments Only
						</CardTitle>
						<CardDescription>
							Your studio is configured for bank transfer payments only
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="p-4 bg-gray-50 rounded-lg">
							<h3 className="font-medium text-gray-900 mb-2">Bank Transfer Mode</h3>
							<p className="text-sm text-gray-700 mb-4">
								Your studio is configured to use bank transfer payments only. 
								Enable Stripe payments in the Payment Methods section above to accept card payments.
							</p>
							<ul className="text-sm text-gray-600 space-y-1">
								<li>• Parents will receive invoices with bank details</li>
								<li>• Manual payment confirmation required</li>
								<li>• No transaction fees to Stripe</li>
								<li>• Direct bank-to-bank transfers</li>
							</ul>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}