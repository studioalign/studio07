// src/utils/stripeUtils.ts

import { supabase } from '../lib/supabase';

/**
 * Processes a payment through Stripe
 */
export async function processStripePayment(
  bookingId: string,
  amount: number,
  paymentMethodId: string,
  description: string,
  customerId: string,
  currency: string = 'USD'
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  try {
    console.log('Processing payment:', {
      bookingId,
      amount,
      paymentMethodId,
      description,
      customerId,
      currency
    });
    
    // Call our Netlify function using fetch API
    const response = await fetch('/.netlify/functions/process-drop-in-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId,
        amount: Math.round(amount * 100), // Convert to cents for Stripe
        paymentMethodId,
        description,
        customerId,
        currency: currency.toLowerCase()
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Netlify function error:', response.status, data);
      return { 
        success: false, 
        error: data.error || `Payment processing failed (${response.status})`
      };
    }
    
    if (!data?.success) {
      console.error('Payment processing error:', data?.error);
      return {
        success: false,
        error: data?.error || 'Payment could not be processed'
      };
    }
    
    console.log('Payment processed successfully:', data);
    return {
      success: true,
      paymentId: data.paymentId
    };
  } catch (err) {
    console.error('Error processing payment:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Retrieves Stripe payment methods for a user
 */
// getStripePaymentMethods in stripeUtils.ts
export async function getStripePaymentMethods(userId: string): Promise<any[]> {
  try {
    // Replace Supabase function call with direct Netlify function call
    const response = await fetch('/.netlify/functions/get-payment-methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error retrieving payment methods:', data.error);
      return [];
    }
    
    return data?.paymentMethods || [];
  } catch (err) {
    console.error('Error getting payment methods:', err);
    return [];
  }
}

// addStripePaymentMethod in stripeUtils.ts
export async function addStripePaymentMethod(
  userId: string, 
  paymentMethodId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/.netlify/functions/add-payment-method', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userId,
        paymentMethodId 
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error };
    }
    
    return { success: !!data?.success };
  } catch (err) {
    console.error('Error adding payment method:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add payment method'
    };
  }
}

// createSetupIntent in stripeUtils.ts
export async function createSetupIntent(
  userId: string
): Promise<{ success: boolean; clientSecret?: string; error?: string }> {
  try {
    const response = await fetch('/.netlify/functions/create-setup-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error };
    }
    
    if (!data?.clientSecret) {
      return { success: false, error: 'No client secret returned' };
    }
    
    return {
      success: true,
      clientSecret: data.clientSecret
    };
  } catch (err) {
    console.error('Error creating setup intent:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create setup intent'
    };
  }
}

// getPaymentIntentStatus in stripeUtils.ts
export async function getPaymentIntentStatus(
  paymentIntentId: string
): Promise<{ status: string; error?: string }> {
  try {
    const response = await fetch('/.netlify/functions/get-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentIntentId })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { status: 'error', error: data.error };
    }
    
    return { status: data?.status || 'unknown' };
  } catch (err) {
    console.error('Error getting payment intent status:', err);
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Failed to get payment status'
    };
  }
}

/**
 * Adds a new payment method for a user
 */
export async function addStripePaymentMethod(
  userId: string, 
  paymentMethodId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('add-payment-method', {
      body: { 
        userId,
        paymentMethodId 
      }
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: !!data?.success };
  } catch (err) {
    console.error('Error adding payment method:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add payment method'
    };
  }
}

/**
 * Creates a setup intent for adding a new payment method
 */
export async function createSetupIntent(
  userId: string
): Promise<{ success: boolean; clientSecret?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-setup-intent', {
      body: { userId }
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    if (!data?.clientSecret) {
      return { success: false, error: 'No client secret returned' };
    }
    
    return {
      success: true,
      clientSecret: data.clientSecret
    };
  } catch (err) {
    console.error('Error creating setup intent:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create setup intent'
    };
  }
}

/**
 * Gets a Stripe payment intent status
 */
export async function getPaymentIntentStatus(
  paymentIntentId: string
): Promise<{ status: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('get-payment-intent', {
      body: { paymentIntentId }
    });
    
    if (error) {
      return { status: 'error', error: error.message };
    }
    
    return { status: data?.status || 'unknown' };
  } catch (err) {
    console.error('Error getting payment intent status:', err);
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Failed to get payment status'
    };
  }
}

/**
 * Converts payment method details to a readable format
 */
export function formatPaymentMethodDetails(method: any): string {
  if (!method) return 'Unknown payment method';
  
  if (method.type === 'card') {
    const card = method.card;
    return `${capitalizeFirstLetter(card.brand)} •••• ${card.last4}`;
  }
  
  if (method.type === 'bank_account') {
    const bank = method.bank_account;
    return `${bank.bank_name} •••• ${bank.last4}`;
  }
  
  return `${capitalizeFirstLetter(method.type)} payment method`;
}

/**
 * Helper function to capitalize the first letter of a string
 */
function capitalizeFirstLetter(string: string): string {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}
