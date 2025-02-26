import React, { useState } from "react";
import { X } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
	Elements,
	CardElement,
	useStripe,
	useElements,
} from "@stripe/react-stripe-js";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../utils/formatters";
import { useLocalization } from "../../contexts/LocalizationContext";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

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

// Payment Form Component
const PaymentForm = ({
	invoice,
	onSuccess,
	onClose,
}: ProcessPaymentModalProps) => {
	const stripe = useStripe();
	const elements = useElements();
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

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!stripe || !elements) {
			setError("Stripe has not been initialized");
			return;
		}

		const cardElement = elements.getElement(CardElement);
		if (!cardElement) {
			setError("Card element not found");
			return;
		}

		setProcessing(true);
		setError(null);

		try {
			// We're now using the existing Stripe invoice, so we just need to pay it
			// First, check if the invoice has a Stripe invoice ID
			if (!invoice.stripe_invoice_id) {
				throw new Error(
					"This invoice doesn't have an associated Stripe invoice"
				);
			}

			// Create a payment method
			const { error: pmError, paymentMethod } =
				await stripe.createPaymentMethod({
					type: "card",
					card: cardElement,
					billing_details: {
						email: invoice.parent?.email,
						name: invoice.parent?.name,
					},
				});

			if (pmError) {
				throw pmError;
			}

			// Pay the invoice
			const { data: paymentResult, error: payError } =
				await supabase.functions.invoke("pay-stripe-invoice", {
					body: {
						invoiceId: invoice.id,
						stripeInvoiceId: invoice.stripe_invoice_id,
						paymentMethodId: paymentMethod.id,
						isRecurring: invoice.is_recurring,
					},
				});

			if (payError) {
				throw new Error(payError.message || "Failed to process payment");
			}

			// Save payment details
			const { error: paymentError } = await supabase.from("payments").insert({
				invoice_id: invoice.id,
				amount: finalAmount,
				original_amount: invoice.total,
				discount_amount:
					invoice.discount_value > 0
						? invoice.discount_type === "percentage"
							? invoice.total * (invoice.discount_value / 100)
							: invoice.discount_value
						: null,
				is_recurring: invoice.is_recurring,
				recurring_interval: invoice.is_recurring
					? invoice.recurring_interval
					: "",
				payment_method: "card",
				status: "completed",
				transaction_id: paymentResult.payment_intent_id,
				payment_date: new Date().toISOString(),
			});

			if (paymentError) {
				console.error("Error saving payment:", paymentError);
				throw new Error("Payment processed but failed to save payment record");
			}

			// Update invoice status
			const { error: updateError } = await supabase
				.from("invoices")
				.update({ status: "paid" })
				.eq("id", invoice.id);

			if (updateError) {
				console.error("Error updating invoice status:", updateError);
			}

			onSuccess();
		} catch (err) {
			console.error("Payment error:", err);
			setError(
				err instanceof Error
					? err.message
					: "An error occurred while processing your payment"
			);
		} finally {
			setProcessing(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
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

			<div>
				<label className="block text-sm font-medium text-brand-secondary-400 mb-2">
					Card Details
				</label>
				<div className="p-3 border rounded-md">
					<CardElement
						options={{
							style: {
								base: {
									fontSize: "16px",
									color: "#424770",
									"::placeholder": {
										color: "#aab7c4",
									},
								},
								invalid: {
									color: "#9e2146",
								},
							},
							hidePostalCode: true,
						}}
					/>
				</div>
			</div>

			{error && (
				<div className="text-red-500 text-sm bg-red-50 p-3 rounded-md">
					{error}
				</div>
			)}

			<div className="flex justify-between items-center pt-4">
				<div className="space-y-1">
					<p className="text-sm text-brand-secondary-400">Amount to Pay</p>
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
						type="submit"
						disabled={!stripe || processing}
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
							"Pay Now"
						)}
					</button>
				</div>
			</div>
		</form>
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
						<Elements stripe={stripePromise}>
							<PaymentForm
								invoice={invoice}
								onSuccess={onSuccess}
								onClose={onClose}
							/>
						</Elements>
					</div>
				</div>
			</div>
		</>
	);
}
