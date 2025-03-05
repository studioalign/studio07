import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FormInput from '../FormInput';
import SearchableDropdown from '../SearchableDropdown';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';


interface Student {
  id: string;
  name: string;
}

interface InvoiceItem {
  id?: string;
  student_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  type: 'tuition' | 'costume' | 'registration' | 'other';
  plan_enrollment_id?: string;
  student?: {
    id?: string;
    name?: string;
  };
}

interface Invoice {
  id: string;
  parent_id: string;
  due_date: string;
  notes: string | null;
  items: InvoiceItem[];
  status: string;
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  discount_reason?: string;
  is_recurring?: boolean;
  recurring_interval?: "week" | "month" | "year";
  recurring_end_date?: string;
}

interface EditInvoiceFormProps {
  invoice: Invoice;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditInvoiceForm({ invoice, onSuccess, onCancel }: EditInvoiceFormProps) {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [dueDate, setDueDate] = useState(invoice.due_date || '');
  const [notes, setNotes] = useState(invoice.notes || '');
  const [items, setItems] = useState<InvoiceItem[]>(invoice.items || []);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recurring payment states
  const [isRecurring, setIsRecurring] = useState(invoice.is_recurring || false);
  const [recurringInterval, setRecurringInterval] = useState<"week" | "month" | "year">(
    invoice.recurring_interval || "month"
  );
  const [weeklyDay, setWeeklyDay] = useState<number>(1); // Default to Monday
  const [monthlyDate, setMonthlyDate] = useState<number>(1); // Default to 1st of month
  const [recurringEndDate, setRecurringEndDate] = useState(invoice.recurring_end_date || '');

  // Discount-related states
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    (invoice.discount_type as "percentage" | "fixed") || "percentage"
  );
  const [discountValue, setDiscountValue] = useState(
    invoice.discount_value ? invoice.discount_value.toString() : ''
  );
  const [discountReason, setDiscountReason] = useState(invoice.discount_reason || '');

  useEffect(() => {
    // Log the incoming invoice data to help debug
    console.log("Editing invoice:", invoice);
    console.log("Invoice items:", invoice.items);
    
    fetchStudents();
    
    // Ensure items are properly formatted with all required fields
    if (invoice.items) {
      setItems(invoice.items.map(item => ({
        ...item,
        student_id: item.student_id || (item.student?.id || ''),
        description: item.description || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        type: item.type || 'tuition'
      })));
    }
  }, [invoice.id]);

