import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";

const PaymentCancelPage: React.FC = () => {
	const [searchParams] = useSearchParams();
	const invoiceId = searchParams.get("invoice_id");
	const navigate = useNavigate();

	// Redirect to invoices after 5 seconds
	useEffect(() => {
		const timer = setTimeout(() => {
			navigate("/dashboard/invoices");
		}, 5000);

		return () => clearTimeout(timer);
	}, [navigate]);

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
			<div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
				<div className="flex flex-col items-center justify-center space-y-4">
					<XCircle className="h-16 w-16 text-red-500" />
					<h1 className="text-2xl font-bold text-gray-800">
						Payment Cancelled
					</h1>
					<p className="text-gray-600 text-center">
						Your payment was not completed. If you experienced any issues,
						please try again or contact support.
					</p>

					<div className="mt-6 w-full space-y-3">
						<button
							onClick={() => navigate(`/dashboard/invoices`)}
							className="w-full py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50"
						>
							Return to Invoices
						</button>

						{invoiceId && (
							<button
								onClick={() => navigate(`/dashboard/invoices/${invoiceId}`)}
								className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50"
							>
								Try Again
							</button>
						)}
					</div>

					<p className="text-center text-sm text-gray-500 mt-4">
						You will be redirected to your invoices in a few seconds...
					</p>
				</div>
			</div>
		</div>
	);
};

export default PaymentCancelPage;
