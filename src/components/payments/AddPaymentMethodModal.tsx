import React, { useState } from 'react';
import { X } from 'lucide-react';
import FormInput from '../FormInput';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';

interface AddPaymentMethodModalProps {
  onClose: () => void;
}

export default function AddPaymentMethodModal({ onClose }: AddPaymentMethodModalProps) {
  const { addPaymentMethod } = usePaymentMethods();
  const [type, setType] = useState<'card' | 'bank_account'>('card');
  const [lastFour, setLastFour] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (type === 'card') {
        const month = parseInt(expiryMonth);
        const year = parseInt(expiryYear);

        if (isNaN(month) || month < 1 || month > 12) {
          throw new Error('Invalid expiry month');
        }

        if (isNaN(year) || year < new Date().getFullYear()) {
          throw new Error('Invalid expiry year');
        }

        await addPaymentMethod({
          type,
          last_four: lastFour,
          expiry_month: month,
          expiry_year: year,
        });
      } else {
        await addPaymentMethod({
          type,
          last_four: lastFour,
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-brand-primary">Add Payment Method</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-secondary-400">
              Payment Type
            </label>
            <div className="mt-1 flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="card"
                  checked={type === 'card'}
                  onChange={(e) => setType(e.target.value as 'card')}
                  className="mr-2"
                />
                Credit Card
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="bank_account"
                  checked={type === 'bank_account'}
                  onChange={(e) => setType(e.target.value as 'bank_account')}
                  className="mr-2"
                />
                Bank Account
              </label>
            </div>
          </div>

          <FormInput
            id="lastFour"
            type="text"
            label={type === 'card' ? 'Last 4 digits of card' : 'Last 4 digits of account'}
            value={lastFour}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              if (value.length <= 4) {
                setLastFour(value);
              }
            }}
            required
            maxLength={4}
          />

          {type === 'card' && (
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                id="expiryMonth"
                type="text"
                label="Expiry Month (MM)"
                value={expiryMonth}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 2) {
                    setExpiryMonth(value);
                  }
                }}
                required
                maxLength={2}
              />

              <FormInput
                id="expiryYear"
                type="text"
                label="Expiry Year (YYYY)"
                value={expiryYear}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 4) {
                    setExpiryYear(value);
                  }
                }}
                required
                maxLength={4}
              />
            </div>
          )}

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
              Add Payment Method
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}