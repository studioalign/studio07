import React, { useState, useCallback } from "react";
import { Plus, FileText, Search, X } from "lucide-react";
import CreateInvoiceForm from "./CreateInvoiceForm";
import InvoiceDetail from "./InvoiceDetail";
import EditInvoiceForm from "./EditInvoiceForm";
import { useInvoices } from "../../hooks/useInvoices";
import { formatCurrency } from "../../utils/formatters";
import { useLocalization } from "../../contexts/LocalizationContext";
import type { Invoice } from "../../hooks/useInvoices";

export default function Invoices() {
	const { currency, dateFormat } = useLocalization();
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
	const [search, setSearch] = useState("");
	const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
	const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

	const { invoices, loading, error, counts, refresh } = useInvoices({
		status: selectedStatus as any,
		search,
	});

	const filters = [
		{ id: undefined, label: "All" },
		{ id: "draft", label: "Draft" },
		{ id: "sent", label: "Sent" },
		{ id: "paid", label: "Paid" },
		{ id: "overdue", label: "Overdue" },
	];

	const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value);
	}, []);

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
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-brand-primary">Invoices</h1>
				<button
					onClick={() => setShowCreateForm(true)}
					className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
				>
					<Plus className="w-5 h-5 mr-2" />
					Create Invoice
				</button>
			</div>

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
										{counts && (
											<span className="ml-2 text-xs text-gray-400">
												({counts[item.id as keyof typeof counts] || 0})
											</span>
										)}
									</button>
								))}
							</nav>
						</div>

						<div className="relative">
							<input
								type="text"
								placeholder="Search invoices..."
								value={search}
								onChange={handleSearch}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
							/>
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
						</div>
					</div>

					<div className="p-6">
						{loading ? (
							<div className="space-y-4">
								{[1, 2, 3].map((i) => (
									<div key={i} className="animate-pulse">
										<div className="h-20 bg-gray-100 rounded-lg" />
									</div>
								))}
							</div>
						) : error ? (
							<div className="text-center text-red-500 py-8">{error}</div>
						) : invoices.length === 0 ? (
							<div className="text-center text-gray-500 py-8">
								<FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
								<p className="text-lg font-medium">No invoices found</p>
								<p className="text-sm">
									Create your first invoice to get started
								</p>
							</div>
						) : (
							<div className="space-y-4">
								{invoices.map((invoice) => (
									<button
										key={invoice.id}
										onClick={() => setSelectedInvoice(invoice)}
										className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
									>
										<div className="flex items-center">
											<FileText className="w-5 h-5 text-brand-primary mr-3" />
											<div className="text-left">
												<p className="font-medium">{invoice.number}</p>
												<p className="text-sm text-gray-500">
													{invoice.parent.name}
												</p>
											</div>
										</div>
										<div className="flex items-center space-x-6">
											<div className="text-right">
												<p className="font-medium">
													{formatCurrency(invoice.total, currency)}
												</p>
												<p className="text-sm text-gray-500">
													Due {formatDate(invoice.due_date, dateFormat)}
												</p>
											</div>
											<span
												className={`px-3 py-1 text-sm font-medium rounded-full ${
													invoice.status === "paid"
														? "bg-green-100 text-green-800"
														: invoice.status === "overdue"
														? "bg-red-100 text-red-800"
														: invoice.status === "sent"
														? "bg-yellow-100 text-yellow-800"
														: "bg-gray-100 text-gray-800"
												}`}
											>
												{invoice.status.charAt(0).toUpperCase() +
													invoice.status.slice(1)}
											</span>
										</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
