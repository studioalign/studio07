// src/components/dashboard/BookDropInModal.tsx

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import SearchableDropdown from '../SearchableDropdown';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import { bookDropInClass } from '../../utils/bookingUtils';
import { formatCurrency } from '../../utils/formatters';
import AddPaymentMethodModal from '../payments/AddPaymentMethodModal';

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
  const { paymentMethods, loading: loadingPaymentMethods, refresh: refreshPaymentMethods } = usePaymentMethods();
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; label: string } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);

  // Use default payment method if available
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethod) {
        const defaultMethod = paymentMethods.find(method => method.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      } else {
        setSelectedPaymentMethod(paymentMethods[0].id);
      }
    }
  }, [paymentMethods, selectedPaymentMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedPaymentMethod || !profile?.studio?.id) return;
    console.log('Starting drop-in class booking process');

    setIsSubmitting(true);
    setError(null);
    setBookingStatus('processing');

    try {
      // First verify the payment method exists in the connected account
      const { data: connectedCustomer, error: customerError } = await supabase
        .from('connected_customers')
        .select('stripe_connected_customer_id')
        .eq('parent_id', profile.id)
        .eq('studio_id', profile.studio.id)
        .single();

      if (customerError || !connectedCustomer?.stripe_connected_customer_id) {
        console.error('No connected customer found:', customerError);
        throw new Error('Payment setup required. Please add a payment method first.');
      }

      // Calculate totals
      const totals = {
        subtotal: classInfo.drop_in_price,
      };

      const result = await bookDropInClass(
        classInfo.id,
        selectedStudent.id,
        selectedPaymentMethod,
        profile.studio.id
      );

      if (!result.success) {
        setError(result.error || 'Failed to book class');
        setBookingStatus('error');
        setIsSubmitting(false);
        return;
      }

      // Success!
      console.log('Drop-in class booked successfully');
      setBookingStatus('success');
      
      // Wait briefly to show success message before closing
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Error booking class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to book class';
      setError(errorMessage);
      setBookingStatus('error');
      if (errorMessage.includes('Payment setup required')) {
        // Show add payment method modal
        setShowAddPaymentMethod(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const spotsRemaining = classInfo.capacity - classInfo.booked_count;

  // Success state
  if (bookingStatus === 'success') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 w-full max-w-md text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-green-700 mb-2">Booking Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your drop-in class has been booked and payment processed successfully.
          </p>
          <button
            onClick={onSuccess}
            className="px-6 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

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
              {formatCurrency(classInfo.drop_in_price, profile?.studio?.currency || 'USD')}
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

          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-brand-secondary-400 mb-2">
              Payment Method
            </label>
            
            {loadingPaymentMethods ? (
              <div className="animate-pulse space-y-2">
                <div className="h-14 bg-gray-200 rounded-md" />
                <div className="h-14 bg-gray-200 rounded-md" />
              </div>
            ) : paymentMethods.length > 0 ? (
              <div className="space-y-2">
                {paymentMethods.map(method => (
                  <div 
                    key={method.id}
                    className={`p-3 border rounded-md cursor-pointer ${
                      selectedPaymentMethod === method.id ? 'border-brand-primary bg-brand-secondary-100/10' : 'border-gray-300'
                    }`}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                  >
                    <div className="flex items-center">
                      <CreditCard className="w-5 h-5 mr-2 text-gray-500" />
                      <div>
                        <p className="font-medium">
                          {method.type === 'card' ? `••••${method.last_four}` : `Bank account ending in ${method.last_four}`}
                        </p>
                        {method.type === 'card' && method.expiry_month && (
                          <p className="text-sm text-gray-500">
                            Expires {method.expiry_month}/{method.expiry_year}
                          </p>
                        )}
                      </div>
                      {method.is_default && (
                        <span className="ml-auto text-xs bg-gray-100 px-2 py-1 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => setShowAddPaymentMethod(true)}
                  className="text-brand-primary hover:underline text-sm flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add new payment method
                </button>
              </div>
            ) : (
              <div className="text-center py-4 border rounded-md">
                <p className="text-gray-500 mb-2">No payment methods found</p>
                <button
                  type="button"
                  onClick={() => setShowAddPaymentMethod(true)}
                  className="px-4 py-2 bg-brand-primary text-white rounded-md"
                >
                  Add Payment Method
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-md mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Drop-in class fee</span>
              <span>{formatCurrency(classInfo.drop_in_price, profile?.studio?.currency || 'USD')}</span>
            </div>
            <div className="flex justify-between font-medium text-gray-900 border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(classInfo.drop_in_price, profile?.studio?.currency || 'USD')}</span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedStudent || !selectedPaymentMethod || spotsRemaining === 0}
              className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-opacity-50 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay {formatCurrency(classInfo.drop_in_price, profile?.studio?.currency || 'USD')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {showAddPaymentMethod && (
        <AddPaymentMethodModal
          onClose={() => setShowAddPaymentMethod(false)}
          onSuccess={() => {
            setShowAddPaymentMethod(false);
            // Refresh payment methods
            if (refreshPaymentMethods) {
              refreshPaymentMethods();
            }
          }}
        />
      )}
    </div>
  );
}
