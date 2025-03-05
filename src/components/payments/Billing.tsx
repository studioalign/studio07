@@ .. @@
+import { useLocalization } from '../../contexts/LocalizationContext';
 
 export default function Billing() {
+  const { currency } = useLocalization();
   const [billingInfo, setBillingInfo] = useState({
@@ .. @@
           </div>
           <div className="space-y-2">
             <p className="text-2xl font-bold text-brand-primary">Professional Plan</p>
-            <p className="text-brand-secondary-400">$49/month</p>
+            <p className="text-brand-secondary-400">{formatCurrency(49, currency)}/month</p>
             <p className="text-sm text-gray-500">Next billing date: January 1, 2024</p>
           </div>