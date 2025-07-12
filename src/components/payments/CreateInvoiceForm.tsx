// src/components/payments/CreateInvoiceForm.tsx
import React, { useState, useEffect } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useData } from "../../contexts/DataContext";
import FormInput from "../FormInput";
import SearchableDropdown from "../SearchableDropdown";
import MultiSelectDropdown from "../MultiSelectDropdown";
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
	const [selectedParents, setSelectedParents] = useState<{
		id: string;
		label: string;
	}[]>([]);
	const [sendToMultiple, setSendToMultiple] = useState(false);
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
	const [bacsReference, setBacsReference] = useState("");

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
				student_id: sendToMultiple ? "" : "", // Always empty for multi-parent
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
	  if (!profile?.studio?.id) return;
	  if (!sendToMultiple && !selectedParent) return;
	if (sendToMultiple && (!selectedParents || selectedParents.length === 0)) return;

		const invalidItems = items.some(item => {
			if (sendToMultiple) {
				// For multi-parent, only require description and valid pricing
				return !item.description.trim() || item.unit_price <= 0 || item.quantity <= 0;
			} else {
				// For single parent, require student selection too
				return !item.student_id || !item.description.trim() || item.unit_price <= 0 || item.quantity <= 0;
			}
		});
		
		if (invalidItems) {
			setError(sendToMultiple 
				? "All items must have a description, valid quantity, and price" 
				: "All items must have a student, description, valid quantity, and price"
			);
			return;
		}
	  
	  setIsSubmitting(true);
	  setError(null);
	  
	  // Determine which parents to send invoices to
	  const parentsToInvoice = sendToMultiple ? selectedParents : [selectedParent!];
	  
	  try {
		  // Calculate totals
		  const totals = calculateTotals();
		  
		  // Create invoices for each parent
		  for (const parent of parentsToInvoice) {
		    // Generate BACS reference INSIDE the loop, AFTER invoice creation
		    const tempBacsReference = bacsReference.trim() || null;
		    
		    // Create invoice
		    const invoiceData = {
		      studio_id: profile?.studio?.id,
		      parent_id: parent.id,
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
		      manual_payment_reference: tempBacsReference, // Use temp reference or null
		      stripe_invoice_id: null,
		      pdf_url: null,
		    };
		    
		    const { data: invoice, error: invoiceError } = await supabase
		      .from("invoices")
		      .insert([invoiceData])
		      .select()
		      .single();
		
		    if (invoiceError) throw invoiceError;
		
		    // NOW we have the invoice, so we can generate the final BACS reference
		    const finalBacsReference = tempBacsReference || `Invoice ${invoice.index}`;
		    
		    // Update the invoice with the final BACS reference if needed
		    if (paymentMethod === 'bacs' && !tempBacsReference) {
		      const { error: updateRefError } = await supabase
		        .from("invoices")
		        .update({
		          manual_payment_reference: finalBacsReference
		        })
		        .eq("id", invoice.id);
		        
		      if (updateRefError) {
		        console.error("Error updating BACS reference:", updateRefError);
		      }
		    }
		
		    // Create invoice items (rest of the code stays the same)
		    const { error: itemsError } = await supabase.from("invoice_items").insert(
		      items.map((item) => ({
		        invoice_id: invoice.id,
		        student_id: sendToMultiple ? null : item.student_id,
		        description: item.description,
		        quantity: item.quantity,
		        unit_price: item.unit_price,
		        subtotal: item.quantity * item.unit_price,
		        total: item.quantity * item.unit_price,
		        type: item.type,
		        plan_enrollment_id: sendToMultiple ? null : item.plan_enrollment_id,
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
	                paymentMethod: 'bacs', // Add this parameter
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
	              paymentMethod: 'bacs' // Ensure this is explicitly set
	            },
	          });
	          
	          if (emailResponse.error) {
	            console.error("Error sending invoice email:", emailResponse.error);
	            // Log the full error details for debugging
	            console.error("Full email error details:", {
	              error: emailResponse.error,
	              invoiceId: invoice.id,
	              paymentMethod: 'bacs'
	            });
	            
	            // Show error to user but don't fail the whole process
	            setError(`Invoice created but email failed to send: ${emailResponse.error.message || 'Unknown email error'}`);
	          } else {
	            console.log("BACS invoice email sent successfully");
	          }
	          
	        } catch (err) {
	          console.error("Error with BACS invoice processing:", err);
	          // Log more details for debugging
	          console.error("BACS processing error details:", {
	            error: err,
	            invoiceId: invoice.id,
	            paymentMethod: 'bacs'
	          });
	          
	          // Show error to user but don't fail the whole process
	          setError(`Invoice created but there was an issue with email/PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
	        }
	      }
	  
	      // Send notification to the parent about payment request
	      if (paymentMethod === 'bacs') {
		  // Use BACS-specific notification (in-app only)
		  try {
		    await notificationService.notifyBacsPaymentRequest(
		      parent.id,
		      profile.studio.id,
		      totals.total,
		      dueDate,
		      invoice.id,
		      profile.studio.currency || "GBP",
		      finalBacsReference
		    );
		  } catch (notificationErr) {
		    console.error("Error sending BACS notification:", notificationErr);
		  }
		} else {
		  // Use regular notification (in-app + email)
		  try {
		    await notificationService.notifyPaymentRequest(
		      parent.id,
		      profile.studio.id,
		      totals.total,
		      dueDate,
		      invoice.id,
		      profile.studio.currency || "GBP"
		    );
		  } catch (notificationErr) {
		    console.error("Error sending payment notification:", notificationErr);
		  }
		}
	    }
	    
	    // Call success after all invoices are created
	    onSuccess();
	  } catch (err) {
	    console.error("Error creating invoice:", err);
	    setError(err instanceof Error ? err.message : "Failed to create invoice");
	  } finally {
	    setIsSubmitting(false);
	  }
	};

	const getStudentOptions = () => {
		// Only return student options for single parent mode
		if (sendToMultiple) return [];
		
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
		// Only return enrollment options for single parent mode
		if (sendToMultiple) return [];
		
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
				<div>
					<div className="flex items-center mb-2">
						<label className="block text-sm font-medium text-brand-secondary-400">
							Parent Selection
						</label>
						<div className="ml-auto">
							<label className="flex items-center space-x-2 text-sm">
								<input
									type="checkbox"
									checked={sendToMultiple}
									onChange={(e) => {
										setSendToMultiple(e.target.checked);
										// Clear selected parent when switching to multiple
										if (e.target.checked) {
											setSelectedParent(null);
										} else {
											setSelectedParents([]);
										}
									}}
									className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
								/>
								<span>Send to multiple parents</span>
							</label>
						</div>
					</div>
					
					{sendToMultiple ? (
						<MultiSelectDropdown
							id="parents"
							label=""
							value={selectedParents}
							onChange={setSelectedParents}
							options={parents.map((parent) => ({
								id: parent.id,
								label: `${parent.name} (${parent.email})`,
							}))}
							isLoading={false}
							error={selectedParents.length === 0 ? "Select at least one parent" : null}
						/>
					) : (
						<SearchableDropdown
							id="parent"
							label=""
							value={selectedParent}
							onChange={setSelectedParent}
							options={parents.map((parent) => ({
								id: parent.id,
								label: `${parent.name} (${parent.email})`,
							}))}
							required
						/>
					)}
				</div>

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
				
						<div className="space-y-4"> {/* Remove the grid-cols-2, use space-y-4 instead */}
						    {/* Student selection or placeholder */}
						    {!sendToMultiple ? (
						        <SearchableDropdown
						            id={`student-${index}`}
						            label="Student"
						            value={
						                item.student_id
						                    ? {
						                            id: item.student_id,
						                            label:
						                                getStudentOptions().find((s) => s.id === item.student_id)
						                                    ?.label || "",
						                      }
						                    : null
						            }
						            onChange={(student) =>
						                updateItem(index, { student_id: student?.id || "" })
						            }
						            options={getStudentOptions()}
						            required
						        />
						    ) : (
						        <div>
						            <label className="block text-sm font-medium text-brand-secondary-400 mb-2">
						                Student
						            </label>
						            <div className="mt-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 text-sm">
						                Multiple families - no student selection required
						            </div>
						        </div>
						    )}
						
						    {/* Description field - full width */}
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
						    
						    {/* Quantity and price in a 2-column grid */}
						    <div className="grid grid-cols-2 gap-4">
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
						
						    {/* Subtotal display */}
						    <div className="text-right text-sm text-brand-secondary-400">
						        Subtotal:{" "}
						        {new Intl.NumberFormat("en-US", {
						            style: "currency",
						            currency: profile?.studio?.currency,
						        }).format(item.quantity * item.unit_price)}
						    </div>
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
			
			{/* BACS Reference Field */}
			{paymentMethod === 'bacs' && (
				<div className="mb-4">
					<label className="block text-sm font-medium text-brand-secondary-400 mb-2">
						Payment Reference
					</label>
					<input
						type="text"
						value={bacsReference}
						onChange={(e) => setBacsReference(e.target.value)}
						placeholder="Leave blank to generate automatically"
						className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
					/>
					<p className="mt-1 text-xs text-gray-500">
						This reference will be shown to parents in the invoice. If left blank, a unique reference will be generated.
					</p>
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
						disabled={isSubmitting || items.length === 0 || (sendToMultiple && selectedParents.length === 0) || (!sendToMultiple && !selectedParent)}
						className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
					>
						<Save className="w-4 h-4 mr-2" />
						{sendToMultiple ? `Create ${selectedParents.length} Invoices` : "Create Invoice"}
					</button>
				</div>
			</div>

			{error && <p className="text-red-500 text-sm mt-4">{error}</p>}
		</form>
	);
}
