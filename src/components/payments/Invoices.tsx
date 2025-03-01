import React, { useState, useCallback, useEffect } from "react";
import {
	Plus,
	FileText,
	Search,
	X,
	AlertCircle,
	CreditCard,
} from "lucide-react";
import CreateInvoiceForm from "./CreateInvoiceForm";
import InvoiceDetail from "./InvoiceDetail";
import EditInvoiceForm from "./EditInvoiceForm";
import { useInvoices, InvoiceStatus } from "../../hooks/useInvoices";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { useLocalization } from "../../contexts/LocalizationContext";
import type { Invoice } from "../../hooks/useInvoices";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Invoices() {
	const { currency, dateFormat } = useLocalization();
	const { profile } = useAuth();
	const [isStripeConnected, setIsStripeConnected] = useState<boolean>(false);
	const navigate = useNavigate();
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState<
		InvoiceStatus | undefined
	>(undefined);
	const [search, setSearch] = useState("");
	const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
	const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

	const { invoices, loading, error, counts, refresh } = useInvoices({
		status: selectedStatus,
		search,
	});

	useEffect(() => {
		if (profile?.studio?.id) {
			checkStripeConnection(profile.studio.id);
		}
	}, [profile]);

	const filters = [
		{ id: undefined, label: "All" },
		{ id: "draft" as InvoiceStatus, label: "Draft" },
		{ id: "pending" as InvoiceStatus, label: "Pending" },
		{ id: "paid" as InvoiceStatus, label: "Paid" },
		{ id: "overdue" as InvoiceStatus, label: "Overdue" },
	];

	const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(e.target.value);
	}, []);

	const checkStripeConnection = async (studioId: string) => {
		try {
			const { data: studioData, error } = await supabase
				.from("studios")
				.select("stripe_connect_enabled")
				.eq("id", studioId)
				.single();

			if (error) throw error;
			setIsStripeConnected(!!studioData?.stripe_connect_enabled);
		} catch (err) {
			console.error("Error checking Stripe connection:", err);
			setIsStripeConnected(false);
		}
	};

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
			{!isStripeConnected && (
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
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-brand-primary">Invoices</h1>
				<button
					onClick={() => setShowCreateForm(true)}
					disabled={!isStripeConnected}
					className="flex items-center px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
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
										{counts && item.label !== "All" && (
											<span className="ml-2 text-xs text-gray-400">
												({counts[item.id as keyof typeof counts] || 0})
											</span>
										)}
										{counts && item.label === "All" && (
											<span className="ml-2 text-xs text-gray-400">
												({invoices.length || 0})
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
												<p className="font-medium">{invoice.id}</p>
												<p className="text-sm text-gray-500">
													{invoice.parent.name}
												</p>
												{invoice.is_recurring && (
													<p className="text-xs text-blue-600 mt-1">
														↻ Recurring{" "}
														{invoice.recurring_interval.toLowerCase()}
													</p>
												)}
											</div>
										</div>
										<div className="flex items-center space-x-6">
											<div className="text-right">
												{invoice.discount_value > 0 ? (
													<>
														<p className="text-sm text-gray-500 line-through">
															{formatCurrency(invoice.total, currency)}
														</p>
														<p className="font-medium text-green-600">
															{formatCurrency(
																invoice.discount_type === "percentage"
																	? invoice.total *
																			(1 - invoice.discount_value / 100)
																	: invoice.total - invoice.discount_value,
																currency
															)}
															<span className="text-xs ml-1">
																(
																{invoice.discount_type === "percentage"
																	? `${invoice.discount_value}% off`
																	: `${formatCurrency(
																			invoice.discount_value,
																			currency
																	  )} off`}
																)
															</span>
														</p>
													</>
												) : (
													<p className="font-medium">
														{formatCurrency(invoice.total, currency)}
													</p>
												)}
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
														: invoice.status === "pending"
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
