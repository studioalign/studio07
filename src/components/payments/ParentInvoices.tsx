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
	Building2,
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
	index: number;
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
	payment_method?: 'stripe' | 'bacs';
	manual_payment_status?: 'pending' | 'paid' | 'overdue';
	manual_payment_date?: string;
	manual_payment_reference?: string;
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
	const [bankDetails, setBankDetails] = useState<{[key: string]: any}>({});
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
	  if (!profile?.id) return;
	
	  try {
	    setLoading(true);
	    setError(null);
	
	    // Define the interface here for better type safety
	    interface InvoiceData {
	      id: string;
	      index?: number;
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
	      payment_method?: 'stripe' | 'bacs';
	      manual_payment_status?: 'pending' | 'paid' | 'overdue';
	      manual_payment_date?: string;
	      manual_payment_reference?: string;
	      items?: Array<{
	        id: string;
	        description: string;
	        quantity: number;
	        unit_price: number;
	        total: number;
	        student?: { name?: string };
	      }>;
	    }
	
	    const { data, error: invoicesError } = await supabase
	      .from("invoices")
	      .select(`
	        id, 
	        index,
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
	        payment_method,
	        manual_payment_status,
	        manual_payment_date,
	        manual_payment_reference,
	        parent:parent_id(email, name),
	        items:invoice_items(
	          id, 
	          description, 
	          quantity, 
	          unit_price, 
	          total,
	          student:student_id(name)
	        )
	      `)
	      .eq("parent_id", profile.id)
	      .order("created_at", { ascending: false });
	
	    if (invoicesError) throw invoicesError;
	
	    // Initialize formattedInvoices as empty array
	    let formattedInvoices: Invoice[] = [];
	
	    // Transform the response to match our interface
	    if (data && Array.isArray(data)) {
	      formattedInvoices = (data as InvoiceData[]).map((invoice) => ({
	        id: invoice.id,
	        index: invoice.index || 1,
	        status: invoice.status || "pending",
	        due_date: invoice.due_date || new Date().toISOString(),
	        subtotal: invoice.subtotal || 0,
	        tax: invoice.tax || 0,
	        total: invoice.total || 0,
	        notes: invoice.notes || null,
	        is_recurring: invoice.is_recurring || false,
	        recurring_interval: invoice.recurring_interval || "monthly",
	        recurring_end_date: invoice.recurring_end_date || new Date().toISOString(),
	        discount_type: invoice.discount_type || "percentage",
	        discount_value: invoice.discount_value || 0,
	        discount_reason: invoice.discount_reason || "",
	        pdf_url: invoice.pdf_url,
	        created_at: invoice.created_at || new Date().toISOString(),
	        stripe_invoice_id: invoice.stripe_invoice_id,
	        parent: invoice.parent,
	        // Better payment method detection
	        payment_method: invoice.payment_method || (invoice.stripe_invoice_id ? 'stripe' : 'bacs'),
	        manual_payment_status: invoice.manual_payment_status,
	        manual_payment_date: invoice.manual_payment_date,
	        manual_payment_reference: invoice.manual_payment_reference,
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
	      }));
	    }
	
	    setInvoices(formattedInvoices);
	
	    // Fetch bank details if there are BACS invoices
	    if (formattedInvoices.some(inv => inv.payment_method === 'bacs') && profile?.studio?.id) {
	      const details = await fetchBankDetails(profile.studio.id);
	      if (details) {
	        setBankDetails({ [profile.studio.id]: details });
	      }
	    }
	  } catch (err) {
	    console.error("Error fetching invoices:", err);
	    setError(err instanceof Error ? err.message : "Failed to fetch invoices");
	    setInvoices([]); // Set empty array on error
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
			link.download = `Invoice-${invoice.index}.pdf`;
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

	const fetchBankDetails = async (studioId: string) => {
	  try {
	    const { data, error } = await supabase
	      .from("studio_bank_details")
	      .select("*")
	      .eq("studio_id", studioId)
	      .single();
	    
	    if (error && error.code !== 'PGRST116') {
	      console.error("Error fetching bank details:", error);
	      return null;
	    }
	    
	    return data;
	  } catch (err) {
	    console.error("Error fetching bank details:", err);
	    return null;
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

				<div className="space-y-4 p-4">
				  {filteredInvoices.length > 0 ? (
				    filteredInvoices.map((invoice) => (
				      <div
				        key={invoice.id}
				        className="p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
				        onClick={() => setSelectedInvoice(invoice)}
				      >
				        <div className="flex justify-between items-start mb-4">
				          <div>
				            <h3 className="font-semibold text-lg text-brand-primary">
				              Invoice #{invoice.index}
				            </h3>
				            <p className="text-sm text-gray-500">
				              Created {new Date(invoice.created_at).toLocaleDateString()}
				            </p>
				          </div>
				          <div className="text-right">
				            <p className="text-xl font-bold text-brand-primary">
				              {formatCurrency(invoice.total, currency)}
				            </p>
				            <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>
				              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
				            </span>
				          </div>
				        </div>
				
				        {/* Payment Method - Fixed positioning */}
				        <div className="mb-4">
				          <div className="flex items-center text-sm">
				            {invoice.payment_method === 'bacs' ? (
				              <div className="flex items-center text-green-600">
				                <Building2 className="w-4 h-4 mr-2" />
				                <span>Bank Transfer Required</span>
				              </div>
				            ) : (
				              <div className="flex items-center text-blue-600">
				                <CreditCard className="w-4 h-4 mr-2" />
				                <span>Card Payment</span>
				              </div>
				            )}
				          </div>
				        </div>
				
				        {/* Bank Details for BACS payments */}
				        {invoice.payment_method === 'bacs' && invoice.status !== 'paid' && (
				          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
				            <h4 className="font-medium text-blue-800 mb-2">Bank Transfer Details</h4>
				            {bankDetails[profile?.studio?.id || ''] ? (
				              <div className="text-sm text-blue-700 space-y-1">
				                <p><strong>Account Name:</strong> {bankDetails[profile?.studio?.id || ''].account_name}</p>
				                <p><strong>Account Number:</strong> {bankDetails[profile?.studio?.id || ''].account_number}</p>
				                <p><strong>Sort Code:</strong> {bankDetails[profile?.studio?.id || ''].sort_code}</p>
				                <p><strong>Bank:</strong> {bankDetails[profile?.studio?.id || ''].bank_name}</p>
				                <p><strong>Reference:</strong> Invoice-{invoice.id.substring(0, 8)}</p>
				              </div>
				            ) : (
				              <p className="text-sm text-blue-700">
				                Please contact the studio for bank transfer details.
				              </p>
				            )}
				          </div>
				        )}
				
				        {/* Invoice Items */}
				        <div className="mb-4">
				          {invoice.items.map((item) => (
				            <p key={item.id} className="text-sm text-gray-600">
				              {item.student?.name || "Unknown Student"} - {item.description}
				            </p>
				          ))}
				        </div>
				
				        {/* Due Date */}
				        <div className="mb-4">
				          <p className="text-sm text-gray-600">
				            Due: {new Date(invoice.due_date).toLocaleDateString()}
				          </p>
				        </div>
				
				        {/* Action Buttons */}
				        <div className="flex gap-2">
				          <button
				            onClick={(e) => {
				              e.stopPropagation();
				              setSelectedInvoice(invoice);
				            }}
				            className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 transition-colors"
				          >
				            View Details
				          </button>
				          
				          {invoice.pdf_url && (
				            <button
				              onClick={(e) => handleDownloadPdf(invoice, e)}
				              className="px-4 py-2 border border-brand-primary text-brand-primary rounded-md hover:bg-brand-primary hover:text-white transition-colors"
				            >
				              <Download className="w-4 h-4" />
				            </button>
				          )}
				          
				          {["pending", "overdue"].includes(invoice.status) && invoice.payment_method === 'stripe' && (
				            <button
				              onClick={(e) => {
				                e.stopPropagation();
				                if (!invoice.stripe_invoice_id) {
				                  alert("This invoice is not yet ready for payment. Please contact the studio.");
				                  return;
				                }
				                setSelectedInvoice(invoice);
				                setShowPaymentModal(true);
				              }}
				              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
				            >
				              <CreditCard className="w-4 h-4 mr-2" />
				              Pay Now
				            </button>
				          )}
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
