// src/utils/stripeUtils.ts

/**
 * Test Netlify function connection
 */
export async function testNetlifyFunctionConnection(): Promise<boolean> {
  try {
    console.log('Testing Netlify function connection...');
    
    // Try to call a simple test function
    const response = await fetch('/.netlify/functions/test', {
      method: 'GET'
    });
    
    console.log('Test response status:', response.status);
    const data = await response.json();
    console.log('Test response data:', data);
    
    return response.ok;
  } catch (err) {
    console.error('Netlify function connection test failed:', err);
    return false;
  }
}

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
    const functionUrl = `${window.location.origin}/.netlify/functions/process-drop-in-payment`;
    console.log('Calling Netlify function at:', functionUrl);
    
    const response = await fetch(functionUrl, {
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
    
    // Log the raw response for debugging
    console.log('Raw response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
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
    console.error('Error processing payment (detailed):', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      error: err
    });
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Retrieves Stripe payment methods for a user
 */
export async function getStripePaymentMethods(userId: string): Promise<any[]> {
  try {
    const functionUrl = `${window.location.origin}/.netlify/functions/get-payment-methods`;
    console.log('Getting payment methods from:', functionUrl);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });
    
    console.log('Payment methods response status:', response.status);
    const data = await response.json();
    console.log('Payment methods response data:', data);
    
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

/**
 * Adds a new payment method for a user
 */
export async function addStripePaymentMethod(
  userId: string, 
  paymentMethodId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const functionUrl = `${window.location.origin}/.netlify/functions/add-payment-method`;
    console.log('Adding payment method using:', functionUrl);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userId,
        paymentMethodId 
      })
    });
    
    console.log('Add payment method response status:', response.status);
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

/**
 * Creates a setup intent for adding a new payment method
 */
export async function createSetupIntent(
  userId: string
): Promise<{ success: boolean; clientSecret?: string; error?: string }> {
  try {
    const functionUrl = `${window.location.origin}/.netlify/functions/create-setup-intent`;
    console.log('Creating setup intent using:', functionUrl);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });
    
    console.log('Setup intent response status:', response.status);
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

/**
 * Gets a Stripe payment intent status
 */
export async function getPaymentIntentStatus(
  paymentIntentId: string
): Promise<{ status: string; error?: string }> {
  try {
    const functionUrl = `${window.location.origin}/.netlify/functions/get-payment-intent`;
    console.log('Getting payment intent status from:', functionUrl);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentIntentId })
    });
    
    console.log('Payment intent status response:', response.status);
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
