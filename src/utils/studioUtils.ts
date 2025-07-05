import { StudioInfo } from '../types/studio';

/**
 * Helper function to get studio payment methods with proper fallbacks
 * CRITICAL: Use this helper function everywhere instead of directly accessing payment_methods_enabled
 */
export function getStudioPaymentMethods(studio: StudioInfo | null | undefined) {
  if (!studio) {
    return { stripe: true, bacs: false };
  }
  
  if (!studio.payment_methods_enabled) {
    // If they have Stripe set up, assume Stripe only
    if (studio.stripe_connect_id) {
      return { stripe: true, bacs: false };
    }
    // If no Stripe setup, show both options available
    return { stripe: true, bacs: true };
  }
  
  return studio.payment_methods_enabled;
}

/**
 * Check if a studio has active Stripe subscriptions
 * Used to prevent disabling Stripe if there are active subscriptions
 */
export async function hasActiveStripeSubscriptions(studioId: string) {
  try {
    const { count, error } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', studioId)
      .eq('payment_method', 'stripe')
      .eq('is_recurring', true)
      .eq('status', 'active');
      
    if (error) throw error;
    return count > 0;
  } catch (err) {
    console.error('Error checking for active subscriptions:', err);
    return false; // Default to false to allow disabling Stripe
  }
}

/**
 * Mark a BACS invoice as paid
 */
export async function markBacsInvoiceAsPaid(invoiceId: string, paymentReference?: string) {
  try {
    const { data, error } = await supabase.rpc('mark_bacs_invoice_paid', {
      p_invoice_id: invoiceId,
      p_payment_reference: paymentReference || null
    });
    
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error marking invoice as paid:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to mark invoice as paid'
    };
  }
}

import { supabase } from '../lib/supabase';