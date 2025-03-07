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
    
    // Initialize Supabase if needed
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
    
    const { bookingId, amount, paymentMethodId, description, customerId, currency = 'usd' } = requestData;
    
    if (!bookingId || !amount || !paymentMethodId || !customerId) {
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
    
    // Check if customer exists in Stripe
    let stripeCustomerId;
    
    // Use existing customer ID if available
    if (supabase) {
      const { data: customerData } = await supabase
        .from('users')
        .select('email, name, stripe_customer_id')
        .eq('id', customerId)
        .single();
      
      if (customerData?.stripe_customer_id) {
        stripeCustomerId = customerData.stripe_customer_id;
        console.log('Using existing Stripe customer:', stripeCustomerId);
      } else if (customerData) {
        // Create a new customer
        const customer = await stripe.customers.create({
          email: customerData.email,
          name: customerData.name,
          metadata: {
            supabase_id: customerId
          }
        });
        
        stripeCustomerId = customer.id;
        console.log('Created new Stripe customer:', stripeCustomerId);
        
        // Save Stripe customer ID back to user record
        await supabase
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', customerId);
      }
    } else {
      // If we don't have Supabase, just use the customer ID directly
      stripeCustomerId = customerId;
    }
    
    // Create and confirm payment intent
    console.log('Creating payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description,
      metadata: {
        booking_id: bookingId,
        type: 'drop_in_booking'
      }
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
    console.error('Stripe payment error:', {
      name: error.name,
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack
    });
    
    // Handle Stripe-specific errors
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
