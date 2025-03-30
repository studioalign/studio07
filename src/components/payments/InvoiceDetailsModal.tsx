import React from "react";
import { X, Download, CreditCard, Building2, Calendar } from "lucide-react";
import { useLocalization } from "../../contexts/LocalizationContext";
import { formatCurrency } from "../../utils/formatters";

interface InvoiceDetailsModalProps {
	invoice: {
		id: string;
		index: number;
		number: string;
		status: string;
		due_date: string;
		subtotal: number;
		tax: number;
		total: number;
		notes: string | null;
		pdf_url?: string;
		discount_type?: string;
		discount_value?: number;
		discount_reason?: string;
		items: {
			id: string;
			description: string;
			quantity: number;
			unit_price: number;
			total: number;
			student: {
				name: string;
			};
		}[];
	};
	onClose: () => void;
	onPayClick?: () => void;
	studio?: {
		name: string;
		address: string;
		phone: string;
		email: string;
		stripe_connect_enabled?: boolean;
	};
}

export default function InvoiceDetailsModal({
	invoice,
	onClose,
	onPayClick,
	studio,
}: InvoiceDetailsModalProps) {
	const { currency } = useLocalization();

	const handleDownloadPDF = (e: React.MouseEvent) => {
		if (!invoice.pdf_url) {
			alert("PDF is not available for this invoice");
			return;
		}

		// Show feedback to the user
		const button = e.currentTarget as HTMLButtonElement;
		const originalContent = button.innerHTML;

		// Change button to show download in progress
		button.innerHTML =
			'<span class="animate-pulse flex items-center"><svg class="w-5 h-5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>Downloading...</span>';
		button.disabled = true;

		try {
			// Create an anchor element and simulate a click to trigger download
			const link = document.createElement("a");
			link.href = invoice.pdf_url;
			link.target = "_blank";
			link.download = `Invoice-${invoice.index}.pdf`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Change button to show success briefly
			button.innerHTML =
				'<span class="text-green-500 flex items-center"><svg class="w-5 h-5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>Downloaded!</span>';
			setTimeout(() => {
				button.innerHTML = originalContent;
				button.disabled = false;
			}, 2000);
		} catch (error) {
			// Handle error
			console.error("Error downloading PDF:", error);
			alert("Failed to download PDF. Please try again.");
			button.innerHTML = originalContent;
			button.disabled = false;
		}
	};

	return (
		<div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
				{/* Header */}
				<div className="sticky top-0 bg-white border-b px-8 py-4 flex justify-between items-center">
					<div className="space-y-1">
						<div className="flex items-center gap-3">
							<h2 className="text-2xl font-semibold text-brand-primary">
								Invoice-{invoice.index}
							</h2>
							<span
								className={`px-3 py-1 text-sm font-medium rounded-full ${
									invoice.status === "paid"
										? "bg-green-100 text-green-800"
										: invoice.status === "overdue"
										? "bg-red-100 text-red-800"
										: "bg-yellow-100 text-yellow-800"
								}`}
							>
								{invoice.status.charAt(0).toUpperCase() +
									invoice.status.slice(1)}
							</span>
						</div>
						<p className="text-brand-secondary-400">
							Due {new Date(invoice.due_date).toLocaleDateString()}
						</p>
					</div>
					<div className="flex items-center gap-3">
						{invoice.pdf_url ? (
							<button
								onClick={handleDownloadPDF}
								className="flex items-center px-4 py-2 text-brand-primary border border-brand-primary rounded-lg hover:bg-brand-primary hover:text-white transition-colors duration-200"
								title="Download Invoice PDF"
							>
								<Download className="w-5 h-5 mr-2" />
								<span>Download PDF</span>
							</button>
						) : (
							<button
								className="flex items-center px-4 py-2 text-gray-400 border border-gray-300 rounded-lg cursor-not-allowed"
								title="PDF not available"
								disabled
							>
								<Download className="w-5 h-5 mr-2" />
								<span>No PDF</span>
							</button>
						)}
						<button
							onClick={onClose}
							className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors duration-200"
						>
							<X className="w-6 h-6" />
						</button>
					</div>
				</div>

				<div className="p-6 space-y-6">
					{/* Studio and Invoice Info */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						{studio && (
							<div className="p-6 bg-gray-50 rounded-xl">
								<div className="flex items-center text-brand-primary mb-4">
									<Building2 className="w-6 h-6 mr-2" />
									<h3 className="text-lg font-medium">{studio.name}</h3>
								</div>
								<div className="text-sm text-gray-600 space-y-2">
									<p>{studio.address}</p>
									<p>{studio.phone}</p>
									<p>{studio.email}</p>
								</div>
							</div>
						)}
						<div className="p-6 bg-gray-50 rounded-xl">
							<div className="flex items-center text-brand-primary mb-4">
								<Calendar className="w-6 h-6 mr-2" />
								<h3 className="text-lg font-medium">Invoice Details</h3>
							</div>
							<div className="text-sm text-gray-600 space-y-2">
								<p>Invoice-{invoice.index}</p>
								<p>
									Issue Date: {new Date(invoice.due_date).toLocaleDateString()}
								</p>
								<p>
									Due Date: {new Date(invoice.due_date).toLocaleDateString()}
								</p>
							</div>
						</div>
					</div>

					{/* Invoice Items */}
					<div className="bg-white rounded-xl border">
						<h3 className="text-lg font-medium text-brand-primary p-4 border-b">
							Invoice Items
						</h3>
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="bg-gray-50">
										<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Description
										</th>
										<th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Student
										</th>
										<th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											Quantity
										</th>
										<th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											Unit Price
										</th>
										<th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											Total
										</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{invoice.items.map((item) => (
										<tr
											key={item.id}
											className="hover:bg-gray-50 transition-colors duration-150"
										>
											<td className="px-6 py-4 text-sm text-gray-900">
												{item.description}
											</td>
											<td className="px-6 py-4 text-sm text-gray-900">
												{item.student.name}
											</td>
											<td className="px-6 py-4 text-sm text-gray-900 text-right">
												{item.quantity}
											</td>
											<td className="px-6 py-4 text-sm text-gray-900 text-right">
												{formatCurrency(item.unit_price, currency)}
											</td>
											<td className="px-6 py-4 text-sm text-gray-900 text-right">
												{formatCurrency(item.total, currency)}
											</td>
										</tr>
									))}
								</tbody>
								<tfoot className="bg-gray-50">
									<tr>
										<td colSpan={3} />
										<td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
											Subtotal
										</td>
										<td className="px-6 py-4 text-sm text-gray-900 text-right">
											{formatCurrency(invoice.subtotal, currency)}
										</td>
									</tr>
									{invoice.tax > 0 && (
										<tr>
											<td colSpan={3} />
											<td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
												Tax
											</td>
											<td className="px-6 py-4 text-sm text-gray-900 text-right">
												{formatCurrency(invoice.tax, currency)}
											</td>
										</tr>
									)}
									{invoice.discount_value && invoice.discount_value > 0 && (
										<tr>
											<td colSpan={3} />
											<td className="px-6 py-4 text-sm font-medium text-green-600 text-right">
												Discount
												{invoice.discount_reason &&
													` (${invoice.discount_reason})`}
											</td>
											<td className="px-6 py-4 text-sm text-green-600 text-right">
												{invoice.discount_type === "percentage"
													? `${invoice.discount_value}%`
													: formatCurrency(invoice.discount_value, currency)}
											</td>
										</tr>
									)}
									<tr className="border-t-2">
										<td colSpan={3} />
										<td className="px-6 py-4 text-lg font-bold text-brand-primary text-right">
											Final Amount
										</td>
										<td className="px-6 py-4 text-lg font-bold text-brand-primary text-right">
											{formatCurrency(invoice.total, currency)}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>
					</div>

					{/* Notes */}
					{invoice.notes && (
						<div className="bg-gray-50 rounded-xl p-6">
							<h3 className="text-lg font-medium text-brand-primary mb-4">
								Notes
							</h3>
							<p className="text-gray-600 whitespace-pre-wrap">
								{invoice.notes}
							</p>
						</div>
					)}

					{/* Payment Button */}
					{["pending", "overdue"].includes(invoice.status) && onPayClick && (
						<div className="flex justify-end">
							{studio?.stripe_connect_enabled ? (
								<button
									onClick={onPayClick}
									className="flex items-center px-8 py-4 bg-brand-primary text-white rounded-xl hover:bg-brand-secondary-400 transform hover:scale-105 transition-all duration-200"
								>
									<CreditCard className="w-5 h-5 mr-3" />
									Pay {formatCurrency(invoice.total, currency)}
								</button>
							) : (
								<div className="text-right">
									<button
										disabled
										className="flex items-center px-8 py-4 bg-gray-300 text-gray-500 rounded-xl cursor-not-allowed"
									>
										<CreditCard className="w-5 h-5 mr-3" />
										Payment Unavailable
									</button>
									<p className="text-sm text-gray-500 mt-2">
										The studio needs to connect their Stripe account to accept
										payments.
									</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
