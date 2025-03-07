// src/hooks/usePaymentMethods.ts

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getStripePaymentMethods } from '../utils/stripeUtils';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last_four: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
  stripe_payment_method_id: string; // Actual Stripe payment method ID
  brand?: string; // Card brand (Visa, Mastercard, etc.)
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
      setLoading(true);
      setError(null);
      
      // First, fetch payment methods from our database
      const { data: dbPaymentMethods, error: fetchError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', profile?.id)
        .order('is_default', { ascending: false });

      if (fetchError) throw fetchError;
      
      // Next, try to fetch real Stripe payment methods for verification/enrichment
      try {
        const stripePaymentMethods = await getStripePaymentMethods(profile?.id || '');
        
        // Sync database with Stripe - if we have Stripe data available
        if (stripePaymentMethods && stripePaymentMethods.length > 0) {
          // Map the Stripe data to our database format
          const syncedMethods = dbPaymentMethods?.map(dbMethod => {
            // Find matching Stripe payment method
            const stripeMethod = stripePaymentMethods.find(
              spm => spm.id === dbMethod.stripe_payment_method_id
            );
            
            // If we found a match, update with real Stripe data
            if (stripeMethod && stripeMethod.card) {
              return {
                ...dbMethod,
                last_four: stripeMethod.card.last4,
                expiry_month: stripeMethod.card.exp_month,
                expiry_year: stripeMethod.card.exp_year,
                brand: stripeMethod.card.brand
              };
            }
            
            // Return original if no match
            return dbMethod;
          });
          
          setPaymentMethods(syncedMethods || []);
        } else {
          // Just use database data if no Stripe data available
          setPaymentMethods(dbPaymentMethods || []);
        }
      } catch (stripeError) {
        console.warn('Could not fetch Stripe payment methods:', stripeError);
        // Fall back to database data only
        setPaymentMethods(dbPaymentMethods || []);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async (data: AddPaymentMethodData) => {
    try {
      if (!profile?.id) throw new Error('User not authenticated');
      
      // Insert directly with user_id
      const { error: insertError } = await supabase
        .from('payment_methods')
        .insert([
          {
            user_id: profile.id,
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
      if (!profile?.id) throw new Error('User not authenticated');

      // Remove default from all methods
      const { error: updateError1 } = await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', profile.id);

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
