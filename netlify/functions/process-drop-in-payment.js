// netlify/functions/process-drop-in-payment.js
exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Validate environment variables
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Use service key instead of anon key to bypass RLS
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not set');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Server configuration error: Missing Stripe key'
      })
    };
  }
  
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing request body' })
      };
    }
    
    // Initialize Stripe
    const stripe = require('stripe')(stripeSecretKey);
    
    // Initialize Supabase with SERVICE key if available
    let supabase;
    if (supabaseUrl && supabaseServiceKey) {
      const { createClient } = require('@supabase/supabase-js');
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
    
    // Parse request data
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid JSON in request body' })
      };
    }
    
    const { 
      bookingId, 
      amount, 
      paymentMethodId, 
      description, 
      customerId, 
      connectedCustomerId,
      currency = 'usd', 
      studioId,
      connectedAccountId
    } = requestData;
    
    // Basic validation of required fields
    if (!bookingId || !amount || !paymentMethodId || !customerId || !studioId || !connectedAccountId || !connectedCustomerId) {
      console.error('Missing required fields in payment request:', {
        bookingId: !!bookingId,
        amount: !!amount,
        paymentMethodId: !!paymentMethodId,
        customerId: !!customerId,
        connectedCustomerId: !!connectedCustomerId,
        studioId: !!studioId,
        connectedAccountId: !!connectedAccountId
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing required payment fields. Make sure your studio has completed Stripe Connect setup.' 
        })
      };
    }

    // Validate payment method ID format
    if (!paymentMethodId.startsWith('pm_')) {
      console.error('Invalid payment method ID format:', paymentMethodId);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid payment method ID format. Expected format: pm_*' 
        })
      };
    }
    
    console.log('Processing payment for booking:', bookingId, 'amount:', amount);
    console.log('Using connected account ID:', connectedAccountId);
    console.log('Using connected customer ID:', connectedCustomerId);

    // We'll use the payment method ID directly since it's created on the connected account
    const stripePaymentMethodId = paymentMethodId;
    
    // Fetch studio and user details for verification if Supabase is available
    if (supabase) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            email, 
            name, 
            stripe_customer_id,
            studio:studios!users_studio_id_fkey (
              id,
              stripe_connect_id,
              stripe_connect_enabled,
              stripe_connect_onboarding_complete
            )
          `)
          .eq('id', customerId)
          .single();
        
        if (userError || !userData) {
          console.error('User or studio verification failed:', userError);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'User not found or studio details missing' 
            })
          };
        }
        
        // Validate Stripe Connect setup matches provided ID
        const studio = userData.studio;
        if (!studio || !studio.stripe_connect_id || !studio.stripe_connect_enabled) {
          console.error('Studio Stripe Connect not fully set up', {
            connectId: studio?.stripe_connect_id,
            enabled: studio?.stripe_connect_enabled
          });
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Studio Stripe Connect account is not fully configured' 
            })
          };
        }
        
        // Verify the connected account ID matches what's in the database
        if (studio.stripe_connect_id !== connectedAccountId) {
          console.error('Connected account ID mismatch', {
            providedId: connectedAccountId,
            databaseId: studio.stripe_connect_id
          });
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Invalid Connected Account ID' 
            })
          };
        }
      } catch (verificationError) {
        console.error('Studio/user verification error:', verificationError);
        // We'll continue even if verification fails, since we have all the IDs
      }
    }
    
    // Create and confirm payment intent with Connected Account
    console.log('Creating payment intent with Connected Account:', connectedAccountId);
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: connectedCustomerId, // Use the connected customer ID
        payment_method: stripePaymentMethodId,
        off_session: true,
        confirm: true,
        description,
        transfer_group: bookingId,
        metadata: {
          booking_id: bookingId,
          studio_id: studioId,
          parent_id: customerId,
          type: 'drop_in_booking'
        }
      }, {
        stripeAccount: connectedAccountId // Process payment on behalf of the studio
      });
      
      console.log('Payment intent created successfully:', paymentIntent.id);
      console.log('Payment intent status:', paymentIntent.status);
      
      if (paymentIntent.status === 'succeeded') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            paymentId: paymentIntent.id
          })
        };
      } else if (paymentIntent.status === 'requires_action') {
        // The payment requires further actions from the customer (e.g., 3D Secure)
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'This payment requires additional authentication. Please use a different payment method.',
            status: paymentIntent.status,
            requiresAction: true,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret
          })
        };
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: `Payment failed with status: ${paymentIntent.status}`
          })
        };
      }
    } catch (stripeError) {
      console.error('Stripe payment creation error:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        param: stripeError.param,
        detail: stripeError.detail
      });
      
      // Return appropriate error message based on Stripe error
      let errorMessage = 'Payment processing failed';
      
      if (stripeError.code === 'payment_method_not_found') {
        errorMessage = `No such PaymentMethod: '${paymentMethodId}'`;
      } else if (stripeError.type === 'StripeCardError') {
        errorMessage = stripeError.message || 'Your card was declined';
      } else if (stripeError.type === 'StripeInvalidRequestError') {
        errorMessage = stripeError.message || 'Invalid payment request';
      } else if (stripeError.type === 'StripeAuthenticationError') {
        errorMessage = 'Studio payment configuration error';
      }
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: errorMessage,
          code: stripeError.code,
          type: stripeError.type
        })
      };
    }
  } catch (error) {
    console.error('Comprehensive Stripe payment error:', {
      name: error.name,
      message: error.message,
      type: error.type,
      code: error.code,
      raw: error.raw,
      stack: error.stack
    });
    
    // More specific error handling
    if (error.type === 'StripeAuthenticationError') {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Stripe Connect authentication failed. Please check studio Stripe account setup.'
        })
      };
    }
    
    if (error.type === 'StripeCardError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: error.message,
          code: error.code
        })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'An error occurred while processing payment: ' + error.message
      })
    };
  }
};
