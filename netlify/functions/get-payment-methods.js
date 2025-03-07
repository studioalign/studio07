// netlify/functions/get-payment-methods.js
exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
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
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
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
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('SUPABASE_URL or SUPABASE_ANON_KEY is not set');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Server configuration error: Missing Supabase credentials'
      })
    };
  }
  
  try {
    // Initialize Stripe client
    const stripe = require('stripe')(stripeSecretKey);
    
    // Initialize Supabase with anon key
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Parse request body
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
    
    const { userId } = requestData;
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'User ID is required' })
      };
    }
    
    console.log('Getting payment methods for user:', userId);
    
    // Get user's Stripe customer ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('User not found:', userError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'User not found' })
      };
    }
    
    if (!userData.stripe_customer_id) {
      console.log('User has no Stripe customer ID');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, paymentMethods: [] })
      };
    }
    
    // Get payment methods from Stripe
    console.log('Fetching payment methods for customer:', userData.stripe_customer_id);
    const paymentMethods = await stripe.paymentMethods.list({
      customer: userData.stripe_customer_id,
      type: 'card'
    });
    
    console.log(`Found ${paymentMethods.data.length} payment methods`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        paymentMethods: paymentMethods.data
      })
    };
  } catch (error) {
    console.error('Error retrieving payment methods:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to retrieve payment methods: ' + error.message
      })
    };
  }
};
