import React, { useState, useEffect } from "react";
import { Building2, Save, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface BankDetails {
  account_name: string;
  account_number: string;
  sort_code: string;
  bank_name: string;
}

export default function BankDetailsSetup() {
  const { profile } = useAuth();
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    account_name: '',
    account_number: '',
    sort_code: '',
    bank_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadBankDetails();
  }, [profile?.studio?.id]);

  const loadBankDetails = async () => {
    if (!profile?.studio?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("studio_bank_details")
        .select("*")
        .eq("studio_id", profile.studio.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error is ok
        throw error;
      }

      if (data) {
        setBankDetails({
          account_name: data.account_name || '',
          account_number: data.account_number || '',
          sort_code: data.sort_code || '',
          bank_name: data.bank_name || ''
        });
      }
    } catch (err) {
      console.error("Error loading bank details:", err);
      setError(err instanceof Error ? err.message : "Failed to load bank details");
    } finally {
      setLoading(false);
    }
  };

  const saveBankDetails = async () => {
    if (!profile?.studio?.id) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from("studio_bank_details")
        .upsert({
          studio_id: profile.studio.id,
          account_name: bankDetails.account_name,
          account_number: bankDetails.account_number,
          sort_code: bankDetails.sort_code,
          bank_name: bankDetails.bank_name,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving bank details:", err);
      setError(err instanceof Error ? err.message : "Failed to save bank details");
    } finally {
      setSaving(false);
    }
  };

  const formatSortCode = (value: string) => {
    // Remove non-digits and limit to 6 digits
    const digits = value.replace(/\D/g, '').slice(0, 6);
    // Format as XX-XX-XX
    return digits.replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3').slice(0, 8);
  };

  const handleSortCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSortCode(e.target.value);
    setBankDetails(prev => ({ ...prev, sort_code: formatted }));
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="animate-pulse">Loading bank details...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        <Building2 className="w-5 h-5 text-brand-accent mr-2" />
        <h3 className="font-medium">Bank Transfer Details</h3>
      </div>
      
      <div className="pl-7 space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Enter your bank details to display on BACS invoices for parent payments.
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <span className="text-sm text-green-700">Bank details saved successfully!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={bankDetails.account_name}
              onChange={(e) => setBankDetails(prev => ({ ...prev, account_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              placeholder="Studio Account Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Name
            </label>
            <input
              type="text"
              value={bankDetails.bank_name}
              onChange={(e) => setBankDetails(prev => ({ ...prev, bank_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              placeholder="e.g. Barclays, HSBC, Lloyds"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              value={bankDetails.account_number}
              onChange={(e) => setBankDetails(prev => ({ ...prev, account_number: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              placeholder="12345678"
              maxLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Code
            </label>
            <input
              type="text"
              value={bankDetails.sort_code}
              onChange={handleSortCodeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              placeholder="12-34-56"
              maxLength={8}
            />
          </div>
        </div>

        <button
          onClick={saveBankDetails}
          disabled={saving || !bankDetails.account_name || !bankDetails.account_number || !bankDetails.sort_code}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Bank Details"}
        </button>
      </div>
    </div>
  );
}
