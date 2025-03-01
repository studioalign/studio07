import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useLocalization } from "../../contexts/LocalizationContext";
import { formatCurrency } from "../../utils/formatters";
import {
	FileText,
	CreditCard,
	Clock,
	CheckCircle,
	AlertCircle,
	Download,
} from "lucide-react";
import InvoiceDetailsModal from "./InvoiceDetailsModal";
import ProcessPaymentModal from "./ProcessPaymentModal";

interface InvoiceItem {
	id: string;
	description: string;
	quantity: number;
	unit_price: number;
	total: number;
	student: {
		name: string;
	};
}

interface Invoice {
	id: string;
	number: string;
	status: string;
	due_date: string;
	subtotal: number;
	tax: number;
	total: number;
	notes: string | null;
	items: InvoiceItem[];
	is_recurring: boolean;
	recurring_interval: string;
	recurring_end_date: string;
	discount_type: string;
	discount_value: number;
	discount_reason: string;
	pdf_url?: string;
	created_at: string;
	stripe_invoice_id?: string;
	parent?: {
		email?: string;
		name?: string;
	};
}

export default function ParentInvoices() {
	const { profile } = useAuth();
	const { currency } = useLocalization();
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
	const [showPaymentModal, setShowPaymentModal] = useState(false);
	const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
	const [studioInfo, setStudioInfo] = useState<
		| {
				name: string;
				address: string;
				phone: string;
				email: string;
				stripe_connect_enabled: boolean;
		  }
		| undefined
	>(undefined);

	const fetchStudioInfo = async () => {
		try {
			if (!profile?.id) return;

			const { data: userData, error: userError } = await supabase
				.from("users")
				.select(
					"studio:studios!users_studio_id_fkey(name, address, phone, email, stripe_connect_enabled)"
				)
				.eq("id", profile.id)
				.single();

			if (userError) throw userError;

			if (userData?.studio) {
				setStudioInfo(userData.studio);
			}
		} catch (err) {
			console.error("Error fetching studio info:", err);
		}
	};

	const fetchInvoices = async () => {
		try {
			setLoading(true);
			if (!profile?.id) return;

			// Type annotation for the expected response
			type InvoiceData = {
				id: string;
				number?: string;
				status: string;
				due_date: string;
				subtotal: number;
				tax: number;
				total: number;
				notes?: string | null;
				is_recurring?: boolean;
				recurring_interval?: string;
				recurring_end_date?: string;
				discount_type?: string;
				discount_value?: number;
				discount_reason?: string;
				pdf_url?: string;
				created_at: string;
				stripe_invoice_id?: string;
				parent?: { email?: string; name?: string };
				items?: Array<{
					id: string;
					description: string;
					quantity: number;
					unit_price: number;
					total: number;
					student?: { name?: string };
				}>;
			};

			// Fetch invoices created for this parent
			const { data, error: invoicesError } = await supabase
				.from("invoices")
				.select(
					`
					id, 
					status, 
					due_date, 
					subtotal, 
					tax, 
					total, 
					notes,
					is_recurring,
					recurring_interval,
					recurring_end_date,
					discount_type,
					discount_value,
					discount_reason,
					pdf_url,
					created_at,
					stripe_invoice_id,
					parent:parent_id(email, name),
					items:invoice_items(
						id, 
						description, 
						quantity, 
						unit_price, 
						total,
						student:student_id(name)
					)
				`
				)
				.eq("parent_id", profile.id)
				.order("created_at", { ascending: false });

			if (invoicesError) throw invoicesError;

			// Transform the response to match our interface
			if (data) {
				const formattedInvoices: Invoice[] = (data as InvoiceData[]).map(
					(invoice) => ({
						id: invoice.id,
						// Generate a number if it doesn't exist in the database
						number:
							invoice.number ||
							`INV-${new Date().getFullYear()}-${invoice.id.slice(0, 6)}`,
						status: invoice.status || "pending",
						due_date: invoice.due_date || new Date().toISOString(),
						subtotal: invoice.subtotal || 0,
						tax: invoice.tax || 0,
						total: invoice.total || 0,
						notes: invoice.notes || null,
						is_recurring: invoice.is_recurring || false,
						recurring_interval: invoice.recurring_interval || "monthly",
						recurring_end_date:
							invoice.recurring_end_date || new Date().toISOString(),
						discount_type: invoice.discount_type || "percentage",
						discount_value: invoice.discount_value || 0,
						discount_reason: invoice.discount_reason || "",
						pdf_url: invoice.pdf_url,
						created_at: invoice.created_at || new Date().toISOString(),
						stripe_invoice_id: invoice.stripe_invoice_id,
						parent: invoice.parent,
						items: Array.isArray(invoice.items)
							? invoice.items.map((item) => ({
									id: item.id,
									description: item.description || "",
									quantity: item.quantity || 1,
									unit_price: item.unit_price || 0,
									total: item.total || 0,
									student: {
										name: item.student?.name || "Unknown Student",
									},
							  }))
							: [],
					})
				);
				setInvoices(formattedInvoices);
			} else {
				setInvoices([]);
			}
		} catch (err) {
			console.error("Error fetching invoices:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch invoices");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!profile?.id) return;

		fetchStudioInfo();
		fetchInvoices();
	}, [profile?.id]);

	// Update invoice status after payment
	const handlePaymentSuccess = async () => {
		if (!selectedInvoice) return;

		// Refresh invoices to get updated status
		await fetchInvoices();

		setShowPaymentModal(false);
		setSelectedInvoice(null);
	};

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

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "paid":
				return <CheckCircle className="w-5 h-5 text-green-500" />;
			case "overdue":
				return <AlertCircle className="w-5 h-5 text-red-500" />;
			case "pending":
				return <Clock className="w-5 h-5 text-yellow-500" />;
			default:
				return <FileText className="w-5 h-5 text-gray-500" />;
		}
	};

	const filteredInvoices = invoices.filter((invoice) => {
		if (filter === "pending") {
			return ["pending", "overdue"].includes(invoice.status);
		}
		if (filter === "paid") {
			return invoice.status === "paid";
		}
		return true;
	});

	const handleDownloadPdf = (invoice: Invoice, e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent opening the invoice details modal

		if (!invoice.pdf_url) {
			alert("PDF is not available for this invoice");
			return;
		}

		// Show feedback to the user
		const button = e.currentTarget as HTMLButtonElement;
		const originalContent = button.innerHTML;

		// Change button to show download in progress
		button.innerHTML = '<span class="animate-pulse">Downloading...</span>';
		button.disabled = true;

		try {
			// Create an anchor element and simulate a click to trigger download
			const link = document.createElement("a");
			link.href = invoice.pdf_url;
			link.target = "_blank";
			link.download = `Invoice-${invoice.number}.pdf`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Change button to show success briefly
			button.innerHTML = '<span class="text-green-500">Downloaded!</span>';
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

	if (loading) {
		return (
			<div>
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold text-brand-primary">Payments</h1>
				</div>
				<div className="animate-pulse space-y-4">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-24 bg-gray-100 rounded-lg" />
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 bg-red-50 rounded-lg">
				<h1 className="text-2xl font-bold text-brand-primary mb-4">Payments</h1>
				<div className="text-red-600">
					<p>Error loading invoices: {error}</p>
					<button
						onClick={fetchInvoices}
						className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-brand-primary">Payments</h1>
			</div>

			<div className="bg-white rounded-lg shadow">
				<div className="p-4 border-b">
					<div className="flex gap-2">
						<button
							onClick={() => setFilter("all")}
							className={`px-4 py-2 rounded-md ${
								filter === "all"
									? "bg-brand-primary text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							All
						</button>
						<button
							onClick={() => setFilter("pending")}
							className={`px-4 py-2 rounded-md ${
								filter === "pending"
									? "bg-brand-primary text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							Pending
						</button>
						<button
							onClick={() => setFilter("paid")}
							className={`px-4 py-2 rounded-md ${
								filter === "paid"
									? "bg-brand-primary text-white"
									: "bg-gray-100 text-gray-700 hover:bg-gray-200"
							}`}
						>
							Paid
						</button>
					</div>
				</div>

				<div className="divide-y">
					{filteredInvoices.length > 0 ? (
						filteredInvoices.map((invoice) => (
							<div
								key={invoice.id}
								className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
								onClick={() => setSelectedInvoice(invoice)}
							>
								<div className="flex justify-between items-start">
									<div>
										<div className="flex items-center space-x-3">
											{getStatusIcon(invoice.status)}
											<h3 className="font-medium text-gray-900">
												{invoice.number}
											</h3>
											<span
												className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
													invoice.status
												)}`}
											>
												{invoice.status.charAt(0).toUpperCase() +
													invoice.status.slice(1)}
											</span>
										</div>
										<p className="text-sm text-gray-500 mt-1">
											Due {new Date(invoice.due_date).toLocaleDateString()}
										</p>
										<div className="mt-2">
											{invoice.items.map((item) => (
												<p key={item.id} className="text-sm text-gray-600">
													{item.student?.name || "Unknown Student"} -{" "}
													{item.description}
												</p>
											))}
										</div>
									</div>
									<div className="text-right">
										<div className="space-y-1">
											{invoice.discount_value > 0 && (
												<div className="flex items-center justify-end space-x-2">
													<p className="text-sm text-gray-500 line-through">
														{formatCurrency(invoice.total, currency)}
													</p>
													<span className="text-sm text-green-600">
														{invoice.discount_type === "percentage"
															? `${invoice.discount_value}% off`
															: `${formatCurrency(
																	invoice.discount_value,
																	currency
															  )} off`}
													</span>
												</div>
											)}
											<p className="text-2xl font-bold text-brand-primary">
												{formatCurrency(
													invoice.discount_value
														? invoice.discount_type === "percentage"
															? invoice.total *
															  (1 - invoice.discount_value / 100)
															: invoice.total - invoice.discount_value
														: invoice.total,
													currency
												)}
											</p>
											{invoice.discount_reason && (
												<p className="text-sm text-gray-500">
													Reason: {invoice.discount_reason}
												</p>
											)}
										</div>
										<div className="flex justify-end mt-2 space-x-2">
											{invoice.pdf_url && (
												<button
													onClick={(e) => handleDownloadPdf(invoice, e)}
													className="flex items-center px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
													title="Download Invoice PDF"
												>
													<Download className="w-4 h-4" />
												</button>
											)}
											{["pending", "overdue"].includes(invoice.status) && (
												<button
													onClick={(e) => {
														e.stopPropagation();

														// Check if the invoice has a Stripe invoice ID
														if (!invoice.stripe_invoice_id) {
															// If no Stripe invoice exists, inform the user
															alert(
																"This invoice is not yet ready for payment. Please contact the studio."
															);
															return;
														}

														setSelectedInvoice(invoice);
														setShowPaymentModal(true);
													}}
													className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
												>
													<CreditCard className="w-4 h-4 mr-2" />
													Pay Now
												</button>
											)}
										</div>
									</div>
								</div>
							</div>
						))
					) : (
						<div className="p-8 text-center">
							<FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							{error ? (
								<>
									<p className="text-red-500 mb-2">Error: {error}</p>
									<button
										onClick={() => {
											setError(null);
											fetchInvoices();
										}}
										className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 mt-2"
									>
										Try Again
									</button>
								</>
							) : (
								<p className="text-gray-500">No invoices found</p>
							)}
						</div>
					)}
				</div>
			</div>

			{selectedInvoice && !showPaymentModal && (
				<InvoiceDetailsModal
					invoice={selectedInvoice}
					studio={studioInfo}
					onClose={() => setSelectedInvoice(null)}
					onPayClick={() => {
						setShowPaymentModal(true);
					}}
				/>
			)}

			{showPaymentModal && selectedInvoice && (
				<ProcessPaymentModal
					invoice={selectedInvoice}
					onClose={() => {
						setShowPaymentModal(false);
						setSelectedInvoice(null);
					}}
					onSuccess={handlePaymentSuccess}
				/>
			)}
		</div>
	);
}
