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
    // Fetch user details explicitly
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.id !== customerId) {
      console.error('User authentication mismatch', {
        currentUserId: user?.id,
        providedUserId: customerId
      });
      return { 
        success: false, 
        error: 'Authentication failed. Please log in again.'
      };
    }

    // Fetch user and studio details in one query
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id, 
        email, 
        name, 
        studio:studios (
          id,
          stripe_connect_id,
          stripe_connect_enabled,
          stripe_connect_onboarding_complete,
          currency
        )
      `)
      .eq('id', customerId)
      .single();
    
    if (userError || !userData) {
      console.error('User lookup error', { 
        error: userError, 
        userData 
      });
      return { 
        success: false, 
        error: 'User not found or studio details missing'
      };
    }

    // Validate studio details
    const studio = userData.studio;
    if (!studio || !studio.stripe_connect_id || !studio.stripe_connect_enabled) {
      console.error('Invalid studio setup', { studio });
      return { 
        success: false, 
        error: 'Studio payment setup is incomplete'
      };
    }

    // Proceed with payment processing
    const response = await fetch(`${window.location.origin}/.netlify/functions/process-drop-in-payment`, {
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
        currency: (studio.currency || currency).toLowerCase(),
        studioId: studio.id
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
    
    return {
      success: true,
      paymentId: data.paymentId
    };
  } catch (err) {
    console.error('Error processing payment (detailed):', err);
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
