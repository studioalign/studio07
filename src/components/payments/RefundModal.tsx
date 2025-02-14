import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLocalization } from '../../contexts/LocalizationContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/formatters';
import FormInput from '../FormInput';

interface Payment {
  id: string;
  amount: number;
  refunds?: {
    amount: number;
  }[];
}

interface RefundModalProps {
  payment: Payment;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RefundModal({ payment, onClose, onSuccess }: RefundModalProps) {
  const { currency } = useLocalization();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalRefunded = payment.refunds?.reduce((sum, refund) => sum + refund.amount, 0) || 0;
  const maxRefund = payment.amount - totalRefunded;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const refundAmount = parseFloat(amount);
      if (isNaN(refundAmount) || refundAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (refundAmount > maxRefund) {
        throw new Error('Refund amount cannot exceed the remaining payment amount');
      }

      // Create refund record
      const { error: refundError } = await supabase
        .from('refunds')
        .insert([
          {
            payment_id: payment.id,
            amount: refundAmount,
            reason,
            status: 'completed',
          },
        ]);

      if (refundError) throw refundError;
      onSuccess();
    } catch (err) {
      console.error('Error processing refund:', err);
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-brand-primary">Issue Refund</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-brand-secondary-400">Original Payment</p>
            <p className="font-medium">{formatCurrency(payment.amount, currency)}</p>
          </div>

          {totalRefunded > 0 && (
            <div>
              <p className="text-sm text-brand-secondary-400">Already Refunded</p>
              <p className="font-medium text-red-600">
                {formatCurrency(totalRefunded, currency)}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-brand-secondary-400">Maximum Refund</p>
            <p className="font-medium">{formatCurrency(maxRefund, currency)}</p>
          </div>

          <FormInput
            id="amount"
            type="number"
            label="Refund Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            max={maxRefund}
            step="0.01"
            required
          />

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-brand-secondary-400">
              Reason for Refund
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              required
            />
          </div>

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
              className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
            >
              Process Refund
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}