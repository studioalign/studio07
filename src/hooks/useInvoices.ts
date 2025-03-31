import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export type InvoiceStatus =
	| "draft"
	| "pending"
	| "paid"
	| "overdue"
	| "cancelled"
	| "refunded";

export interface Invoice {
	id: string;
	index: number;
	status: InvoiceStatus;
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
	pdf_url: string;
	stripe_invoice_id: string;
	paid_at: string;
	parent: {
		name: string;
		email: string;
	};
	created_at: string;
	number?: string;
	notes?: string;
	items?: Array<{
		id: string;
		description: string;
		quantity: number;
		unit_price: number;
		total: number;
		type: string;
		student?: {
			id: string;
			name: string;
		};
	}>;
	parent_id?: string;
}

interface UseInvoicesOptions {
	status?: InvoiceStatus;
	search?: string;
}

export function useInvoices({ status, search }: UseInvoicesOptions = {}) {
	const { profile } = useAuth();
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [counts, setCounts] = useState<Record<InvoiceStatus, number>>({
		draft: 0,
		pending: 0,
		paid: 0,
		overdue: 0,
		cancelled: 0,
		refunded: 0,
	});

	useEffect(() => {
		if (!profile?.studio?.id) return;
		fetchInvoices();
	}, [profile?.studio?.id, status, search]);

	const fetchInvoices = async () => {
		try {
			setLoading(true);
			let query = supabase
				.from("invoices")
				.select(
					`
				id,
				index,
				status,
				due_date,
				subtotal,
				tax,
				total,
				created_at,
				is_recurring,
				recurring_interval,
				recurring_end_date,
				discount_type,
				discount_value,
				discount_reason,
				pdf_url,
				stripe_invoice_id,
				paid_at,
				items:invoice_items (
					id,
					description,
					quantity,
					unit_price,
					total,
					type,
					student:students (
					id,
					name
					)
				),
				parent:users (
					name,
					email
				)
				`
				)
				.eq("studio_id", profile?.studio?.id + "")
				.order("created_at", { ascending: false });

			if (status) {
				query = query.eq("status", status);
			}

			// if (search) {
			//   query = query.or(`
			//     number.ilike.%${search}%,
			//   `);
			// }

			const { data, error: fetchError } = await query;

			if (fetchError) throw fetchError;

			// Safely handle potential errors in the data
			const validData = Array.isArray(data) && !("error" in data) ? data : [];

			// Apply client-side filtering for search if needed
			const filteredData = search
				? validData.filter((invoice) => {
						// Type guard to safely access properties
						const parentName = invoice?.parent?.name || "";
						const parentEmail = invoice?.parent?.email || "";

						return (
							parentName.toLowerCase().includes(search.toLowerCase()) ||
							parentEmail.toLowerCase().includes(search.toLowerCase())
						);
				  })
				: validData;

			// Cast to Invoice[] - we need this because the Supabase types don't exactly
			// match our Invoice interface
			setInvoices(filteredData as unknown as Invoice[]);

			// Fetch counts for each status
			const statusCounts: Record<InvoiceStatus, number> = {
				draft: 0,
				pending: 0,
				paid: 0,
				overdue: 0,
				cancelled: 0,
				refunded: 0,
			};

			// Get status counts from a separate query
			const { data: statusData, error: statusError } = await supabase
				.from("invoices")
				.select("status")
				.eq("studio_id", profile?.studio?.id + "");

			if (statusError) throw statusError;

			// Count invoices by status from the fetched data
			if (statusData && Array.isArray(statusData)) {
				statusData.forEach((invoice) => {
					const invoiceStatus = invoice?.status as InvoiceStatus;
					if (invoiceStatus && invoiceStatus in statusCounts) {
						statusCounts[invoiceStatus]++;
					}
				});
			}

			setCounts(statusCounts);
		} catch (err) {
			console.error("Error fetching invoices:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch invoices");
		} finally {
			setLoading(false);
		}
	};

	return {
		invoices,
		loading,
		error,
		counts,
		refresh: fetchInvoices,
	};
}
