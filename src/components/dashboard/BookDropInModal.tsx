import React, { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import SearchableDropdown from '../SearchableDropdown';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';

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
    teacher_id: string;
  };
  students: { id: string; label: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookDropInModal({ classInfo, students, onClose, onSuccess }: BookDropInModalProps) {
  const { profile } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; label: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modify your BookDropInModal.tsx handleSubmit function:

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedStudent || !profile?.studio?.id) return;

  setIsSubmitting(true);
  setError(null);

  try {
    // In a real implementation, you would:
    // 1. Create a booking record in the database
    // 2. Process payment
    // 3. Add student to class attendance
    
    // For now, we'll just add a mock booking
    const spotsRemaining = classInfo.capacity - classInfo.booked_count;
    
    // Mock booking success
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Success first - close the modal and refresh the data
    onSuccess();
    
    // Send notifications in the background
    setTimeout(() => {
      try {
        // 1. Notify the teacher about the new student
        notificationService.notifyStudentAddedToClass(
          profile.studio.id,
          classInfo.teacher_id,
          selectedStudent.label,
          selectedStudent.id,
          classInfo.name,
          classInfo.id
        ).catch(err => console.error("Teacher notification failed:", err));
        
        // 2. If this was the last spot, notify studio owners that capacity is reached
        if (spotsRemaining === 1) {
          notificationService.notifyClassCapacityReached(
            profile.studio.id,
            classInfo.name,
            classInfo.id
          ).catch(err => console.error("Capacity notification failed:", err));
        }
        
        // 3. Get the parent ID to notify them about payment confirmation
        supabase
          .from("students")
          .select("parent_id")
          .eq("id", selectedStudent.id)
          .single()
          .then(({ data: studentData, error: studentError }) => {
            if (!studentError && studentData?.parent_id) {
              // Send payment confirmation to parent
              notificationService.notifyPaymentConfirmation(
                studentData.parent_id,
                profile.studio.id,
                classInfo.drop_in_price,
                classInfo.id // Using class ID in place of invoice ID for this context
              ).catch(err => console.error("Payment confirmation notification failed:", err));
            }
          })
          .catch(err => console.error("Error getting parent ID:", err));
        
        console.log("Drop-in booking notifications initiated");
      } catch (notificationErr) {
        console.error("Error initiating drop-in booking notifications:", notificationErr);
        // Notifications failed but booking succeeded
      }
    }, 100);
    
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to book class');
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