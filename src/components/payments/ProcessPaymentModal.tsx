import React, { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../utils/formatters";
import { useLocalization } from "../../contexts/LocalizationContext";

// We no longer need the Stripe SDK for this component
// since we're using Stripe's hosted invoice URL directly

interface Invoice {
	id: string;
	status: string;
	due_date: string;
	subtotal: number;
	tax: number;
	total: number;
	is_recurring: boolean;
	recurring_interval: string;
	recurring_end_date: string;
	discount_type: string;
	discount_value: number;
	discount_reason: string;
	pdf_url?: string;
	parent?: {
		email?: string;
		name?: string;
	};
	created_at: string;
	stripe_invoice_id?: string;
}

interface ProcessPaymentModalProps {
	invoice: Invoice;
	onClose: () => void;
	onSuccess: () => void;
}

// Checkout Component
const CheckoutForm = ({ invoice, onClose }: ProcessPaymentModalProps) => {
	const [error, setError] = useState<string | null>(null);
	const [processing, setProcessing] = useState(false);
	const { currency } = useLocalization();

	const calculateDiscountedAmount = () => {
		if (!invoice.discount_value) return invoice.total;

		if (invoice.discount_type === "percentage") {
			return invoice.total * (1 - invoice.discount_value / 100);
		} else if (invoice.discount_type === "fixed") {
			return invoice.total - invoice.discount_value;
		}
		return invoice.total;
	};

	const finalAmount = calculateDiscountedAmount();

	const handleCheckout = async () => {
		setProcessing(true);
		setError(null);

		try {
			if (!invoice.stripe_invoice_id) {
				throw new Error(
					"This invoice doesn't have an associated Stripe invoice"
				);
			}

			// Get the hosted invoice URL for direct payment
			const { data: sessionData, error: sessionError } =
				await supabase.functions.invoke("create-checkout-session", {
					body: {
						invoiceId: invoice.id,
						stripeInvoiceId: invoice.stripe_invoice_id,
						isRecurring: invoice.is_recurring,
						successUrl: `${window.location.origin}/dashboard/payment-success?invoice_id=${invoice.id}`,
					},
				});

			if (sessionError) {
				throw new Error(
					sessionError.message || "Failed to get invoice payment URL"
				);
			}

			// Check if we received a URL for payment
			if (sessionData.url) {
				// Redirect to the invoice payment page
				window.location.href = sessionData.url;
				return;
			} else {
				throw new Error("No payment URL was returned");
			}
		} catch (err) {
			console.error("Payment error:", err);
			setError(
				err instanceof Error
					? err.message
					: "An error occurred while preparing the invoice payment"
			);
			setProcessing(false);
		}
	};

	return (
		<div className="space-y-6">
			{invoice.is_recurring && (
				<div className="bg-blue-50 p-4 rounded-md mb-4">
					<h3 className="text-sm font-medium text-blue-800">
						Recurring Payment
					</h3>
					<p className="text-sm text-blue-600 mt-1">
						This payment will recur {invoice.recurring_interval.toLowerCase()}{" "}
						until {new Date(invoice.recurring_end_date).toLocaleDateString()}
					</p>
				</div>
			)}

			<div className="p-4 bg-gray-50 rounded-md">
				<p className="text-sm text-brand-secondary-400 mb-2">Payment Summary</p>
				<div className="space-y-2">
					<p className="text-sm text-gray-700 font-medium">
						Invoice #{invoice.stripe_invoice_id?.slice(-6) || "N/A"}
					</p>
					{invoice.discount_value > 0 && (
						<div className="flex items-center space-x-2">
							<p className="text-sm text-gray-500 line-through">
								{formatCurrency(invoice.total, currency)}
							</p>
							<span className="text-sm text-green-600">
								{invoice.discount_type === "percentage"
									? `${invoice.discount_value}% off`
									: `${formatCurrency(invoice.discount_value, currency)} off`}
							</span>
						</div>
					)}
					<p className="text-xl font-bold text-brand-primary">
						{formatCurrency(finalAmount, currency)}
					</p>
					{invoice.discount_reason && (
						<p className="text-sm text-gray-500">
							Reason: {invoice.discount_reason}
						</p>
					)}
				</div>
			</div>

			<p className="text-sm text-gray-600">
				This will take you to Stripe's secure payment page to complete the
				payment for invoice #{invoice.stripe_invoice_id?.slice(-6) || "N/A"}.
				The invoice will be marked as paid once the payment is completed.
			</p>

			{error && (
				<div className="text-red-500 text-sm bg-red-50 p-3 rounded-md">
					{error}
				</div>
			)}

			<div className="flex justify-between items-center pt-4">
				<div className="space-y-1">
					<p className="text-sm text-brand-secondary-400">Amount to Pay</p>
					<p className="text-xl font-bold text-brand-primary">
						{formatCurrency(finalAmount, currency)}
					</p>
				</div>

				<div className="flex space-x-3">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
						disabled={processing}
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleCheckout}
						disabled={processing}
						className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						{processing ? (
							<span className="flex items-center">
								<svg
									className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Processing...
							</span>
						) : (
							"Pay Invoice"
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

export default function ProcessPaymentModal({
	invoice,
	onClose,
	onSuccess,
}: ProcessPaymentModalProps) {
	return (
		<>
			<div
				className="fixed inset-0 bg-black bg-opacity-25 transition-opacity z-40"
				onClick={onClose}
			/>
			<div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out translate-x-0 z-50">
				<div className="flex flex-col h-full">
					<div className="flex-none px-6 py-4 border-b">
						<div className="flex justify-between items-center">
							<h2 className="text-xl font-semibold text-brand-primary">
								Process Payment
							</h2>
							<button
								onClick={onClose}
								className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
							>
								<X className="w-6 h-6" />
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-6">
						<CheckoutForm
							invoice={invoice}
							onSuccess={onSuccess}
							onClose={onClose}
						/>
					</div>
				</div>
			</div>
		</>
	);
}
