// COMPLETE FIX for src/components/payments/InvoiceDetail.tsx
// This fixes the null student issue for multi-parent invoices

import React, { useEffect, useRef, useState } from "react";
import { Edit2, Download, Building2, CreditCard, CheckCircle } from "lucide-react";
import PaymentHistory from "./PaymentHistory";
import { formatCurrency } from "../../utils/formatters";
import { useLocalization } from "../../contexts/LocalizationContext";
import { notificationService } from "../../services/notificationService";
import { useAuth } from "../../contexts/AuthContext";
import { markBacsInvoiceAsPaid } from "../../utils/studioUtils";

interface InvoiceItem {
	id: string;
	description: string;
	quantity: number;
	unit_price: number;
	subtotal: number;
	total: number;
	type: string;
	student: {
		name: string;
	} | null; // FIXED: Allow student to be null for multi-parent invoices
}

interface Invoice {
	id: string;
	index: number;
	number: string;
	status: string;
	due_date: string;
	subtotal: number;
	tax: number;
	total: number;
	notes: string | null;
	is_recurring: boolean;
	recurring_interval: string;
	recurring_end_date: string;
	discount_type: string;
	discount_value: number;
	discount_reason: string;
	pdf_url?: string;
	payment_method?: 'stripe' | 'bacs';
	manual_payment_status?: 'pending' | 'paid' | 'overdue';
	manual_payment_date?: string;
	manual_payment_reference?: string;
	parent: {
		id?: string;
		name: string;
		email: string;
	} | null;
	items: InvoiceItem[];
	studio_id?: string;
}

interface InvoiceDetailProps {
	invoice: Invoice;
	onEdit: () => void;
	onRefresh: () => void;
}

