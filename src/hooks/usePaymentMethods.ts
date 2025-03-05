import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last_four: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
  stripe_payment_method_id?: string;
}

interface AddPaymentMethodData {
  type: 'card' | 'bank_account';
  last_four: string;
  expiry_month?: number;
  expiry_year?: number;
}

export function usePaymentMethods() {
  const { profile } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    fetchPaymentMethods();
  }, [profile?.id]);

  const fetchPaymentMethods = async () => {
    try {
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', profile?.id)
        .single();

      if (!parentData) return;

      const { data, error: fetchError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('parent_id', parentData.id)
        .order('is_default', { ascending: false });

      if (fetchError) throw fetchError;
      setPaymentMethods(data || []);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async (data: AddPaymentMethodData) => {
    try {
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', profile?.id)
        .single();

      if (!parentData) throw new Error('Parent not found');

      const { error: insertError } = await supabase
        .from('payment_methods')
        .insert([
          {
            parent_id: parentData.id,
            type: data.type,
            last_four: data.last_four,
            expiry_month: data.expiry_month,
            expiry_year: data.expiry_year,
            is_default: paymentMethods.length === 0, // Make default if first payment method
          },
        ]);

      if (insertError) throw insertError;
      fetchPaymentMethods();
    } catch (err) {
      throw err;
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      const method = paymentMethods.find(m => m.id === id);
      if (!method) return;

      const { error: deleteError } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // If deleted method was default, make the first remaining method default
      if (method.is_default && paymentMethods.length > 1) {
        const nextDefault = paymentMethods.find(m => m.id !== id);
        if (nextDefault) {
          await setDefaultMethod(nextDefault.id);
        }
      }

      fetchPaymentMethods();
    } catch (err) {
      console.error('Error deleting payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete payment method');
    }
  };

  const setDefaultMethod = async (id: string) => {
    try {
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', profile?.id)
        .single();

      if (!parentData) throw new Error('Parent not found');

      // Remove default from all methods
      const { error: updateError1 } = await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('parent_id', parentData.id);

      if (updateError1) throw updateError1;

      // Set new default
      const { error: updateError2 } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', id);

      if (updateError2) throw updateError2;

      fetchPaymentMethods();
    } catch (err) {
      console.error('Error setting default payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to set default payment method');
    }
  };

  return {
    paymentMethods,
    loading,
    error,
    addPaymentMethod,
    deletePaymentMethod,
    setDefaultMethod,
    refresh: fetchPaymentMethods,
  };
}