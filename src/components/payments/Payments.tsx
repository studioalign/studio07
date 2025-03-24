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
	transaction_id: string | null;
	payment_date: string;
	invoice: {
		id: string;
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
          transaction_id,
          payment_date,
          invoice:invoices!payments_invoice_id_fkey (
            id,
            studio_id,
            parent:users!invoices_parent_id_fkey (
              name
            )
          )
        `
				)
				.order("payment_date", { ascending: false })
				.limit(10);

			if (fetchError) throw fetchError;

			// Filter out any payments with null invoice or mismatched studio_id
			const filteredPayments = (data || []).filter(
				(payment) => payment.invoice && payment.invoice.studio_id === studioId
			);
			setPayments(filteredPayments as Payment[]);
		} catch (err) {
			console.error("Error fetching payments:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch payments");
		}
	};

	const fetchStats = async (studioId: string) => {
	    try {
	        // Get total revenue from completed payments for this studio
	        const { data: revenueData, error: revenueError } = await supabase
	            .from("payments")
	            .select(
	                `
	                id,
	                amount, 
	                original_amount,
	                discount_amount,
	                invoice:invoices!payments_invoice_id_fkey (
	                    id,
	                    studio_id,
	                    total,
	                    discount_type,
	                    discount_value
	                )
	                `
	            )
	            .eq("status", "completed");
	
	        if (revenueError) throw revenueError;
	
	        console.log("Raw Revenue Data:", JSON.stringify(revenueData, null, 2));
	
	        // Filter out payments where invoice is null or studio_id doesn't match
	        const filteredRevenueData = (revenueData || []).filter(
	            (p) => p.invoice && p.invoice.studio_id === studioId
	        );
	
	        console.log("Filtered Revenue Data:", JSON.stringify(filteredRevenueData, null, 2));
	
	        const totalRevenue =
	            filteredRevenueData.reduce((sum, p) => sum + p.amount, 0) || 0;
	
	        console.log("Total Revenue Calculation:", {
	            totalRevenue,
	            payments: filteredRevenueData.map(p => ({
	                id: p.id,
	                amount: p.amount,
	                originalAmount: p.original_amount,
	                discountAmount: p.discount_amount,
	                invoiceTotal: p.invoice?.total,
	                discountType: p.invoice?.discount_type,
	                discountValue: p.invoice?.discount_value
	            }))
	        });
			const outstandingBalance =
				pendingData?.reduce((sum, i) => sum + i.total, 0) || 0;
			const overdueAmount =
				overdueData?.reduce((sum, i) => sum + i.total, 0) || 0;

			setStats({
				totalRevenue,
				outstandingBalance,
				outstandingCount: pendingData?.length || 0,
				overdueAmount,
				overdueCount: overdueData?.length || 0,
			});
		} catch (err) {
			console.error("Error fetching stats:", err);
			setError(
				err instanceof Error ? err.message : "Failed to fetch statistics"
			);
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
								You need to connect your Stripe account to start accepting
								payments and creating invoices. This ensures secure payment
								processing and automatic transfers to your bank account.
							</p>
							<div className="mt-3">
								<button
									onClick={() => navigate("/dashboard/payment-settings")}
									className="inline-flex items-center px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-sm font-medium rounded-lg transition-colors duration-200"
								>
									<CreditCard className="w-4 h-4 mr-2" />
									Go to Payment Settings
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
					description="latest payment"
				/>
				<StatsCard
					title="Outstanding Balance"
					value={formatCurrency(stats.outstandingBalance, currency)}
					icon={TrendingUp}
					trend={`${stats.outstandingCount} invoices`}
					description="pending payment"
				/>
				<StatsCard
					title="Overdue Payments"
					value={formatCurrency(stats.overdueAmount, currency)}
					icon={AlertCircle}
					trend={`${stats.overdueCount} invoices`}
					description="overdue"
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
												Invoice #{payment.invoice?.id} -{" "}
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
										{/* FIX: Don't show discount information in the payment view since 
                                     the amount already reflects the discount from the invoice */}
										<p className="font-medium">
											{formatCurrency(payment.amount, currency)}
										</p>
										<p
											className={`text-sm ${
												payment.status === "completed"
													? "text-green-600"
													: payment.status === "refunded"
													? "text-orange-600"
													: "text-gray-500"
											}`}
										>
											{payment.status.charAt(0).toUpperCase() +
												payment.status.slice(1)}
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
