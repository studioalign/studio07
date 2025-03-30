import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

// Define a proper invoice interface
interface Invoice {
	id: string;
	index: number;
	status: string;
	total: number;
	parent?: {
		name?: string;
		email?: string;
	};
}

const PaymentSuccessPage: React.FC = () => {
	const [searchParams] = useSearchParams();
	const invoiceId = searchParams.get("invoice_id");
	const [loading, setLoading] = useState(true);
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchInvoiceDetails = async () => {
			if (!invoiceId) {
				return;
			}

			try {
				const { data, error } = await supabase
					.from("invoices")
					.select("*, parent:users (name, email)")
					.eq("id", invoiceId)
					.single();

				if (error) {
					console.error("Error fetching invoice:", error);
				} else {
					setInvoice(data);
				}
			} catch (err) {
				console.error("Error:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchInvoiceDetails();
	}, [invoiceId]);

	// Redirect to invoices after 5 seconds
	useEffect(() => {
		const timer = setTimeout(() => {
			navigate("/dashboard/invoices");
		}, 5000);

		return () => clearTimeout(timer);
	}, [navigate]);

	if (loading) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
				<div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md">
					<div className="flex flex-col items-center justify-center space-y-4">
						<div className="animate-pulse h-16 w-16 rounded-full bg-green-100"></div>
						<h1 className="text-2xl font-bold text-gray-800">
							Processing Payment
						</h1>
						<p className="text-gray-600 text-center">
							We're confirming your payment details...
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
			<div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
				<div className="flex flex-col items-center justify-center space-y-4">
					<CheckCircle className="h-16 w-16 text-green-500" />
					<h1 className="text-2xl font-bold text-gray-800">
						Payment Successful!
					</h1>

					{invoice && (
						<div className="space-y-2 w-full">
							<div className="border-t border-b py-4">
								<p className="text-sm text-gray-500">Payment Details</p>
								<p className="font-medium">
									{invoice.parent?.name || "Parent"}
								</p>
								<p className="text-sm text-gray-600">
									{new Date().toLocaleDateString()} at{" "}
									{new Date().toLocaleTimeString()}
								</p>
							</div>
							<p className="text-center text-sm text-gray-500">
								You will be redirected to your invoices in a few seconds...
							</p>
							<button
								onClick={() => navigate("/dashboard/invoices")}
								className="w-full py-2 mt-4 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50"
							>
								View Invoices
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default PaymentSuccessPage;
