import React, { useState, useEffect } from "react";
import { Plus, X, AlertCircle, CreditCard, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInvoices } from "../../hooks/useInvoices";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import CreateInvoiceForm from "./CreateInvoiceForm";
import InvoiceDetail from "./InvoiceDetail";
import EditInvoiceForm from "./EditInvoiceForm";
import { formatCurrency } from "../../utils/formatters";
import { useLocalization } from "../../contexts/LocalizationContext";
import { getStudioPaymentMethods } from "../../utils/studioUtils";

export default function Invoices() {
	const navigate = useNavigate();
	const { profile } = useAuth();
	const { currency } = useLocalization();
	const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
	const [editingInvoice, setEditingInvoice] = useState<any>(null);
	const [isStripeConnected, setIsStripeConnected] = useState(true);

	const { invoices, loading, error, counts, refresh } = useInvoices({
		status: selectedStatus as any,
	});

	// Get studio payment methods
	const studioPaymentMethods = profile?.studio ? 
		getStudioPaymentMethods(profile.studio) : 
		{ stripe: true, bacs: false };

	const filters = [
		{ id: null, label: "All", count: Object.values(counts).reduce((a, b) => a + b, 0) },
		{ id: "pending", label: "Pending", count: counts.pending },
		{ id: "paid", label: "Paid", count: counts.paid },
		{ id: "overdue", label: "Overdue", count: counts.overdue },
		{ id: "cancelled", label: "Cancelled", count: counts.cancelled },
	];

	useEffect(() => {
		const checkStripeConnection = async () => {
			if (!profile?.studio?.id) return;

			try {
				const { data: studioData, error } = await supabase
					.from("studios")
					.select("stripe_connect_enabled")
					.eq("id", profile.studio.id)
					.single();

				if (error) throw error;

				setIsStripeConnected(!!studioData?.stripe_connect_enabled);
			} catch (err) {
				console.error("Error checking Stripe connection:", err);
				setIsStripeConnected(false);
			}
		};

		checkStripeConnection();
	}, [profile?.studio?.id]);

	if (selectedInvoice) {
		return (
			<div>
				<button
					onClick={() => setSelectedInvoice(null)}
					className="mb-6 text-brand-secondary-400 hover:text-brand-primary"
				>
					← Back to Invoices
				</button>
				<InvoiceDetail
					invoice={selectedInvoice}
					onEdit={() => {
						setEditingInvoice(selectedInvoice);
						setSelectedInvoice(null);
					}}
					onRefresh={refresh}
				/>
			</div>
		);
	}

	if (editingInvoice) {
		return (
			<div>
				<button
					onClick={() => setEditingInvoice(null)}
					className="mb-6 text-brand-secondary-400 hover:text-brand-primary"
				>
					← Back to Invoices
				</button>
				<div className="bg-white rounded-lg shadow-lg p-6">
					<h2 className="text-lg font-semibold text-brand-primary mb-4">
						Edit Invoice
					</h2>
					<EditInvoiceForm
						invoice={editingInvoice}
						onSuccess={() => {
							setEditingInvoice(null);
							refresh();
						}}
						onCancel={() => setEditingInvoice(null)}
					/>
				</div>
			</div>
		);
	}

	return (
		<div>
			{/* Stripe Not Connected Warning */}
			{!isStripeConnected && !studioPaymentMethods.bacs && (
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
			
			{/* BACS Enabled Notice */}
			{!isStripeConnected && studioPaymentMethods.bacs && (
				<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
					<div className="flex items-start">
						<Building2 className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
						<div>
							<h3 className="text-sm font-medium text-blue-800">
								Bank Transfer Payments Enabled
							</h3>
							<p className="mt-1 text-sm text-blue-700">
								Your studio is configured to use bank transfers (BACS) for payments. 
								You'll need to manually mark invoices as paid when you receive payments.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Header */}
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-brand-primary">Invoices</h1>
				<button
					onClick={() => setShowCreateForm(true)}
					disabled={!isStripeConnected && !studioPaymentMethods.bacs}
					className="flex items-center px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
				>
					<Plus className="w-5 h-5 mr-2" />
					Create Invoice
				</button>
			</div>

			{/* Create Invoice Modal */}
			{showCreateForm && (
				<>
					<div
						className="fixed inset-0 bg-black bg-opacity-25 transition-opacity z-40"
						onClick={() => setShowCreateForm(false)}
					/>
					<div className="fixed inset-y-0 right-0 w-full md:w-[800px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out translate-x-0 z-50 flex flex-col">
						<div className="flex-none px-6 py-4 border-b">
							<div className="flex justify-between items-center">
								<h2 className="text-xl font-semibold text-brand-primary">
									Create New Invoice
								</h2>
								<button
									onClick={() => setShowCreateForm(false)}
									className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
								>
									<X className="w-6 h-6" />
								</button>
							</div>
						</div>
						<div className="flex-1 overflow-y-auto p-6">
							<CreateInvoiceForm
								onSuccess={() => {
									setShowCreateForm(false);
									refresh();
								}}
								onCancel={() => setShowCreateForm(false)}
							/>
						</div>
					</div>
				</>
			)}

			{/* Invoice List */}
			{!showCreateForm && (
				<div className="bg-white rounded-lg shadow">
					<div className="border-b p-4">
						<div className="mb-4">
							<nav className="flex overflow-x-auto pb-2">
								{filters.map((item) => (
									<button
										key={item.id || "all"}
										onClick={() => setSelectedStatus(item.id)}
										className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
											selectedStatus === item.id
												? "border-brand-primary text-brand-primary"
												: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
										}`}
									>
										{item.label}
										{item.count > 0 && (
											<span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
												{item.count}
											</span>
										)}
									</button>
								))}
							</nav>
						</div>
					</div>

					{loading ? (
						<div className="flex items-center justify-center h-64">
							<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary"></div>
						</div>
					) : error ? (
						<div className="text-center text-red-600 p-6">Error: {error}</div>
					) : invoices.length === 0 ? (
						<div className="text-center py-12">
							<p className="text-gray-500">No invoices found</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Invoice
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Parent
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Due Date
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Payment Method
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Amount
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{invoices.map((invoice) => (
										<tr
											key={invoice.id}
											onClick={() => setSelectedInvoice(invoice)}
											className="hover:bg-gray-50 cursor-pointer"
										>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm font-medium text-gray-900">
													Invoice-{invoice.index}
												</div>
												<div className="text-sm text-gray-500">
													{new Date(invoice.created_at).toLocaleDateString()}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm font-medium text-gray-900">
													{invoice.parent?.name}
												</div>
												<div className="text-sm text-gray-500">
													{invoice.parent?.email}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{new Date(invoice.due_date).toLocaleDateString()}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="flex items-center gap-2">
													{(invoice.payment_method === 'stripe' || invoice.stripe_invoice_id) ? (
														<div className="flex items-center text-xs text-blue-600">
															<CreditCard className="w-3 h-3 mr-1" />
															Card Payment
														</div>
													) : (
														<div className="flex items-center text-xs text-green-600">
															<Building2 className="w-3 h-3 mr-1" />
															Bank Transfer
														</div>
													)}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span
													className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
														invoice.status === "paid"
															? "bg-green-100 text-green-800"
															: invoice.status === "overdue"
															? "bg-red-100 text-red-800"
															: invoice.status === "pending"
															? "bg-yellow-100 text-yellow-800"
															: "bg-gray-100 text-gray-800"
													}`}
												>
													{invoice.status.toUpperCase()}
												</span>
												{invoice.is_recurring && (
													<div className="text-xs text-gray-500 mt-1">
														Recurring {invoice.recurring_interval}
													</div>
												)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{formatCurrency(invoice.total, currency)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
