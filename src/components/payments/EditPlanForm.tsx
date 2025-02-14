import React, { useState } from 'react';
import { Save } from 'lucide-react';
import FormInput from '../FormInput';
import { supabase } from '../../lib/supabase';

interface EditPlanFormProps {
  plan: {
    id: string;
    name: string;
    description: string | null;
    amount: number;
    interval: 'weekly' | 'monthly' | 'term' | 'annual';
    active: boolean;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditPlanForm({ plan, onSuccess, onCancel }: EditPlanFormProps) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description || '');
  const [amount, setAmount] = useState(plan.amount.toString());
  const [interval, setInterval] = useState(plan.interval);
  const [active, setActive] = useState(plan.active);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate amount
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const { error: updateError } = await supabase
        .from('pricing_plans')
        .update({
          name,
          description: description || null,
          amount: numericAmount,
          interval,
          active,
        })
        .eq('id', plan.id);

      if (updateError) throw updateError;
      onSuccess();
    } catch (err) {
      console.error('Error updating plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        id="name"
        type="text"
        label="Plan Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-brand-secondary-400">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          id="amount"
          type="text"
          label="Amount"
          value={amount}
          onChange={(e) => {
            // Allow only numbers and decimal point
            const value = e.target.value.replace(/[^\d.]/g, '');
            // Ensure only one decimal point
            if ((value.match(/\./g) || []).length <= 1) {
              setAmount(value);
            }
          }}
          required
        />

        <div>
          <label htmlFor="interval" className="block text-sm font-medium text-brand-secondary-400">
            Billing Interval
          </label>
          <select
            id="interval"
            value={interval}
            onChange={(e) => setInterval(e.target.value as any)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
            required
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="term">Term</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded"
        />
        <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
          Plan is active
        </label>
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !name.trim() || !amount.trim()}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </button>
      </div>
    </form>
  );
}