import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp, AlertCircle, CreditCard } from "lucide-react";
import { supabase } from "../../lib/supabase";
import StatsCard from "../dashboard/StatsCard";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { useLocalization } from "../../contexts/LocalizationContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Payment {
	id: string;
	amount: number;
	original_amount?: number | null;
	discount_amount?: number | null;
	is_recurring: boolean;
	recurring_interval?: string | null;
	payment_method: string;
	status: string;
	stripe_payment_intent_id: string | null;
	payment_date: string;
	invoice: {
		id: string;
		index: number;
		studio_id: string;
		parent: {
			name: string;
		};
	} | null;
}

interface PaymentStats {
	totalRevenue: number;
	outstandingBalance: number;
	outstandingCount: number;
	overdueAmount: number;
	overdueCount: number;
}

export default function Payments() {
	const { currency, dateFormat } = useLocalization();
	const { profile } = useAuth();
	const navigate = useNavigate();
	const [payments, setPayments] = useState<Payment[]>([]);
	const [isStripeConnected, setIsStripeConnected] = useState<boolean>(false);
	const [stats, setStats] = useState<PaymentStats>({
		totalRevenue: 0,
		outstandingBalance: 0,
		outstandingCount: 0,
		overdueAmount: 0,
		overdueCount: 0,
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (profile?.studio?.id) {
			fetchPayments(profile.studio.id);
			fetchStats(profile.studio.id);
			checkStripeConnection(profile.studio.id);
		}
	}, [profile]);

	const checkStripeConnection = async (studioId: string) => {
		try {
			const { data: studioData, error } = await supabase
				.from("studios")
				.select("stripe_connect_enabled")
				.eq("id", studioId)
				.single();

			if (error) throw error;
			setIsStripeConnected(!!studioData?.stripe_connect_enabled);
		} catch (err) {
			console.error("Error checking Stripe connection:", err);
			setIsStripeConnected(false);
		}
	};

	const fetchPayments = async (studioId: string) => {
	  try {
	    console.log("Fetching payments for studio:", studioId);
	    
	    const { data, error: fetchError } = await supabase
	      .from("payments")
	      .select(
	        `
	          id,
	          amount,
	          original_amount,
	          discount_amount,
	          is_recurring,
	          recurring_interval,
	          payment_method,
	          status,
	          stripe_payment_intent_id,
	          payment_date,
	          invoice:invoices!payments_invoice_id_fkey (
	            id,
	            index,
	            studio_id,
	            parent_id
	          )
	        `
	      )
	      .order("payment_date", { ascending: false })
	      .limit(10);
	
	    if (fetchError) {
	      console.error("Error fetching payments:", fetchError);
	      throw fetchError;
	    }
	
	    console.log("Raw payment data:", data);
	
	    // Filter payments that belong to this studio
	    const studioPayments = (data || []).filter(
	      (payment) => payment.invoice && payment.invoice.studio_id === studioId
	    );
	
	    console.log("Filtered studio payments:", studioPayments);
	
	    if (studioPayments.length > 0) {
	      // Get parent names for the payments
	      const parentIds = studioPayments
	        .map((payment) => payment.invoice?.parent_id)
	        .filter((id) => id);
	
	      console.log("Parent IDs to fetch:", parentIds);
	
	      if (parentIds.length > 0) {
	        const { data: parents, error: parentError } = await supabase
	          .from("users")
	          .select("id, name")
	          .in("id", parentIds);
	
	        if (parentError) {
	          console.error("Error fetching parent names:", parentError);
	        } else {
	          console.log("Parent data:", parents);
	          
	          // Map parent names to payments
	          const paymentsWithParents = studioPayments.map((payment) => ({
	            ...payment,
	            invoice: payment.invoice ? {
	              ...payment.invoice,
	              parent: parents?.find((p) => p.id === payment.invoice.parent_id) || {
	                name: "Unknown Parent",
	              },
	            } : null,
	          }));
	
	          console.log("Final payments with parents:", paymentsWithParents);
	          setPayments(paymentsWithParents as Payment[]);
	          return;
	        }
	      }
	    }
	
	    // Fallback: set payments without parent names if parent fetch fails
	    const paymentsWithFallback = studioPayments.map((payment) => ({
	      ...payment,
	      invoice: payment.invoice ? {
	        ...payment.invoice,
	        parent: { name: "Unknown Parent" },
	      } : null,
	    }));
	
	    console.log("Fallback payments:", paymentsWithFallback);
	    setPayments(paymentsWithFallback as Payment[]);
	    
	  } catch (err) {
	    console.error("Error fetching payments:", err);
	    setError(err instanceof Error ? err.message : "Failed to fetch payments");
	  }
	};

	const fetchStats = async (studioId: string) => {
	  try {
	    // Get current month date range
	    const now = new Date();
	    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
	    
	    console.log("Fetching stats for current month - PAYMENTS ONLY:", {
	      start: startOfMonth.toISOString(),
	      end: endOfMonth.toISOString()
	    });
	
	    // Get revenue from completed payments ONLY
	    const { data: payments, error: paymentsError } = await supabase
	      .from("payments")
	      .select(`
	        amount,
	        payment_date,
	        status,
	        invoice:invoices!payments_invoice_id_fkey (
	          studio_id
	        )
	      `)
	      .eq("status", "completed")
	      .gte("payment_date", startOfMonth.toISOString())
	      .lte("payment_date", endOfMonth.toISOString());
	
	    if (paymentsError) throw paymentsError;
	
	    // Calculate total revenue - ONLY from payments table
	    const totalRevenue = (payments || [])
	      .filter(p => p.invoice?.studio_id === studioId)
	      .reduce((sum, p) => sum + p.amount, 0);
	
	    // Get outstanding invoices (current month only)
	    const { data: pendingInvoices, error: pendingError } = await supabase
	      .from("invoices")
	      .select("total, created_at")
	      .eq("studio_id", studioId)
	      .in("status", ["pending"])
	      .neq("payment_method", "bacs")
	      .gte("created_at", startOfMonth.toISOString())
	      .lte("created_at", endOfMonth.toISOString());
	
	    if (pendingError) throw pendingError;
	
	    // Get pending BACS invoices (current month only)
	    const { data: pendingBacs, error: pendingBacsError } = await supabase
	      .from("invoices")
	      .select("total, created_at")
	      .eq("studio_id", studioId)
	      .eq("payment_method", "bacs")
	      .eq("manual_payment_status", "pending")
	      .gte("created_at", startOfMonth.toISOString())
	      .lte("created_at", endOfMonth.toISOString());
	
	    if (pendingBacsError) throw pendingBacsError;
	
	    // Get overdue invoices (current month only)
	    const { data: overdueInvoices, error: overdueError } = await supabase
	      .from("invoices")
	      .select("total, created_at")
	      .eq("studio_id", studioId)
	      .in("status", ["overdue"])
	      .gte("created_at", startOfMonth.toISOString())
	      .lte("created_at", endOfMonth.toISOString());
	
	    if (overdueError) throw overdueError;
	
	    const outstandingBalance = 
	      ((pendingInvoices || []).reduce((sum, i) => sum + i.total, 0)) +
	      ((pendingBacs || []).reduce((sum, i) => sum + i.total, 0));
	
	    const overdueAmount = (overdueInvoices || []).reduce((sum, i) => sum + i.total, 0);
	
	    console.log("Stats calculated - PAYMENTS ONLY:", {
	      totalRevenue,
	      outstandingBalance,
	      overdueAmount,
	      paymentsCount: payments?.length || 0,
	      paymentsIncluded: (payments || []).filter(p => p.invoice?.studio_id === studioId)
	    });
	
	    setStats({
	      totalRevenue,
	      outstandingBalance,
	      outstandingCount: ((pendingInvoices || []).length + (pendingBacs || []).length),
	      overdueAmount,
	      overdueCount: (overdueInvoices || []).length,
	    });
	  } catch (err) {
	    console.error("Error fetching stats:", err);
	    setError(err instanceof Error ? err.message : "Failed to fetch statistics");
	  } finally {
	    setLoading(false);
	  }
	};

	if (loading) {
		return (
			<div className="animate-pulse">
				<div className="h-8 w-48 bg-gray-200 rounded mb-6" />
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-32 bg-gray-100 rounded-lg" />
					))}
				</div>
				<div className="bg-white rounded-lg shadow">
					<div className="h-96 bg-gray-50" />
				</div>
			</div>
		);
	}

	if (error) {
		return <div className="text-red-500">{error}</div>;
	}

	return (
		<div>
			{!isStripeConnected && (
				<div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
					<div className="flex items-start">
						<AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
						<div>
							<h3 className="text-sm font-medium text-yellow-800">
								Stripe Account Not Connected
							</h3>
							<p className="mt-1 text-sm text-yellow-700">
								You need to connect your Stripe account to start creating Stripe invoices and accepting
								Stripe payments. This ensures secure payment
								processing and automatic transfers to your bank account. You can still accept manual BACS payments. Click below to set up Stripe or update your Bank Account details.
							</p>
							<div className="mt-3">
								<button
									onClick={() => navigate("/dashboard/studio")}
									className="inline-flex items-center px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-sm font-medium rounded-lg transition-colors duration-200"
								>
									<CreditCard className="w-4 h-4 mr-2" />
									Go to Studio Info
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			<h1 className="text-2xl font-bold text-brand-primary mb-6">
				Payments Overview
			</h1>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				<StatsCard
					title="Total Revenue"
					value={formatCurrency(stats.totalRevenue, currency)}
					icon={DollarSign}
					trend={`${
						payments.length > 0
							? "+" + formatCurrency(payments[0].amount, currency)
							: "0"
					}`}
					description="this month" // UPDATED: Changed from "latest payment" to clarify it's current month
				/>
				<StatsCard
					title="Outstanding Balance"
					value={formatCurrency(stats.outstandingBalance, currency)}
					icon={TrendingUp}
					trend={`${stats.outstandingCount} invoices`}
					description="this month" // UPDATED: Added to clarify it's current month
				/>
				<StatsCard
					title="Overdue Payments"
					value={formatCurrency(stats.overdueAmount, currency)}
					icon={AlertCircle}
					trend={`${stats.overdueCount} invoices`}
					description="this month" // UPDATED: Added to clarify it's current month
				/>
			</div>

			<div className="bg-white rounded-lg shadow">
				<div className="px-6 py-4 border-b">
					<h2 className="text-lg font-semibold text-brand-primary">
						Recent Transactions
					</h2>
				</div>
				<div className="p-6">
					{payments.length === 0 ? (
						<p className="text-center text-gray-500 py-4">
							No transactions found
						</p>
					) : (
						<div className="space-y-4">
							{payments.map((payment) => (
								<div
									key={payment.id}
									className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
								>
									<div className="flex items-center">
										<CreditCard className="w-5 h-5 text-brand-primary mr-3" />
										<div>
											<p className="font-medium">
												Invoice-{payment.invoice?.index} -{" "}
												{payment.invoice?.parent.name}
											</p>
											<div className="flex items-center space-x-2 text-sm text-gray-500">
												<span>
													{formatDate(payment.payment_date, dateFormat)}
												</span>
												{payment.is_recurring && (
													<span className="text-blue-600">
														↻ Recurring{" "}
														{payment.recurring_interval?.toLowerCase()}
													</span>
												)}
											</div>
										</div>
									</div>
									<div className="text-right">
									  <p className="font-medium">
									    {formatCurrency(payment.amount, currency)}
									  </p>
									  {payment.discount_amount > 0 && (
									    <p className="text-xs text-gray-500">
									      Original: {formatCurrency(payment.original_amount || 0, currency)}
									      <span className="ml-1 text-green-600">
									        (-{formatCurrency(payment.discount_amount, currency)})
									      </span>
									    </p>
									  )}
									  <p className={`text-sm ${
									    payment.status === "completed"
									      ? "text-green-600"
									      : payment.status === "refunded"
									      ? "text-orange-600" 
									      : "text-gray-500"
									  }`}>
									    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
									  </p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
