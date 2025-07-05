import React, { useState } from 'react';
import PaymentMethodList from './PaymentMethodList';
import { useAuth } from '../../contexts/AuthContext';
import { getStudioPaymentMethods } from '../../utils/studioUtils';
import { Building2 } from 'lucide-react';

export default function PaymentMethods() {
  const { profile } = useAuth();
  
  // Get studio payment methods
  const studioPaymentMethods = profile?.studio ? 
    getStudioPaymentMethods(profile.studio) : 
    { stripe: true, bacs: false };
    
  // If studio only accepts BACS, show message
  if (!studioPaymentMethods.stripe && studioPaymentMethods.bacs) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-primary">Payment Methods</h1>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <Building2 className="w-6 h-6 text-blue-600 mr-3 mt-1" />
            <div>
              <h2 className="text-lg font-medium text-blue-800 mb-2">Bank Transfer Only</h2>
              <p className="text-blue-700 mb-4">
                This studio only accepts payments via bank transfer. You'll receive invoices with payment 
                instructions when fees are due.
              </p>
              <p className="text-sm text-blue-600">
                Please contact the studio directly if you need their bank details for making payments.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Otherwise show normal payment methods list
  return <PaymentMethodList />;
}