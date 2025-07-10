import React, { useState } from "react";
import { X } from "lucide-react";
import { useLocalization } from "../../contexts/LocalizationContext";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../utils/formatters";
import FormInput from "../FormInput";
import { notificationService } from "../../services/notificationService";

interface Payment {
	id: string;
	amount: number;
	stripe_payment_intent_id?: string;
	invoice: {
		id: string;
		studio_id: string;
	};
	refunds?: {
		amount: number;
	}[];
}

interface RefundModalProps {
	payment: Payment;
	onClose: () => void;
	onSuccess: () => void;
}

export default function RefundModal({
	payment,
	onClose,
	onSuccess,
}: RefundModalProps) {
	const { currency } = useLocalization();
	const [amount, setAmount] = useState("");
	const [reason, setReason] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const totalRefunded =
		payment.refunds?.reduce((sum, refund) => sum + refund.amount, 0) || 0;
	const maxRefund = payment.amount - totalRefunded;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);

		try {
			const refundAmount = parseFloat(amount);
			if (isNaN(refundAmount) || refundAmount <= 0) {
				throw new Error("Please enter a valid amount");
			}

			if (refundAmount > maxRefund) {
				throw new Error(
					"Refund amount cannot exceed the remaining payment amount"
				);
			}

			const isFullRefund = refundAmount >= maxRefund;
			const isBACSPayment = !payment.stripe_payment_intent_id;

			if (isBACSPayment) {
			  // For BACS payments, create refund record as COMPLETED
			  // The database trigger will automatically update the payment status
			  const { error: refundError } = await supabase.from("refunds").insert([
			    {
			      payment_id: payment.id,
			      amount: refundAmount,
			      reason,
			      status: "completed", // This will trigger the database function
			      refund_method: "bank_transfer",
			      refund_date: new Date().toISOString(),
			    },
			  ]);
			
			  if (refundError) throw refundError;
			
			  // Update invoice status to 'refunded' if fully refunded
			  if (isFullRefund) {
			    console.log("Updating BACS invoice status to refunded");
			    const { error: invoiceUpdateError } = await supabase
			      .from("invoices")
			      .update({ status: "refunded" })
			      .eq("id", payment.invoice.id);
			
			    if (invoiceUpdateError) {
			      console.error("Error updating BACS invoice status:", invoiceUpdateError);
			      throw invoiceUpdateError;
			    }
			  }

				// Send notification
				try {
					const { data: invoiceData, error: invoiceError } = await supabase
						.from("invoices")
						.select("parent_id, manual_payment_reference, index")
						.eq("id", payment.invoice.id)
						.single();

					if (!invoiceError && invoiceData) {
						const invoiceReference = invoiceData.manual_payment_reference || `Invoice-${invoiceData.index}`;
						
						await notificationService.notifyRefundPending(
							invoiceData.parent_id,
							payment.invoice.studio_id,
							refundAmount,
							currency,
							invoiceReference,
							reason,
							"bank_transfer",
							payment.id
						);
					}
				} catch (notificationError) {
					console.warn("Failed to send refund notification:", notificationError);
				}

				onSuccess();
			} else {
				// For Stripe payments, process through enhanced edge function
				const { data: response, error: functionError } =
					await supabase.functions.invoke("process-refund", {
						body: {
							paymentId: payment.stripe_payment_intent_id,
							amount: Math.round(refundAmount * 100),
							reason,
							studioId: payment.invoice.studio_id,
							// ADDED: Pass additional info for status updates
							paymentDbId: payment.id,
							invoiceId: payment.invoice.id,
							isFullRefund: isFullRefund,
						},
					});

				if (functionError || !response?.success) {
					throw new Error(
						functionError?.message ||
							response?.error ||
							"Failed to process refund"
					);
				}

				// Create refund record in database for Stripe
				const { error: refundError } = await supabase.from("refunds").insert([
					{
						payment_id: payment.id,
						amount: refundAmount,
						reason,
						status: "completed",
						stripe_refund_id: response.refundId,
						refund_method: "stripe",
						refund_date: new Date().toISOString(),
					},
				]);

				if (refundError) throw refundError;

				// FIXED: The edge function should handle these, but let's ensure they happen
				if (isFullRefund) {
					// Update payment status
					const { error: updateError } = await supabase
						.from("payments")
						.update({ status: "refunded" })
						.eq("id", payment.id);

					if (updateError) {
						console.error("Error updating payment status:", updateError);
					}

					// Update invoice status
					const { error: invoiceUpdateError } = await supabase
						.from("invoices")
						.update({ status: "refunded" })
						.eq("id", payment.invoice.id);

					if (invoiceUpdateError) {
						console.error("Error updating invoice status:", invoiceUpdateError);
					}
				}

				// Send notification for Stripe refund
				try {
					const { data: invoiceData, error: invoiceError } = await supabase
						.from("invoices")
						.select("parent_id, manual_payment_reference, index")
						.eq("id", payment.invoice.id)
						.single();

					if (!invoiceError && invoiceData) {
						const invoiceReference = invoiceData.manual_payment_reference || `Invoice-${invoiceData.index}`;
						
						await notificationService.notifyRefundPending(
							invoiceData.parent_id,
							payment.invoice.studio_id,
							refundAmount,
							currency,
							invoiceReference,
							reason,
							"stripe",
							payment.id
						);
					}
				} catch (notificationError) {
					console.warn("Failed to send refund notification:", notificationError);
				}

				onSuccess();
			}
		} catch (err) {
			console.error("Error processing refund:", err);
			setError(err instanceof Error ? err.message : "Failed to process refund");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-full max-w-md">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-semibold text-brand-primary">
						Issue Refund
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600"
					>
						<X className="w-6 h-6" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<p className="text-sm text-brand-secondary-400">Original Payment</p>
						<p className="font-medium">
							{formatCurrency(payment.amount, currency)}
						</p>
					</div>

					{totalRefunded > 0 && (
						<div>
							<p className="text-sm text-brand-secondary-400">
								Already Refunded
							</p>
							<p className="font-medium text-red-600">
								{formatCurrency(totalRefunded, currency)}
							</p>
						</div>
					)}

					<div>
						<p className="text-sm text-brand-secondary-400">Maximum Refund</p>
						<p className="font-medium">{formatCurrency(maxRefund, currency)}</p>
					</div>

					<FormInput
						id="amount"
						type="number"
						label="Refund Amount"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						min="0"
						max={maxRefund.toString()}
						step="0.01"
						required
					/>

					<div>
						<label
							htmlFor="reason"
							className="block text-sm font-medium text-brand-secondary-400"
						>
							Reason for Refund
						</label>
						<textarea
							id="reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							rows={3}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
							required
						/>
						<p className="text-xs text-gray-600">
							Reason must be one of duplicate, fraudulent, or
							requested_by_customer
						</p>
					</div>

					{!payment.stripe_payment_intent_id && (
						<div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
							<h4 className="font-medium text-blue-800 mb-2">Bank Transfer Refund</h4>
							<p className="text-sm text-blue-700">
								Since this was a bank transfer payment, you will need to manually transfer the refund amount back to the customer's bank account. 
								The customer will be notified via email and in-app notification about the refund.
							</p>
						</div>
					)}

					{error && <p className="text-red-500 text-sm">{error}</p>}

					<div className="flex justify-end space-x-3 pt-4">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
						>
							{isSubmitting ? "Processing..." : "Process Refund"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
