@@ .. @@
 import { supabase } from "../../lib/supabase";
 import type { StudioInfo as StudioInfoType } from "../../types/studio";
 import { useData } from "../../contexts/DataContext";
 import { useLocalization } from "../../contexts/LocalizationContext";
 import { useAuth } from "../../contexts/AuthContext";
-import { SUPPORTED_COUNTRIES } from "../../utils/formatters";
+import { SUPPORTED_COUNTRIES } from "../../utils/formatters"; 
+import { getStudioPaymentMethods } from "../../utils/studioUtils";

 const TIMEZONE_LABELS: Record<string, string> = {
@@ .. @@
 	const [selectedRole, setSelectedRole] = useState<Role | null>(null);
 	const [name, setName] = useState("");
 	const [email, setEmail] = useState("");
 	const [phone, setPhone] = useState("");
+	const [hasActiveStripeSubscriptions, setHasActiveStripeSubscriptions] = useState(false);
 	const [timezone, setTimezone] = useState("Europe/London");
 	const [dateFormat, setDateFormat] = useState("dd/MM/yyyy");
 	const [localStudioInfo, setLocalStudioInfo] = useState<StudioInfoType | null>(
 		null
 	);
+	const [localPaymentMethods, setLocalPaymentMethods] = useState<{
+		stripe: boolean;
+		bacs: boolean;
+	}>({ stripe: true, bacs: false });
 	const { updateLocalization } = useLocalization();

 	const { error, isLoading, refreshData } = useData();
@@ .. @@
 	useEffect(() => {
 		if (profile?.studio && !localStudioInfo) {
 			setLocalStudioInfo(profile.studio);
+			
+			// Initialize payment methods
+			const paymentMethods = getStudioPaymentMethods(profile.studio);
+			setLocalPaymentMethods(paymentMethods);
+			
+			// Check for active Stripe subscriptions
+			const checkSubscriptions = async () => {
+				try {
+					const { count, error } = await supabase
+						.from('invoices')
+						.select('*', { count: 'exact', head: true })
+						.eq('studio_id', profile.studio?.id || '')
+						.eq('payment_method', 'stripe')
+						.eq('is_recurring', true)
+						.eq('status', 'active');
+						
+					if (error) throw error;
+					setHasActiveStripeSubscriptions(count > 0);
+				} catch (err) {
+					console.error('Error checking for active subscriptions:', err);
+				}
+			};
+			
+			checkSubscriptions();
 		}
 	}, [profile?.studio, localStudioInfo]);

@@ .. @@
 				name: localStudioInfo?.name,
 				address: localStudioInfo?.address,
 				phone: localStudioInfo?.phone,
 				email: localStudioInfo?.email,
 				country: country,
 				currency: SUPPORTED_COUNTRIES.find((c) => c.code === country)
 					?.currency,
 				timezone: timezone,
+				payment_methods_enabled: localPaymentMethods,
+				bacs_enabled: localPaymentMethods.bacs,
 				updated_at: new Date().toISOString(),
 			})
 			.eq("id", profile?.studio?.id + "")
@@ .. @@
 					</div>
 				</div>
 
+				{/* Payment Methods */}
+				<div>
+					<div className="flex items-center mb-4">
+						<CreditCard className="w-5 h-5 text-brand-primary mr-2" />
+						<h3 className="font-medium">Payment Methods</h3>
+					</div>
+
+					<div className="space-y-4 pl-7">
+						<div className="space-y-2">
+							<label className="flex items-center space-x-2">
+								<input 
+									type="checkbox" 
+									checked={localPaymentMethods.stripe}
+									onChange={(e) => {
+										const newValue = e.target.checked;
+										// Prevent disabling both
+										if (!newValue && !localPaymentMethods.bacs) {
+											setError("At least one payment method must be enabled");
+											return;
+										}
+										setLocalPaymentMethods(prev => ({ ...prev, stripe: newValue }));
+									}}
+									disabled={hasActiveStripeSubscriptions && !localPaymentMethods.bacs}
+									className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
+								/>
+								<span className="text-sm text-gray-700">Stripe Payments (Card payments with automatic processing)</span>
+							</label>
+							{hasActiveStripeSubscriptions && !localPaymentMethods.bacs && (
+								<p className="text-sm text-red-600 ml-6">
+									Cannot disable while you have active Stripe subscriptions
+								</p>
+							)}
+							
+							<label className="flex items-center space-x-2">
+								<input 
+									type="checkbox" 
+									checked={localPaymentMethods.bacs}
+									onChange={(e) => {
+										const newValue = e.target.checked;
+										// Prevent disabling both
+										if (!newValue && !localPaymentMethods.stripe) {
+											setError("At least one payment method must be enabled");
+											return;
+										}
+										setLocalPaymentMethods(prev => ({ ...prev, bacs: newValue }));
+									}}
+									className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
+								/>
+								<span className="text-sm text-gray-700">BACS/Bank Transfer (Manual payments via bank transfer)</span>
+							</label>
+						</div>
+						
+						{localPaymentMethods.bacs && (
+							<div className="mt-4 p-4 bg-blue-50 rounded-lg">
+								<p className="text-sm text-blue-800">
+									When BACS is enabled, you can create invoices that parents pay manually via bank transfer. 
+									You'll need to mark these payments as received in StudioAlign.
+								</p>
+							</div>
+						)}
+					</div>
+				</div>
+
 				{/* Bank Account Setup */}
 				<BankAccountSetup />