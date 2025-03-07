// netlify/functions/create-setup-intent.js
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
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('SUPABASE_URL or SUPABASE_SERVICE_KEY is not set');
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
    
    // Initialize Supabase with SERVICE key
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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
    
    console.log('Creating setup intent for user:', userId);
    
    // Get user's Stripe customer ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, email, name')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'User not found' })
      };
    }
    
    let stripeCustomerId = userData.stripe_customer_id;
    console.log('Found Stripe customer ID:', stripeCustomerId || 'None - will create new');
    
    // Create customer if doesn't exist
    if (!stripeCustomerId) {
      console.log('Creating new Stripe customer for:', userData.email);
      try {
        const customer = await stripe.customers.create({
          email: userData.email,
          name: userData.name,
          metadata: {
            supabase_id: userId
          }
        });
        
        stripeCustomerId = customer.id;
        console.log('Created new Stripe customer:', stripeCustomerId);
        
        // Save Stripe customer ID back to user record
        const { error: updateError } = await supabase
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', userId);
          
        if (updateError) {
          console.error('Error updating user with Stripe customer ID:', updateError);
          // Continue anyway, as we can still create the SetupIntent
        }
      } catch (stripeErr) {
        console.error('Error creating Stripe customer:', stripeErr);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Failed to create Stripe customer: ' + stripeErr.message
          })
        };
      }
    }
    
    // Create a SetupIntent
    console.log('Creating SetupIntent for customer:', stripeCustomerId);
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
      });
      
      console.log('SetupIntent created:', setupIntent.id);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          clientSecret: setupIntent.client_secret,
          customerId: stripeCustomerId
        })
      };
    } catch (setupErr) {
      console.error('Error creating SetupIntent:', setupErr);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to create setup intent: ' + setupErr.message
        })
      };
    }
  } catch (error) {
    // Detailed error logging
    console.error('Function error:', {
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
        error: 'Server error: ' + error.message
      })
    };
  }
};
