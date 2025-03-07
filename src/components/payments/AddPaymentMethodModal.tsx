// src/components/payments/AddPaymentMethodModal.tsx

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Lock } from 'lucide-react';
import FormInput from '../FormInput';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import { useAuth } from '../../contexts/AuthContext';
import { createSetupIntent, addStripePaymentMethod } from '../../utils/stripeUtils';

// Add Stripe imports
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe with a safe fallback for browser environments
// Using a direct string as fallback instead of process.env
const STRIPE_PUBLISHABLE_KEY = import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_fallback_key';
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface AddPaymentMethodModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

// Separate the form component to use inside Elements
function CardForm({ onClose, onSuccess }: AddPaymentMethodModalProps) {
  const { addPaymentMethod, refresh } = usePaymentMethods();
  const { profile } = useAuth();
  const stripe = useStripe();
  const elements = useElements();
  const [type, setType] = useState<'card' | 'bank_account'>('card');
  const [lastFour, setLastFour] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isConnectedAccount, setIsConnectedAccount] = useState(false);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);
  const [useStripeElements, setUseStripeElements] = useState(true);

  // Get setup intent on component mount
  useEffect(() => {
    async function getSetupIntent() {
      if (profile?.id && useStripeElements) {
        try {
          const result = await createSetupIntent(profile.id);
          if (result.success && result.clientSecret) {
            setClientSecret(result.clientSecret);
            setIsConnectedAccount(result.isConnectedAccount || false);
            setConnectedAccountId(result.connectedAccountId || null);
          } else {
            setError(result.error || 'Failed to initialize payment setup');
          }
        } catch (err) {
          console.error('Error getting setup intent:', err);
          setError('Failed to initialize payment setup');
        }
      }
    }
    
    getSetupIntent();
  }, [profile?.id, useStripeElements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (useStripeElements) {
        // Use Stripe Elements for real payment processing
        if (!stripe || !elements || !clientSecret) {
          throw new Error('Payment system not ready');
        }
        
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card element not found');
        }

        // Prepare options for confirmCardSetup
        const confirmOptions = {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: profile?.email,
              name: profile?.name
            }
          }
        };

        // Confirm setup with card element and connected account if needed
        const result = await stripe.confirmCardSetup(clientSecret, confirmOptions);
        
        if (result.error) {
          throw new Error(result.error.message);
        }
        
        if (!result.setupIntent?.payment_method) {
          throw new Error('Failed to set up payment method');
        }
        
        // Add payment method to database
        const addResult = await addStripePaymentMethod(
          profile?.id || '',
          result.setupIntent.payment_method as string,
          connectedAccountId
        );
        
        if (!addResult.success) {
          throw new Error(addResult.error || 'Failed to save payment method');
        }
        
        // Refresh payment methods list
        if (refresh) await refresh();
        
        // Call onSuccess if provided, otherwise just close
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      } else {
        // Use your existing manual method for testing/mockups
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

        // Call onSuccess if provided, otherwise just close
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-between mb-4">
        <div className="text-sm text-gray-500">
          {useStripeElements ? 'Live Payment Mode' : 'Test Mode'}
        </div>
        <button
          type="button"
          onClick={() => setUseStripeElements(!useStripeElements)}
          className="text-sm text-brand-primary"
        >
          Switch to {useStripeElements ? 'Test Mode' : 'Live Payment Mode'}
        </button>
      </div>

      {useStripeElements ? (
        // Stripe Elements UI
        <div>
          <label className="block text-sm font-medium text-brand-secondary-400 mb-2">
            Card Information
          </label>
          <div className="border border-gray-300 rounded-md p-4">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
          
          <div className="flex items-center text-xs text-gray-500 mt-2">
            <Lock className="w-3 h-3 mr-1" />
            <span>Card information is secured by Stripe</span>
          </div>
        </div>
      ) : (
        // Your existing UI
        <>
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
        </>
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
          disabled={isSubmitting || (useStripeElements && (!stripe || !elements))}
          className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400 flex items-center"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-opacity-50 border-t-transparent rounded-full animate-spin mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Add Payment Method
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function AddPaymentMethodModal({ onClose, onSuccess }: AddPaymentMethodModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-brand-primary">Add Payment Method</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <Elements stripe={stripePromise}>
          <CardForm onClose={onClose} onSuccess={onSuccess} />
        </Elements>
      </div>
    </div>
  );
}
