import React, { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import SearchableDropdown from '../SearchableDropdown';

interface BookDropInModalProps {
  classInfo: {
    id: string;
    name: string;
    date: string;
    start_time: string;
    end_time: string;
    drop_in_price: number;
    capacity: number;
    booked_count: number;
  };
  students: { id: string; label: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookDropInModal({ classInfo, students, onClose, onSuccess }: BookDropInModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; label: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Mock success - in real implementation, this would:
      // 1. Create a booking record
      // 2. Process payment
      // 3. Add student to class attendance
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book class');
    } finally {
      setIsSubmitting(false);
    }
  };

  const spotsRemaining = classInfo.capacity - classInfo.booked_count;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-brand-primary">Book Drop-in Class</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="font-medium text-gray-900">{classInfo.name}</h3>
          <p className="text-sm text-gray-500">
            {new Date(classInfo.date).toLocaleDateString()} at{' '}
            {new Date(`2000-01-01T${classInfo.start_time}`).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-brand-primary font-medium">
              ${classInfo.drop_in_price.toFixed(2)}
            </span>
            <span className={`text-sm ${
              spotsRemaining <= 3 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {spotsRemaining} {spotsRemaining === 1 ? 'spot' : 'spots'} remaining
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableDropdown
            id="student"
            label="Select Student"
            value={selectedStudent}
            onChange={setSelectedStudent}
            options={students}
            required
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
              disabled={isSubmitting || !selectedStudent || spotsRemaining === 0}
              className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Processing...' : `Pay $${classInfo.drop_in_price.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 