export default function InvoiceDetail({
	invoice,
	onEdit,
	onRefresh,
}: InvoiceDetailProps) {
	const { currency } = useLocalization();
	const { profile } = useAuth();
	const previousStatusRef = useRef(invoice.status);
	const [paymentReference, setPaymentReference] = useState('');
	const [isMarkingPaid, setIsMarkingPaid] = useState(false);
	const [markPaidSuccess, setMarkPaidSuccess] = useState(false);
	const [markPaidError, setMarkPaidError] = useState<string | null>(null);

	// Check if user is studio owner
	const isOwner = profile?.role === 'owner';

	// Safe parent access with fallbacks
	const parentName = invoice.parent?.name || "Unknown Parent";
	const parentEmail = invoice.parent?.email || "N/A";
	const parentId = invoice.parent?.id;

	// Handle marking BACS invoice as paid
	const handleMarkAsPaid = async () => {
		setIsMarkingPaid(true);
		setMarkPaidError(null);

		try {
			const result = await markBacsInvoiceAsPaid(invoice.id, paymentReference);
			
			if (result.success) {
				setMarkPaidSuccess(true);
				onRefresh();
			} else {
				setMarkPaidError(result.error || 'Failed to mark invoice as paid');
			}
		} catch (err) {
			setMarkPaidError(err instanceof Error ? err.message : 'An unexpected error occurred');
		} finally {
			setIsMarkingPaid(false);
		}
	};

	// Send notifications when invoice status changes to "paid"
	useEffect(() => {
		if (previousStatusRef.current !== "paid" && invoice.status === "paid") {
			const sendPaymentNotifications = async () => {
				try {
					const studioId = invoice.studio_id || profile?.studio?.id;

					if (!studioId) {
						console.error("No studio ID available for notifications");
						return;
					}

					await notificationService.notifyPaymentReceived(
						studioId,
						parentName,
						invoice.total,
						invoice.id
					);

					if (parentId) {
						await notificationService.notifyPaymentConfirmation(
							parentId,
							studioId,
							invoice.total,
							invoice.id,
							currency
						);
					}
				} catch (err) {
					console.error("Error sending payment notifications:", err);
				}
			};

			sendPaymentNotifications();
		}

		previousStatusRef.current = invoice.status;
	}, [invoice.status, invoice.studio_id, parentName, parentId, invoice.total, invoice.id, currency, profile?.studio?.id]);

	return (
		<div className="bg-white rounded-lg shadow-lg overflow-hidden">
			<div className="px-6 py-4 border-b flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold text-brand-primary">
						Invoice #{invoice.index}
					</h1>
					<p className="text-brand-secondary-400">
						Due: {new Date(invoice.due_date).toLocaleDateString()}
					</p>
				</div>
				<div className="flex items-center space-x-2">
					<button
						onClick={onEdit}
						className="p-2 text-gray-400 hover:text-brand-primary rounded-full hover:bg-gray-100"
						title="Edit invoice"
					>
						<Edit2 className="w-5 h-5" />
					</button>
					{invoice.pdf_url && (
						<a
							href={invoice.pdf_url}
							target="_blank"
							rel="noopener noreferrer"
							className="p-2 text-gray-400 hover:text-brand-primary rounded-full hover:bg-gray-100"
							title="Download PDF"
						>
							<Download className="w-5 h-5" />
						</a>
					)}
				</div>
			</div>

			<div className="p-6 border-t">
				<PaymentHistory invoiceId={invoice.id} onRefresh={onRefresh} />
			</div>

			<div className="p-6">
				<div className="grid grid-cols-2 gap-8 mb-8">
					<div>
						<h3 className="text-sm font-medium text-brand-secondary-400 mb-1">
							Bill To
						</h3>
						<p className="font-medium text-gray-900">{parentName}</p>
						<p className="text-gray-500">{parentEmail}</p>
						{invoice.is_recurring && (
							<div className="mt-3 bg-blue-50 p-2 rounded-md">
								<p className="text-sm text-blue-800">
									↻ Recurring {invoice.recurring_interval.toLowerCase()}
								</p>
								<p className="text-xs text-blue-600">
									Until{" "}
									{new Date(invoice.recurring_end_date).toLocaleDateString()}
								</p>
							</div>
						)}
					</div>
					<div className="text-right">
						<h3 className="text-sm font-medium text-brand-secondary-400 mb-1">
							Amount Due
						</h3>
						{invoice.discount_value > 0 ? (
							<>
								<p className="text-3xl font-bold text-brand-primary">
									{formatCurrency(invoice.total, currency)}
								</p>
								<p className="text-sm text-green-600">
									{invoice.discount_type === "percentage"
										? `${invoice.discount_value}% off`
										: `${formatCurrency(invoice.discount_value, currency)} off`}
									{invoice.discount_reason && ` - ${invoice.discount_reason}`}
								</p>
							</>
						) : (
							<p className="text-3xl font-bold text-brand-primary">
								{formatCurrency(invoice.total, currency)}
							</p>
						)}
					</div>
				</div>

				<div className="mb-8">
					<h3 className="text-lg font-medium text-brand-primary mb-4">
						Invoice Items
					</h3>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b text-left">
									<th className="pb-3 text-sm font-medium text-brand-secondary-400">
										Description
									</th>
									<th className="pb-3 text-sm font-medium text-brand-secondary-400">
										Student
									</th>
									<th className="pb-3 text-sm font-medium text-brand-secondary-400">
										Type
									</th>
									<th className="pb-3 text-sm font-medium text-brand-secondary-400 text-right">
										Quantity
									</th>
									<th className="pb-3 text-sm font-medium text-brand-secondary-400 text-right">
										Unit Price
									</th>
									<th className="pb-3 text-sm font-medium text-brand-secondary-400 text-right">
										Amount
									</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{invoice.items.map((item) => (
									<tr key={item.id}>
										<td className="py-4">{item.description}</td>
										{/* FIXED: Safe student access for multi-parent invoices */}
										<td className="py-4">
											{item.student?.name || "Multiple Families"}
										</td>
										<td className="py-4">
											<span className="capitalize">{item.type}</span>
										</td>
										<td className="py-4 text-right">{item.quantity}</td>
										<td className="py-4 text-right">
											{formatCurrency(item.unit_price, currency)}
										</td>
										<td className="py-4 text-right">
											{formatCurrency(item.total, currency)}
										</td>
									</tr>
								))}
							</tbody>
							<tfoot className="border-t">
								<tr>
									<td colSpan={5} className="py-4 text-right font-medium">
										Subtotal
									</td>
									<td className="py-4 text-right">
										{formatCurrency(invoice.subtotal, currency)}
									</td>
								</tr>
								{invoice.tax > 0 && (
									<tr>
										<td colSpan={5} className="py-4 text-right font-medium">
											Tax
										</td>
										<td className="py-4 text-right">
											{formatCurrency(invoice.tax, currency)}
										</td>
									</tr>
								)}
								<tr>
									<td
										colSpan={5}
										className="py-4 text-right font-medium text-lg"
									>
										Total
									</td>
									<td className="py-4 text-right font-bold text-lg">
										{formatCurrency(invoice.total, currency)}
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				</div>

				{invoice.notes && (
					<div>
						<h3 className="text-sm font-medium text-brand-secondary-400 mb-2">
							Notes
						</h3>
						<p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
					</div>
				)}
			</div>
			
			{/* BACS Payment Handling */}
			{invoice.payment_method === 'bacs' && 
			 (invoice.manual_payment_status === 'pending' || invoice.status === 'pending') && 
			 isOwner && (
			  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
			    <h3 className="text-lg font-medium text-brand-primary mb-4 flex items-center">
			      <Building2 className="w-5 h-5 mr-2" />
			      Mark Bank Transfer as Received
			    </h3>
			    
			    {markPaidSuccess ? (
			      <div className="bg-green-50 p-4 rounded-lg flex items-start">
			        <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
			        <div>
			          <p className="font-medium text-green-800">Payment marked as received</p>
			          <p className="text-sm text-green-600">The invoice has been updated and payment recorded.</p>
			        </div>
			      </div>
			    ) : (
			      <div className="space-y-4">
			        <p className="text-sm text-gray-600">
			          Use this form to record when you've received a bank transfer payment for this invoice.
			        </p>
			        
			        <div>
			          <label className="block text-sm font-medium text-gray-700 mb-1">
			            Payment Reference (Optional)
			          </label>
			          <input
			            type="text"
			            value={paymentReference}
			            onChange={(e) => setPaymentReference(e.target.value)}
			            placeholder="Enter bank reference if available"
			            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
			          />
			        </div>
			        
			        {markPaidError && (
			          <div className="bg-red-50 p-3 rounded-md text-red-700 text-sm">
			            {markPaidError}
			          </div>
			        )}
			        
			        <button
			          onClick={handleMarkAsPaid}
			          disabled={isMarkingPaid}
			          className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
			        >
			          {isMarkingPaid ? (
			            <>
			              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
			              Processing...
			            </>
			          ) : (
			            <>
			              <CheckCircle className="w-4 h-4 mr-2" />
			              Mark as Paid
			            </>
			          )}
			        </button>
			      </div>
			    )}
			  </div>
			)}
		</div>
	);
}
