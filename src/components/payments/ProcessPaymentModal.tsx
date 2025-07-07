import React, { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../utils/formatters";
import { useLocalization } from "../../contexts/LocalizationContext";
import { getStudioPaymentMethods } from "../../utils/studioUtils";
import { useAuth } from "../../contexts/AuthContext";
import { Building2 } from "lucide-react";

// We no longer need the Stripe SDK for this component
// since we're using Stripe's hosted invoice URL directly

interface Invoice {
	id: string;
	index: number;
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
	payment_method?: 'stripe' | 'bacs';
}

interface ProcessPaymentModalProps {
	invoice: Invoice;
	onClose: () => void;
	onSuccess: () => void;
}

// Checkout Component
const CheckoutForm = ({ invoice, onClose }: ProcessPaymentModalProps) => {
	const { profile } = useAuth();
	const [error, setError] = useState<string | null>(null);
	const [processing, setProcessing] = useState(false);
	const { currency } = useLocalization();
	
	// Get studio payment methods
	const studioPaymentMethods = profile?.studio ? 
		getStudioPaymentMethods(profile.studio) : 
		{ stripe: true, bacs: false };
	
	// If invoice is BACS or studio doesn't accept Stripe, show message
	if (invoice.payment_method === 'bacs' || !studioPaymentMethods.stripe) {
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
									Bank Transfer Required
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
							<div className="p-4 bg-blue-50 rounded-lg mb-6">
								<h3 className="font-medium text-blue-800 mb-2">This invoice requires bank transfer payment</h3>
								<p className="text-sm text-blue-700">
									Please make payment via bank transfer using the following details:
								</p>
								
								<div className="mt-4 p-4 bg-white rounded-md">
									<p className="mb-2"><strong>Amount:</strong> {formatCurrency(invoice.total, currency)}</p>
									<p className="mb-2"><strong>Reference:</strong> Invoice-{invoice.id.substring(0, 8)}</p>
									<p className="mb-2"><strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString()}</p>
									
									{/* Add bank details if available */}
									<p className="text-sm text-gray-500 mt-4">
										Please contact the studio for their bank account details if not provided.
									</p>
								</div>
							</div>
							
							<p className="text-sm text-gray-600">
								Once you've made the payment, the studio will mark your invoice as paid in the system.
								You'll receive a confirmation email when this happens.
							</p>
							
							<button
								onClick={onClose}
								className="w-full mt-6 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</>
		);
	}
	// Get studio payment methods
	const studioPaymentMethods = profile?.studio ? 
		getStudioPaymentMethods(profile.studio) : 
		{ stripe: true, bacs: false };
	
	// If invoice is BACS or studio doesn't accept Stripe, show message
	if (invoice.payment_method === 'bacs' || !studioPaymentMethods.stripe) {
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
									Bank Transfer Required
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
							<div className="p-4 bg-blue-50 rounded-lg mb-6">
								<h3 className="font-medium text-blue-800 mb-2">This invoice requires bank transfer payment</h3>
								<p className="text-sm text-blue-700">
									Please make payment via bank transfer using the following details:
								</p>
								
								<div className="mt-4 p-4 bg-white rounded-md">
									<p className="mb-2"><strong>Amount:</strong> {formatCurrency(invoice.total, currency)}</p>
									<p className="mb-2"><strong>Reference:</strong> Invoice-{invoice.id.substring(0, 8)}</p>
									<p className="mb-2"><strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString()}</p>
									
									{/* Add bank details if available */}
									<p className="text-sm text-gray-500 mt-4">
										Please contact the studio for their bank account details if not provided.
									</p>
								</div>
							</div>
							
							<p className="text-sm text-gray-600">
								Once you've made the payment, the studio will mark your invoice as paid in the system.
								You'll receive a confirmation email when this happens.
							</p>
							
							<button
								onClick={onClose}
								className="w-full mt-6 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</>
		);
	}

	const calculateDiscountedAmount = () => {
		return invoice.total; // Use the total as-is from the database
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
						<div className="space-y-1">
							<span className="text-sm text-green-600">
								{invoice.discount_type === "percentage"
									? `${invoice.discount_value}% off`
									: `${formatCurrency(invoice.discount_value, currency)} off`}
								{invoice.discount_reason && ` - ${invoice.discount_reason}`}
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
