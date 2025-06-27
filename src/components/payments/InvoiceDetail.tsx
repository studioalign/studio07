import React, { useEffect, useRef } from "react";
import { Edit2, Download } from "lucide-react";
import PaymentHistory from "./PaymentHistory";
import { formatCurrency } from "../../utils/formatters";
import { useLocalization } from "../../contexts/LocalizationContext";
import { notificationService } from "../../services/notificationService";
import { useAuth } from "../../contexts/AuthContext";

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
	};
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
	parent: {
		id?: string; // Added for notification purposes
		name: string;
		email: string;
	};
	items: InvoiceItem[];
	studio_id?: string; // Added for notification purposes
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

	// Send notifications when invoice status changes to "paid"
	useEffect(() => {
		// If status wasn't already "paid" and is now "paid"
		if (previousStatusRef.current !== "paid" && invoice.status === "paid") {
			const sendPaymentNotifications = async () => {
				try {
					// Use studio_id from invoice or from current user profile
					const studioId = invoice.studio_id || profile?.studio?.id;

					if (!studioId) {
						console.error("No studio ID available for notifications");
						return;
					}

					// Notify the studio owner about the payment
					await notificationService.notifyPaymentReceived(
						studioId,
						invoice.parent.name,
						invoice.total,
						invoice.id
					);
					// Notify the parent about the payment confirmation
					if (invoice.parent.id) {
						await notificationService.notifyPaymentConfirmation(
							invoice.parent.id,
							studioId,
							invoice.total,
							invoice.id
						);
					}
				} catch (error) {
					console.error("Failed to send payment notifications:", error);
				}
			};

			sendPaymentNotifications();
		}

		// Update ref for next render
		previousStatusRef.current = invoice.status;
	}, [
		invoice.status,
		invoice.id,
		invoice.total,
		invoice.parent,
		invoice.studio_id,
		profile,
	]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "paid":
				return "bg-green-100 text-green-800";
			case "overdue":
				return "bg-red-100 text-red-800";
			case "pending":
				return "bg-yellow-100 text-yellow-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<div className="bg-white rounded-lg shadow-lg">
			<div className="px-6 py-4 border-b flex justify-between items-start">
				<div>
					<div className="flex items-center space-x-4">
						<h2 className="text-2xl font-bold text-brand-primary">
							Invoice-{invoice.index}
						</h2>
						<span
							className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
								invoice.status
							)}`}
						>
							{invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
						</span>
					</div>
					<p className="text-brand-secondary-400 mt-1">
						Due {new Date(invoice.due_date).toLocaleDateString()}
					</p>
				</div>
				<div className="flex space-x-3">
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
						<p className="font-medium text-gray-900">{invoice.parent.name}</p>
						<p className="text-gray-500">{invoice.parent.email}</p>
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
										<td className="py-4">{item.student.name}</td>
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
		</div>
	);
}