  const fetchStudents = async () => {
    try {
      // First, ensure we have a valid parent_id
      let parentId = invoice.parent_id;

      if (!parentId) {
        // If no parent_id, try to fetch it from the invoice
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('parent_id')
          .eq('id', invoice.id)
          .single();

        if (invoiceError || !invoiceData?.parent_id) {
          throw new Error('Unable to retrieve parent information');
        }

        parentId = invoiceData.parent_id;
      }

      // Now fetch students for the parent
      const { data, error: fetchError } = await supabase
        .from('students')
        .select(`
          id,
          name
        `)
        .eq('parent_id', parentId);

      if (fetchError) throw fetchError;
      
      if (!data || data.length === 0) {
        console.warn('No students found for parent:', parentId);
      }
      
      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        student_id: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        type: 'tuition',
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
      (acc, item) => acc + (item.quantity * item.unit_price),
      0
    );
    
    // Calculate discount
    let discount = 0;
    if (discountValue && !isNaN(parseFloat(discountValue))) {
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
      total
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const totals = calculateTotals();
      
      // Prepare update data with only the fields that need updating
      const updateData = {
        due_date: dueDate,
        notes: notes || null,
        subtotal: totals.subtotal,
        total: totals.total,
        discount_type: discountType || 'percentage',  // Default to percentage
        discount_value: discountValue ? parseFloat(discountValue) : 0,
        discount_reason: discountReason || null,
        is_recurring: isRecurring,
        // Always provide a value for recurring_interval even if is_recurring is false
        recurring_interval: isRecurring ? recurringInterval : 'month', // Default to 'month'
        recurring_end_date: isRecurring ? recurringEndDate : null
      };

      console.log("Updating invoice with data:", updateData);
      
      // 1. Update invoice in database
      const { data: updatedInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoice.id)
        .select()
        .single();

      if (invoiceError) {
        console.error("Supabase invoice update error:", invoiceError);
        throw invoiceError;
      }

      // 2. Delete existing items
      console.log("Deleting existing invoice items for invoice:", invoice.id);
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);

      if (deleteError) {
        console.error("Error deleting invoice items:", deleteError);
        throw deleteError;
      }

      // 3. Create new items
      const newItems = items.map(item => ({
        invoice_id: invoice.id,
        student_id: item.student_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        total: item.quantity * item.unit_price,
        type: item.type
      }));
      
      console.log("Creating new invoice items:", newItems);
      
      const { data: createdItems, error: itemsError } = await supabase
        .from('invoice_items')
        .insert(newItems)
        .select();

      if (itemsError) {
        console.error("Error inserting invoice items:", itemsError);
        throw itemsError;
      }

      // 4. Update Stripe invoice using existing create-stripe-invoice function 
      // since the update-stripe-invoice doesn't exist
      if (invoice.stripe_invoice_id) {
        try {
          console.log("Attempting to update Stripe using create-stripe-invoice function:", invoice.stripe_invoice_id);
          
          // Try to use the existing create-stripe-invoice function with explicit due_date
          const response = await supabase.functions.invoke(
            "create-stripe-invoice",
            {
              body: {
                invoiceId: invoice.id,
                due_date: dueDate, // Explicitly include due_date
                // Include additional information to ensure PDF is generated correctly
                total: totals.total,
                subtotal: totals.subtotal,
                discount: {
                  type: discountType,
                  value: discountValue ? parseFloat(discountValue) : 0
                }
              },
            }
          );

          if (response.error) {
            console.error("Error updating Stripe invoice:", response.error);
            setError(`Warning: The invoice was updated in our system, but we couldn't update it in Stripe. 
                     Please contact support for assistance. Error: ${response.error.message || 'Unknown error'}`);
          } else {
            console.log("Stripe invoice handled successfully:", response);
            // Update the invoice with new Stripe details if provided
            if (response.data && response.data.stripe_invoice_id) {
              const { error: updateError } = await supabase
                .from('invoices')
                .update({
                  stripe_invoice_id: response.data.stripe_invoice_id,
                  pdf_url: response.data.pdf_url,
                })
                .eq('id', invoice.id);
                
              if (updateError) {
                console.error("Error updating invoice with new Stripe details:", updateError);
              }
            }
          }
        } catch (stripeErr) {
          console.error("Failed to update Stripe invoice:", stripeErr);
          setError(`Warning: The invoice was updated in our system, but we encountered an issue with Stripe. 
                   The changes may not be reflected in the payment system. Error: ${stripeErr.message || 'Unknown error'}`);
        }
      } else {
        console.log("No Stripe invoice ID found - skipping Stripe update");
      }

      // 5. Send notification about updated invoice if status is pending
      if (invoice.status === 'pending' && profile?.studio?.id) {
        try {
          console.log("Sending notification for updated invoice to parent:", invoice.parent_id);
          
          // Get the parent ID directly if not available on the invoice
          let parentId = invoice.parent_id;
          if (!parentId) {
            const { data: invoiceData, error: parentLookupError } = await supabase
              .from('invoices')
              .select('parent_id')
              .eq('id', invoice.id)
              .single();
              
            if (parentLookupError) {
              console.error("Error looking up parent_id:", parentLookupError);
            } else {
              parentId = invoiceData.parent_id;
            }
          }
          
          // Check if parent_id is valid before sending notification
          if (parentId && parentId.trim() !== '') {
            await notificationService.notifyPaymentRequest(
              parentId,
              profile.studio.id,
              totals.total,
              dueDate,
              invoice.id,
              profile.studio?.currency || 'USD'
            );
            console.log("Payment update notification sent successfully");
          } else {
            console.warn("Cannot send notification: Invalid parent_id", parentId);
          }
        } catch (notifyErr) {
          console.error("Error sending payment notification:", notifyErr);
          // Continue even if notification fails - this is not critical
        }
      } else {
        console.log("Skipping notification:", {
          status: invoice.status,
          studioId: profile?.studio?.id,
          parentId: invoice.parent_id
        });
      }

      onSuccess();
    } catch (err) {
      console.error('Error updating invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Removed getEnrollmentOptions function as it's not needed

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormInput
        id="dueDate"
        type="date"
        label="Due Date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        required
      />

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-brand-primary">Invoice Items</h3>
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
              <h4 className="font-medium text-brand-secondary-400">Item {index + 1}</h4>
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
                        label: students.find((s) => s.id === item.student_id)?.name || 
                              item.student?.name || 'Unknown Student',
                      }
                    : null
                }
                onChange={(option) =>
                  updateItem(index, { student_id: option?.id || '' })
                }
                options={students.map((student) => ({
                  id: student.id,
                  label: student.name,
                }))}
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

            {/* Removed Plan Enrollment section as it's not used in the app */}

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
              Subtotal: {formatCurrency(item.quantity * item.unit_price, profile?.studio?.currency)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      {/* Recurring Payment Section */}
      <div>
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

            <FormInput
              id="recurringEndDate"
              type="date"
              label="End Date"
              value={recurringEndDate}
              onChange={(e) => setRecurringEndDate(e.target.value)}
              required={isRecurring}
              className="col-span-2"
            />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-brand-secondary-400">
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
            {formatCurrency(calculateTotals().subtotal, profile?.studio?.currency)}
          </p>
          {parseFloat(discountValue) > 0 && (
            <p>
              Discount:{" "}
              {formatCurrency(calculateTotals().discount, profile?.studio?.currency)}
              {discountType === "percentage" && ` (${discountValue}%)`}
            </p>
          )}
          <p className="text-lg font-bold text-brand-primary">
            Total:{" "}
            {formatCurrency(calculateTotals().total, profile?.studio?.currency)}
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
            Save Changes
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </form>
  );
}