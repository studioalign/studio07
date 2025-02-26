import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp, AlertCircle, CreditCard } from "lucide-react";
import { supabase } from "../../lib/supabase";
import StatsCard from "../dashboard/StatsCard";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { useLocalization } from "../../contexts/LocalizationContext";

interface Payment {
	id: string;
	amount: number;
	original_amount?: number;
	discount_amount?: number;
	is_recurring: boolean;
	recurring_interval?: string;
	payment_method: string;
	status: string;
	transaction_id: string | null;
	payment_date: string;
	invoice: {
		id: string;
		number: string;
		parent: {
			name: string;
		};
	};
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
	const [payments, setPayments] = useState<Payment[]>([]);
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
		fetchPayments();
		fetchStats();
	}, []);

	const fetchPayments = async () => {
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
          invoice:invoices (
            id,
            parent:users!invoices_parent_id_fkey (
              name
            )
          )
        `
				)
				.order("payment_date", { ascending: false })
				.limit(10);

			if (fetchError) throw fetchError;
			setPayments(data || []);
		} catch (err) {
			console.error("Error fetching payments:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch payments");
		}
	};

	const fetchStats = async () => {
		try {
			// Get total revenue from completed payments
			const { data: revenueData, error: revenueError } = await supabase
				.from("payments")
				.select("amount")
				.eq("status", "completed");

			if (revenueError) throw revenueError;

			// Get outstanding invoices (sent but not paid)
			const { data: pendingData, error: pendingError } = await supabase
				.from("invoices")
				.select("total")
				.eq("status", "pending");

			if (pendingError) throw pendingError;

			// Get overdue invoices
			const { data: overdueData, error: overdueError } = await supabase
				.from("invoices")
				.select("total")
				.eq("status", "overdue");

			if (overdueError) throw overdueError;

			const totalRevenue =
				revenueData?.reduce((sum, p) => sum + p.amount, 0) || 0;
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
												Invoice #{payment.invoice.id} -{" "}
												{payment.invoice.parent.name}
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
										{payment.original_amount &&
										payment.original_amount > payment.amount ? (
											<>
												<p className="text-sm text-gray-500 line-through">
													{formatCurrency(payment.original_amount, currency)}
												</p>
												<p className="font-medium">
													{formatCurrency(payment.amount, currency)}
													{payment.discount_amount && (
														<span className="text-xs text-green-600 ml-1">
															(
															{formatCurrency(
																payment.discount_amount,
																currency
															)}{" "}
															off)
														</span>
													)}
												</p>
											</>
										) : (
											<p className="font-medium">
												{formatCurrency(payment.amount, currency)}
											</p>
										)}
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
