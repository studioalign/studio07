import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FormInput from '../FormInput';
import SearchableDropdown from '../SearchableDropdown';
import { formatCurrency } from '../../utils/formatters';

interface Student {
  id: string;
  name: string;
  enrollments: {
    id: string;
    plan: {
      name: string;
      amount: number;
    };
  }[];
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
    name: string;
  };
}

interface Invoice {
  id: string;
  parent_id: string;
  due_date: string;
  notes: string | null;
  items: InvoiceItem[];
  status: string;
}

interface EditInvoiceFormProps {
  invoice: Invoice;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditInvoiceForm({ invoice, onSuccess, onCancel }: EditInvoiceFormProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [dueDate, setDueDate] = useState(invoice.due_date);
  const [notes, setNotes] = useState(invoice.notes || '');
  const [items, setItems] = useState<InvoiceItem[]>(invoice.items);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('students')
        .select(`
          id,
          name,
          enrollments:plan_enrollments (
            id,
            plan:pricing_plans (
              name,
              amount
            )
          )
        `)
        .eq('parent_id', invoice.parent_id);

      if (fetchError) throw fetchError;
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
    return items.reduce(
      (acc, item) => {
        const subtotal = item.quantity * item.unit_price;
        return {
          subtotal: acc.subtotal + subtotal,
          total: acc.total + subtotal,
        };
      },
      { subtotal: 0, total: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Update invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          due_date: dueDate,
          notes: notes || null,
          subtotal: calculateTotals().subtotal,
          total: calculateTotals().total,
        })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);

      if (deleteError) throw deleteError;

      // Create new items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
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

      onSuccess();
    } catch (err) {
      console.error('Error updating invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEnrollmentOptions = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    return (
      student?.enrollments.map((enrollment) => ({
        id: enrollment.id,
        label: `${enrollment.plan.name} - ${formatCurrency(enrollment.plan.amount)}`,
      })) || []
    );
  };

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
                        label: students.find((s) => s.id === item.student_id)?.name || '',
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

            {item.type === 'tuition' && item.student_id && (
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
                          )?.label || '',
                      }
                    : null
                }
                onChange={(option) => {
                  const enrollment = students
                    .find((s) => s.id === item.student_id)
                    ?.enrollments.find((e) => e.id === option?.id);

                  updateItem(index, {
                    plan_enrollment_id: option?.id,
                    unit_price: enrollment?.plan.amount || 0,
                    description: `${enrollment?.plan.name} Tuition`,
                  });
                }}
                options={getEnrollmentOptions(item.student_id)}
              />
            )}

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
              Subtotal: {formatCurrency(item.quantity * item.unit_price)}
            </div>
          </div>
        ))}
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
          <p>Subtotal: {formatCurrency(calculateTotals().subtotal)}</p>
          <p className="text-lg font-bold text-brand-primary">
            Total: {formatCurrency(calculateTotals().total)}
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