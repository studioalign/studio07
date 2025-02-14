import React, { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLocalization } from '../../contexts/LocalizationContext';
import { formatCurrency } from '../../utils/formatters';
import FormInput from '../FormInput';

interface Invoice {
  id: string;
  number: string;
  total: number;
}

interface ProcessPaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProcessPaymentModal({ invoice, onClose, onSuccess }: ProcessPaymentModalProps) {
  const { currency } = useLocalization();
  const [amount, setAmount] = useState(invoice.total.toString());
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            invoice_id: invoice.id,
            amount: paymentAmount,
            payment_method: paymentMethod,
            transaction_id: transactionId || null,
            status: 'completed',
          },
        ]);

      if (paymentError) throw paymentError;
      onSuccess();
    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-brand-primary">Process Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-brand-secondary-400">Invoice Number</p>
            <p className="font-medium">{invoice.number}</p>
          </div>

          <FormInput
            id="amount"
            type="number"
            label="Payment Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            required
          />

          <div>
            <label className="block text-sm font-medium text-brand-secondary-400">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              required
            >
              <option value="card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
            </select>
          </div>

          <FormInput
            id="transactionId"
            type="text"
            label="Transaction ID (Optional)"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Process Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}