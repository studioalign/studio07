import React, { useState } from 'react';
import { CreditCard, Building2, Calendar, Save } from 'lucide-react';
import FormInput from '../FormInput';

export default function Billing() {
  const [billingInfo, setBillingInfo] = useState({
    companyName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    vatNumber: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Mock success - in real implementation, this would update billing info
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update billing information');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">Billing</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Plan */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-brand-primary mr-2" />
            <h2 className="text-lg font-medium text-brand-primary">Current Plan</h2>
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-brand-primary">Professional Plan</p>
            <p className="text-brand-secondary-400">$49/month</p>
            <p className="text-sm text-gray-500">Next billing date: January 1, 2024</p>
          </div>
          <button className="mt-4 px-4 py-2 text-sm text-brand-primary hover:text-brand-secondary-400">
            Change Plan
          </button>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="w-5 h-5 text-brand-primary mr-2" />
            <h2 className="text-lg font-medium text-brand-primary">Payment Method</h2>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700">Visa ending in 4242</p>
            <p className="text-sm text-gray-500">Expires 12/24</p>
          </div>
          <button className="mt-4 px-4 py-2 text-sm text-brand-primary hover:text-brand-secondary-400">
            Update Payment Method
          </button>
        </div>

        {/* Billing Information */}
        <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
          <div className="flex items-center mb-6">
            <Building2 className="w-5 h-5 text-brand-primary mr-2" />
            <h2 className="text-lg font-medium text-brand-primary">Billing Information</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                id="companyName"
                type="text"
                label="Company Name"
                value={billingInfo.companyName}
                onChange={(e) => setBillingInfo(prev => ({ ...prev, companyName: e.target.value }))}
              />

              <FormInput
                id="vatNumber"
                type="text"
                label="VAT Number (Optional)"
                value={billingInfo.vatNumber}
                onChange={(e) => setBillingInfo(prev => ({ ...prev, vatNumber: e.target.value }))}
              />

              <div className="md:col-span-2">
                <FormInput
                  id="address"
                  type="text"
                  label="Address"
                  value={billingInfo.address}
                  onChange={(e) => setBillingInfo(prev => ({ ...prev, address: e.target.value }))}
                  required
                />
              </div>

              <FormInput
                id="city"
                type="text"
                label="City"
                value={billingInfo.city}
                onChange={(e) => setBillingInfo(prev => ({ ...prev, city: e.target.value }))}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  id="state"
                  type="text"
                  label="State"
                  value={billingInfo.state}
                  onChange={(e) => setBillingInfo(prev => ({ ...prev, state: e.target.value }))}
                  required
                />

                <FormInput
                  id="zipCode"
                  type="text"
                  label="ZIP Code"
                  value={billingInfo.zipCode}
                  onChange={(e) => setBillingInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                  required
                />
              </div>

              <FormInput
                id="country"
                type="text"
                label="Country"
                value={billingInfo.country}
                onChange={(e) => setBillingInfo(prev => ({ ...prev, country: e.target.value }))}
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:bg-gray-400"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}