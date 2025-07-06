// src/components/payments/CreateInvoiceForm.tsx
import React, { useState, useEffect } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useData } from "../../contexts/DataContext";
import FormInput from "../FormInput";
import SearchableDropdown from "../SearchableDropdown";
import { useAuth } from "../../contexts/AuthContext";
import { getStudioUsersByRole } from "../../utils/messagingUtils";
import { getStudioPaymentMethods } from "../../utils/studioUtils";
import { notificationService } from "../../services/notificationService";

interface Parent {
	id: string;
	name: string;
	email: string;
	students: {
		id: string;
		name: string;
		enrollments: {
			id: string;
			plan: {
				name: string;
				amount: number;
			};
		}[];
	}[];
}

interface InvoiceItem {
	student_id: string;
	description: string;
	quantity: number;
	unit_price: number;
	type: "tuition" | "costume" | "registration" | "other";
	plan_enrollment_id?: string;
}

export default function CreateInvoiceForm({
	onSuccess,
	onCancel,
}: {
	onSuccess: () => void;
	onCancel: () => void;
}) {
	const { profile } = useAuth();
	const [parents, setParents] = useState<Parent[]>([]);
	const [selectedParent, setSelectedParent] = useState<{
		id: string;
		label: string;
	} | null>(null);
	const [dueDate, setDueDate] = useState("");
	const [notes, setNotes] = useState("");
	const [items, setItems] = useState<InvoiceItem[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isRecurring, setIsRecurring] = useState(false);
	const [recurringInterval, setRecurringInterval] = useState<
		"week" | "month" | "year"
	>("month");
	const [weeklyDay, setWeeklyDay] = useState<number>(1); // 1 = Monday
	const [monthlyDate, setMonthlyDate] = useState<number>(1);
	const [termMonths, setTermMonths] = useState<number[]>([1, 4, 9]); // Default to January, April, September
	const [termDates, setTermDates] = useState<number[]>([1, 1, 1]); // Default to 1st of each month
	const [recurringEndDate, setRecurringEndDate] = useState("");
	const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
		"percentage"
	);
	const [discountValue, setDiscountValue] = useState("");
	const [discountReason, setDiscountReason] = useState("");
	const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'bacs'>('stripe');

	useEffect(() => {
		fetchParents();
	}, [profile?.studio?.id]);

	// Get studio payment methods
	const studioPaymentMethods = profile?.studio ? 
		getStudioPaymentMethods(profile.studio) : 
		{ stripe: true, bacs: false };
	
	// Auto-set payment method if only one is enabled
	useEffect(() => {
		if (studioPaymentMethods.stripe && !studioPaymentMethods.bacs) {
			setPaymentMethod('stripe');
		} else if (!studioPaymentMethods.stripe && studioPaymentMethods.bacs) {
			setPaymentMethod('bacs');
		}
	}, [studioPaymentMethods]);

	const fetchParents = async () => {
		try {
			const { data, error } = await supabase
				.from("users")
				.select(
					`
						id, name, role, email,
						studio:studios!users_studio_id_fkey(
						id, name, address, phone, email
						),
						students:students (id, name)
					`
				)
				.eq("role", "parent")
				.eq("studio_id", profile?.studio?.id + "");

			if (error) throw error;

			setParents(data);
		} catch (err) {
			console.error("Error fetching parents:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch parents");
		}
	};

	const addItem = () => {
		setItems([
			...items,
			{
				student_id: "",
				description: "",
				quantity: 1,
				unit_price: 0,
				type: "tuition",
			},
		]);
	};

	const removeItem = (index: number) => {
		setItems(items.filter((_, i) => i !== index));
	};

	const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
		setItems(
			items.map((item, i) => (i === index ? { ...item, ...updates } : item))
		);
	};

	const calculateTotals = () => {
		const subtotal = items.reduce(
			(acc, item) => acc + item.quantity * item.unit_price,
			0
		);

		// Calculate discount
		let discount = 0;
		if (parseFloat(discountValue) > 0) {
			if (discountType === "percentage") {
				discount = subtotal * (parseFloat(discountValue) / 100);
			} else {
				discount = parseFloat(discountValue);
			}
		}

		const total = subtotal - discount;

		return {
			subtotal,
			discount,
			total,
		};
	};

	const handleSubmit = async (e: React.FormEvent) => {
	  e.preventDefault();
	  if (!profile?.studio?.id || !selectedParent) return;
	  setIsSubmitting(true);
	  setError(null);
	  
	  try {
	    // Calculate totals
	    const totals = calculateTotals();
	    
	    // Create invoice
	    const invoiceData = {
	      studio_id: profile?.studio?.id,
	      parent_id: selectedParent.id,
	      status: 'pending',
	      due_date: dueDate,
	      notes: notes || null,
	      subtotal: totals.subtotal,
	      total: totals.total,
	      payment_method: paymentMethod,
	      is_recurring: isRecurring,
	      recurring_interval: recurringInterval,
	      recurring_end_date: recurringEndDate || null,
	      discount_type: discountType,
	      discount_value: discountValue ? parseFloat(discountValue) : 0,
	      discount_reason: discountReason,
	      manual_payment_status: paymentMethod === 'bacs' ? 'pending' : null,
	      stripe_invoice_id: null,
	      pdf_url: null,
	    };
	    
	    const { data: invoice, error: invoiceError } = await supabase
	      .from("invoices")
	      .insert([invoiceData])
	      .select()
	      .single();
	
	    if (invoiceError) throw invoiceError;
	
	    // Create invoice items
	    const { error: itemsError } = await supabase.from("invoice_items").insert(
	      items.map((item) => ({
	        invoice_id: invoice.id,
	        student_id: item.student_id,
	        description: item.description,
	        quantity: item.quantity,
	        unit_price: item.unit_price,
	        subtotal: item.quantity * item.unit_price,
	        total: item.quantity * item.unit_price,
	        type: item.type,
	        plan_enrollment_id: item.plan_enrollment_id,
	      }))
	    );
	
	    if (itemsError) throw itemsError;
	
	    // Handle invoice processing based on payment method
	    if (paymentMethod === 'stripe') {
	      try {
	        const response = await supabase.functions.invoke(
	          "create-stripe-invoice",
	          {
	            body: {
	              invoiceId: invoice.id,
	            },
	          }
	        );
	
	        if (response.error) {
	          console.error("Error creating Stripe invoice:", response.error);
	        } else if (response.data) {
	          // Update the invoice with Stripe invoice ID and PDF URL
	          const { error: updateError } = await supabase
	            .from("invoices")
	            .update({
	              stripe_invoice_id: response.data.stripe_invoice_id,
	              pdf_url: response.data.pdf_url,
	            })
	            .eq("id", invoice.id);
	
	          if (updateError) {
	            console.error(
	              "Error updating invoice with Stripe details:",
	              updateError
	            );
	          }
	        }
	      } catch (stripeErr) {
	        console.error("Error with Stripe invoice creation:", stripeErr);
	        // Continue even if Stripe invoice creation fails - we can retry later
	      }
	    } else if (paymentMethod === 'bacs') {
	      // For BACS invoices, generate a PDF and send email notification
	      try {
	        // Generate PDF first
	        const pdfResponse = await supabase.functions.invoke(
	          "generate-invoice-pdf",
	          {
	            body: {
	              invoiceId: invoice.id,
	            },
	          }
	        );
	        
	        if (pdfResponse.error) {
	          console.error("Error generating invoice PDF:", pdfResponse.error);
	          // Don't fail the whole process, just log the error
	        } else if (pdfResponse.data?.pdf_url) {
	          // Update the invoice with PDF URL
	          const { error: updateError } = await supabase
	            .from("invoices")
	            .update({
	              pdf_url: pdfResponse.data.pdf_url,
	            })
	            .eq("id", invoice.id);
	            
	          if (updateError) {
	            console.error("Error updating invoice with PDF URL:", updateError);
	          }
	        }
	        
	        // Send BACS invoice email notification (regardless of PDF success)
	        const emailResponse = await supabase.functions.invoke("send-invoice-email", {
	          body: {
	            invoiceId: invoice.id,
	            paymentMethod: 'bacs'
	          },
	        });
	        
	        if (emailResponse.error) {
	          console.error("Error sending invoice email:", emailResponse.error);
	          // Don't fail the whole process
	        }
	        
	      } catch (err) {
	        console.error("Error with BACS invoice processing:", err);
	        // Don't fail the whole process - invoice is created, PDF/email are nice-to-have
	      }
	    }
	
	    // Send notification to the parent about payment request
	    try {
	      await notificationService.notifyPaymentRequest(
	        selectedParent.id,
	        profile.studio.id,
	        totals.total,
	        dueDate,
	        invoice.id,
	        profile.studio.currency || "GBP"
	      );
	    } catch (notificationErr) {
	      console.error("Error sending payment notification:", notificationErr);
	      // Continue even if notification fails
	    }
	
	    onSuccess();
	  } catch (err) {
	    console.error("Error creating invoice:", err);
	    setError(err instanceof Error ? err.message : "Failed to create invoice");
	  } finally {
	    setIsSubmitting(false);
	  }
	};

	const getStudentOptions = () => {
		if (!selectedParent) return [];
		const parent = parents.find((p) => p.id === selectedParent.id);
		return (
			parent?.students.map((student) => ({
				id: student.id,
				label: student.name,
			})) || []
		);
	};

	const getEnrollmentOptions = (studentId: string) => {
		if (!selectedParent) return [];
		const parent = parents.find((p) => p.id === selectedParent.id);
		const student = parent?.students.find((s) => s.id === studentId);
		return (
			student?.enrollments.map((enrollment) => ({
				id: enrollment.id,
				label: `${enrollment.plan.name} - ${new Intl.NumberFormat("en-US", {
					style: "currency",
					currency: profile?.studio?.currency,
				}).format(enrollment.plan.amount)}`,
			})) || []
		);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="grid grid-cols-2 gap-4">
				<SearchableDropdown
					id="parent"
					label="Select Parent"
					value={selectedParent}
					onChange={setSelectedParent}
					options={parents.map((parent) => ({
						id: parent.id,
						label: `${parent.name} (${parent.email})`,
					}))}
					required
				/>

				<FormInput
					id="dueDate"
					type="date"
					label="Due Date"
					value={dueDate}
					onChange={(e) => setDueDate(e.target.value)}
					required
				/>
			</div>

			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<h3 className="text-lg font-medium text-brand-primary">
						Invoice Items
					</h3>
					<button
						type="button"
						onClick={addItem}
						className="flex items-center px-3 py-1 text-sm bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
					>
						<Plus className="w-4 h-4 mr-1" />
						Add Item
					</button>
				</div>

				{items.map((item, index) => (
					<div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4">
						<div className="flex justify-between">
							<h4 className="font-medium text-brand-secondary-400">
								Item {index + 1}
							</h4>
							<button
								type="button"
								onClick={() => removeItem(index)}
								className="text-gray-400 hover:text-red-500"
							>
								<Trash2 className="w-4 h-4" />
							</button>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<SearchableDropdown
								id={`student-${index}`}
								label="Student"
								value={
									item.student_id
										? {
												id: item.student_id,
												label:
													getStudentOptions().find(
														(opt) => opt.id === item.student_id
													)?.label || "",
										  }
										: null
								}
								onChange={(option) =>
									updateItem(index, { student_id: option?.id || "" })
								}
								options={getStudentOptions()}
								required
							/>

							<div>
								<label className="block text-sm font-medium text-brand-secondary-400">
									Type
								</label>
								<select
									value={item.type}
									onChange={(e) =>
										updateItem(index, { type: e.target.value as any })
									}
									className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
									required
								>
									<option value="tuition">Tuition</option>
									<option value="costume">Costume</option>
									<option value="registration">Registration</option>
									<option value="other">Other</option>
								</select>
							</div>
						</div>

						{/* {item.type === "tuition" && item.student_id && (
							<SearchableDropdown
								id={`enrollment-${index}`}
								label="Plan Enrollment"
								value={
									item.plan_enrollment_id
										? {
												id: item.plan_enrollment_id,
												label:
													getEnrollmentOptions(item.student_id).find(
														(opt) => opt.id === item.plan_enrollment_id
													)?.label || "",
										  }
										: null
								}
								onChange={(option) => {
									const enrollment = parents
										.find((p) => p.id === selectedParent?.id)
										?.students.find((s) => s.id === item.student_id)
										?.enrollments.find((e) => e.id === option?.id);

									updateItem(index, {
										plan_enrollment_id: option?.id,
										unit_price: enrollment?.plan.amount || 0,
										description: `${enrollment?.plan.name} Tuition`,
									});
								}}
								options={getEnrollmentOptions(item.student_id)}
							/>
						)} */}

						<div className="grid grid-cols-3 gap-4">
							<FormInput
								id={`description-${index}`}
								type="text"
								label="Description"
								value={item.description}
								onChange={(e) =>
									updateItem(index, { description: e.target.value })
								}
								required
							/>

							<FormInput
								id={`quantity-${index}`}
								type="number"
								label="Quantity"
								value={item.quantity.toString()}
								onChange={(e) =>
									updateItem(index, {
										quantity: parseInt(e.target.value) || 0,
									})
								}
								required
								min="1"
							/>

							<FormInput
								id={`price-${index}`}
								type="number"
								label="Unit Price"
								value={item.unit_price.toString()}
								onChange={(e) =>
									updateItem(index, {
										unit_price: parseFloat(e.target.value) || 0,
									})
								}
								required
								min="0"
								step="0.01"
							/>
						</div>

						<div className="text-right text-sm text-brand-secondary-400">
							Subtotal:{" "}
							{new Intl.NumberFormat("en-US", {
								style: "currency",
								currency: profile?.studio?.currency,
							}).format(item.quantity * item.unit_price)}
						</div>
					</div>
				))}
			</div>

			<div className="grid grid-cols-2 gap-4">
				{/* Discount Section */}
				<div>
					<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
						Discount Type
					</label>
					<select
						value={discountType}
						onChange={(e) =>
							setDiscountType(e.target.value as "percentage" | "fixed")
						}
						className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
					>
						<option value="percentage">Percentage</option>
						<option value="fixed">Fixed Amount</option>
					</select>
				</div>

				<FormInput
					id="discountValue"
					type="text"
					label={`Discount ${discountType === "percentage" ? "(%)" : "($)"}`}
					value={discountValue}
					onChange={(e) => {
						const value = e.target.value.replace(/[^\d.]/g, "");
						if ((value.match(/\./g) || []).length <= 1) {
							setDiscountValue(value);
						}
					}}
				/>

				<div className="col-span-2">
					<FormInput
						id="discountReason"
						type="text"
						label="Discount Reason"
						value={discountReason}
						onChange={(e) => setDiscountReason(e.target.value)}
						placeholder="e.g., Sibling discount, Early payment, etc."
					/>
				</div>

				{/* Recurring Payment Section */}
				<div className="col-span-2">
					<div className="flex items-center space-x-2 mb-4">
						<input
							type="checkbox"
							id="isRecurring"
							checked={isRecurring}
							onChange={(e) => setIsRecurring(e.target.checked)}
							className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
						/>
						<label
							htmlFor="isRecurring"
							className="text-sm font-medium text-gray-700"
						>
							Set as recurring payment
						</label>
					</div>

					{isRecurring && (
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
									Recurring Interval
								</label>
								<select
									value={recurringInterval}
									onChange={(e) => setRecurringInterval(e.target.value as any)}
									className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
								>
									<option value="week">Weekly</option>
									<option value="month">Monthly</option>
									<option value="year">Yearly</option>
								</select>
							</div>

							{/* Recurring Payment Schedule */}
							{isRecurring && (
								<div className="col-span-2 mt-4">
									{recurringInterval === "week" && (
										<div>
											<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
												Payment Day
											</label>
											<select
												value={weeklyDay}
												onChange={(e) => setWeeklyDay(parseInt(e.target.value))}
												className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
											>
												<option value={1}>Monday</option>
												<option value={2}>Tuesday</option>
												<option value={3}>Wednesday</option>
												<option value={4}>Thursday</option>
												<option value={5}>Friday</option>
												<option value={6}>Saturday</option>
												<option value={0}>Sunday</option>
											</select>
										</div>
									)}

									{recurringInterval === "month" && (
										<div>
											<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
												Payment Date
											</label>
											<select
												value={monthlyDate}
												onChange={(e) =>
													setMonthlyDate(parseInt(e.target.value))
												}
												className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
											>
												{Array.from({ length: 28 }, (_, i) => i + 1).map(
													(date) => (
														<option key={date} value={date}>
															{date}
														</option>
													)
												)}
											</select>
											<p className="mt-1 text-sm text-gray-500">
												Note: Payment will be processed on the last day of the
												month for months with fewer days.
											</p>
										</div>
									)}

									{/* {recurringInterval === "year" && (
										<div className="space-y-4">
											<div>
												<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
													Term Payment Months
												</label>
												<div className="grid grid-cols-3 gap-4">
													{[0, 1, 2].map((index) => (
														<div key={index}>
															<select
																value={termMonths[index]}
																onChange={(e) => {
																	const newMonths = [...termMonths];
																	newMonths[index] = parseInt(e.target.value);
																	setTermMonths(newMonths);
																}}
																className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
															>
																{Array.from(
																	{ length: 12 },
																	(_, i) => i + 1
																).map((month) => (
																	<option key={month} value={month}>
																		{new Date(2024, month - 1).toLocaleString(
																			"default",
																			{ month: "long" }
																		)}
																	</option>
																))}
															</select>
															<select
																value={termDates[index]}
																onChange={(e) => {
																	const newDates = [...termDates];
																	newDates[index] = parseInt(e.target.value);
																	setTermDates(newDates);
																}}
																className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
															>
																{Array.from(
																	{ length: 28 },
																	(_, i) => i + 1
																).map((date) => (
																	<option key={date} value={date}>
																		{date}
																	</option>
																))}
															</select>
														</div>
													))}
												</div>
											</div>
										</div>
									)} */}
								</div>
							)}

							<FormInput
								id="recurringEndDate"
								type="date"
								label="End Date"
								value={recurringEndDate}
								onChange={(e) => setRecurringEndDate(e.target.value)}
								required={isRecurring}
							/>
						</div>
					)}
				</div>
			</div>

			{/* Payment Method Selection */}
			{studioPaymentMethods.stripe && studioPaymentMethods.bacs && (
				<div className="mb-4">
					<label className="block text-sm font-medium text-brand-secondary-400 mb-2">
						Payment Method
					</label>
					<select
						value={paymentMethod}
						onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'bacs')}
						className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
						required
					>
						{studioPaymentMethods.stripe && (
							<option value="stripe">Card Payment (Stripe)</option>
						)}
						{studioPaymentMethods.bacs && (
							<option value="bacs">Bank Transfer (BACS)</option>
						)}
					</select>
					
					{paymentMethod === 'bacs' && (
						<p className="mt-2 text-sm text-gray-500">
							Parents will receive bank details to make a manual transfer. You'll need to mark payments as received.
						</p>
					)}
				</div>
			)}

			<div>
				<label
					htmlFor="notes"
					className="block text-sm font-medium text-brand-secondary-400"
				>
					Notes
				</label>
				<textarea
					id="notes"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					rows={3}
					className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
				/>
			</div>

			<div className="flex justify-between items-center pt-4 border-t">
				<div className="text-brand-secondary-400">
					<p>
						Subtotal:{" "}
						{new Intl.NumberFormat("en-US", {
							style: "currency",
							currency: profile?.studio?.currency,
						}).format(calculateTotals().subtotal)}
					</p>
					{parseFloat(discountValue) > 0 && (
						<p>
							Discount:{" "}
							{new Intl.NumberFormat("en-US", {
								style: "currency",
								currency: profile?.studio?.currency,
							}).format(calculateTotals().discount)}
							{discountType === "percentage" && ` (${discountValue}%)`}
						</p>
					)}
					<p className="text-lg font-bold text-brand-primary">
						Total:{" "}
						{new Intl.NumberFormat("en-US", {
							style: "currency",
							currency: profile?.studio?.currency,
						}).format(calculateTotals().total)}
					</p>
				</div>

				<div className="flex space-x-3">
					<button
						type="button"
						onClick={onCancel}
						className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting || items.length === 0}
						className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
					>
						<Save className="w-4 h-4 mr-2" />
						Create Invoice
					</button>
				</div>
			</div>

			{error && <p className="text-red-500 text-sm mt-4">{error}</p>}
		</form>
	);
}
