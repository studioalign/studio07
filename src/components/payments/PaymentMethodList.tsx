import React, { useState } from 'react';
import { Plus, CreditCard, Trash2, Ban as Bank } from 'lucide-react';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import AddPaymentMethodModal from './AddPaymentMethodModal';
import { useAuth } from '../../contexts/AuthContext';
import { getStudioPaymentMethods } from '../../utils/studioUtils';

export default function PaymentMethodList() {
  const { paymentMethods, loading, error, deletePaymentMethod, setDefaultMethod } = usePaymentMethods();
  const [showAddModal, setShowAddModal] = useState(false);
  const { profile } = useAuth();
  
  // Get studio payment methods
  const studioPaymentMethods = profile?.studio ? 
    getStudioPaymentMethods(profile.studio) : 
    { stripe: true, bacs: false };

  const getIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard className="w-5 h-5" />;
      case 'bank_account':
        return <Bank className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">Payment Methods</h1>
        <button
          onClick={() => studioPaymentMethods.stripe && setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
          disabled={!studioPaymentMethods.stripe}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Payment Method
        </button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">No payment methods</p>
          <p className="text-sm">Add a payment method to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
            >
              <div className="flex items-center space-x-4">
                <div className="text-brand-primary">
                  {getIcon(method.type)}
                </div>
                <div>
                  <div className="flex items-center">
                    <p className="font-medium">
                      {method.type === 'card' ? 'Card' : 'Bank Account'} ending in {method.last_four}
                    </p>
                    {method.is_default && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-brand-accent/10 text-brand-primary rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  {method.type === 'card' && method.expiry_month && method.expiry_year && (
                    <p className="text-sm text-gray-500">
                      Expires {formatExpiry(method.expiry_month, method.expiry_year)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {!method.is_default && (
                  <button
                    onClick={() => setDefaultMethod(method.id)}
                    className="text-sm text-brand-primary hover:text-brand-secondary-400"
                  >
                    Make Default
                  </button>
                )}
                <button
                  onClick={() => deletePaymentMethod(method.id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                  title="Delete payment method"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddPaymentMethodModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}