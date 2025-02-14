import React from 'react';
import { X } from 'lucide-react';

interface RecurringClassModalProps {
  onClose: () => void;
  onConfirm: (scope: 'single' | 'future' | 'all') => void;
  action: 'edit' | 'delete';
}

export default function RecurringClassModal({ onClose, onConfirm, action }: RecurringClassModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-brand-primary">
            {action === 'edit' ? 'Edit Recurring Class' : 'Delete Recurring Class'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-brand-secondary-400 mb-6">
          {action === 'edit'
            ? 'How would you like to apply these changes?'
            : 'How would you like to handle this deletion?'}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onConfirm('single')}
            className="w-full text-left px-4 py-3 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-brand-primary">This instance only</p>
            <p className="text-sm text-brand-secondary-400">
              {action === 'edit'
                ? 'Changes will only apply to this specific class instance'
                : 'Only this specific class instance will be deleted'}
            </p>
          </button>

          <button
            onClick={() => onConfirm('future')}
            className="w-full text-left px-4 py-3 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-brand-primary">This and future instances</p>
            <p className="text-sm text-brand-secondary-400">
              {action === 'edit'
                ? 'Changes will apply to this and all future instances'
                : 'This and all future instances will be deleted'}
            </p>
          </button>

          <button
            onClick={() => onConfirm('all')}
            className="w-full text-left px-4 py-3 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <p className="font-medium text-brand-primary">All instances</p>
            <p className="text-sm text-brand-secondary-400">
              {action === 'edit'
                ? 'Changes will apply to all instances of this class'
                : 'All instances of this class will be deleted'}
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}