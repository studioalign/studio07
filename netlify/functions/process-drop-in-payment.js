// netlify/functions/process-drop-in-payment.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
  
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing request body' })
      };
    }
    
    const { bookingId, amount, paymentMethodId, description, customerId, currency = 'usd' } = JSON.parse(event.body);
    
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
    
    // Check if customer exists in Stripe
    let stripeCustomerId;
    
    // Lookup or create customer in Stripe
    const { data: customerData } = await supabase
      .from('users')
      .select('email, name, stripe_customer_id')
      .eq('id', customerId)
      .single();
    
    if (customerData?.stripe_customer_id) {
      stripeCustomerId = customerData.stripe_customer_id;
    } else {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
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
    
    // Create and confirm payment intent
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
    console.error('Stripe payment error:', error);
    
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
        error: 'An error occurred while processing payment'
      })
    };
  }
};