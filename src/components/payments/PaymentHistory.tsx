import React, { useState, useEffect } from "react";
import { CreditCard, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLocalization } from "../../contexts/LocalizationContext";
import { formatCurrency } from "../../utils/formatters";
import RefundModal from "./RefundModal";

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
		studio_id: string;
	};
	refunds: {
		id: string;
		amount: number;
		status: string;
		reason: string;
		refund_date: string;
	}[];
}

interface PaymentHistoryProps {
	invoiceId: string;
	onRefresh: () => void;
}

export default function PaymentHistory({
	invoiceId,
	onRefresh,
}: PaymentHistoryProps) {
	const { currency } = useLocalization();
	const [payments, setPayments] = useState<Payment[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

	useEffect(() => {
		fetchPayments();
	}, [invoiceId]);

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
					stripe_payment_intent_id,
					payment_date,
					invoice:invoices!payments_invoice_id_fkey (
						id,
						studio_id
					),
					refunds (
						id,
						amount,
						status,
						reason,
						refund_date
					)
					`
				)
				.eq("invoice_id", invoiceId)
				.order("payment_date", { ascending: false });

			if (fetchError) throw fetchError;
			setPayments(data || []);
		} catch (err) {
			console.error("Error fetching payments:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch payments");
		} finally {
			setLoading(false);
		}
	};

	const formatPaymentMethod = (method: string) => {
		return method
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	if (loading) {
		return (
			<div className="animate-pulse space-y-4">
				{[1, 2].map((i) => (
					<div key={i} className="h-20 bg-gray-100 rounded-lg" />
				))}
			</div>
		);
	}

	if (error) {
		return <div className="text-red-500">{error}</div>;
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-medium text-brand-primary">
					Payment History
				</h3>
				<button
					onClick={fetchPayments}
					className="p-1 text-gray-400 hover:text-brand-primary rounded-full hover:bg-gray-100"
					title="Refresh payments"
				>
					<RefreshCw className="w-5 h-5" />
				</button>
			</div>

			{payments.length === 0 ? (
				<p className="text-center text-gray-500 py-4">No payments recorded</p>
			) : (
				<div className="space-y-4">
					{payments.map((payment) => (
						<div key={payment.id} className="bg-gray-50 rounded-lg p-4">
							<div className="flex justify-between items-start mb-2">
								<div className="flex items-center">
									<CreditCard className="w-5 h-5 text-brand-primary mr-2" />
									<div>
										<div className="flex items-center gap-2">
											<p className="font-medium">
												{formatCurrency(payment.amount, currency)}
											</p>
											{payment.is_recurring && (
												<span className="text-xs text-blue-600">
													↻ Recurring
												</span>
											)}
										</div>
										<p className="text-sm text-gray-500">
											{new Date(payment.payment_date).toLocaleDateString()}
											{payment.recurring_interval && (
												<span className="text-blue-600 ml-2">
													({payment.recurring_interval.toLowerCase()})
												</span>
											)}
										</p>
									</div>
								</div>
								<div className="text-right">
									<p className="font-medium">
										{formatCurrency(payment.amount, currency)}
									</p>
									{payment.discount_amount && payment.discount_amount > 0 && (
										<p className="text-xs text-gray-500">
											Original:{" "}
											{formatCurrency(payment.original_amount || 0, currency)}
											{payment.discount_amount > 0 && (
												<span className="ml-1 text-green-600">
													(-{formatCurrency(payment.discount_amount, currency)})
												</span>
											)}
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

							{payment.transaction_id && (
								<p className="text-sm text-gray-500 mb-2">
									Transaction ID: {payment.stripe_payment_intent_id}
								</p>
							)}

							{payment.refunds && payment.refunds.length > 0 && (
								<div className="mt-3 pt-3 border-t">
									<p className="text-sm font-medium text-brand-secondary-400 mb-2">
										Refunds
									</p>
									<div className="space-y-2">
										{payment.refunds.map((refund) => (
											<div
												key={refund.id}
												className="flex justify-between text-sm"
											>
												<div>
													<p className="text-gray-600">{refund.reason}</p>
													<p className="text-gray-500">
														{new Date(refund.refund_date).toLocaleDateString()}
													</p>
												</div>
												<div className="text-right">
													<p className="font-medium text-red-600">
														-{formatCurrency(refund.amount, currency)}
													</p>
													<p className="text-gray-500">
														{refund.status.charAt(0).toUpperCase() +
															refund.status.slice(1)}
													</p>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{payment.status === "completed" && (
								<button
									onClick={() => setSelectedPayment(payment)}
									className="mt-3 text-sm text-brand-primary hover:text-brand-secondary-400"
								>
									Issue Refund
								</button>
							)}
						</div>
					))}
				</div>
			)}

			{selectedPayment && (
				<RefundModal
					payment={selectedPayment}
					onClose={() => setSelectedPayment(null)}
					onSuccess={() => {
						setSelectedPayment(null);
						fetchPayments();
						onRefresh();
					}}
				/>
			)}
		</div>
	);
}
