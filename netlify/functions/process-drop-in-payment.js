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
    
    // Initialize Supabase with SERVICE key
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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
      currency = 'usd', 
      studioId 
    } = requestData;
    
    if (!bookingId || !amount || !paymentMethodId || !customerId || !studioId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing required fields' 
        })
      };
    }
    
    console.log('Processing payment for booking:', bookingId, 'amount:', amount);
    
    // Fetch studio and user details
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
      .eq('studio_id', studioId)
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
    
    // Validate Stripe Connect setup
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
    
    // Ensure Stripe customer exists
    let stripeCustomerId = userData.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.name,
        metadata: {
          supabase_id: customerId
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Save Stripe customer ID back to user record
      await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', customerId);
    }
    
    // Create and confirm payment intent with Connected Account
    console.log('Creating payment intent with Connected Account:', studio.stripe_connect_id);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description,
      transfer_group: bookingId,
      metadata: {
        booking_id: bookingId,
        studio_id: studioId,
        type: 'drop_in_booking'
      }
    }, {
      stripeAccount: studio.stripe_connect_id // Process payment on behalf of the studio
    });
    
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
