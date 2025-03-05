import React from 'react';
import { Edit2, Trash2, Users } from 'lucide-react';

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    description: string | null;
    amount: number;
    interval: string;
    active: boolean;
    enrollmentCount?: number;
    revenue?: number;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export default function PlanCard({ plan, onEdit, onDelete }: PlanCardProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatInterval = (interval: string) => {
    switch (interval) {
      case 'weekly':
        return '/week';
      case 'monthly':
        return '/month';
      case 'term':
        return '/term';
      case 'annual':
        return '/year';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-brand-primary">{plan.name}</h3>
          {plan.description && (
            <p className="text-sm text-brand-secondary-400 mt-1">{plan.description}</p>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-brand-primary"
            title="Edit plan"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500"
            title="Delete plan"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex items-baseline mb-4">
        <span className="text-2xl font-bold text-brand-primary">
          {formatAmount(plan.amount)}
        </span>
        <span className="ml-1 text-brand-secondary-400">
          {formatInterval(plan.interval)}
        </span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center text-brand-secondary-400">
          <Users className="w-5 h-5 mr-2" />
          <span>{plan.enrollmentCount || 0} enrolled</span>
        </div>
        {!plan.active && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
            Inactive
          </span>
        )}
      </div>
    </div>
  );
}