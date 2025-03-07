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
    
    const { userId } = requestData;
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'User ID is required' })
      };
    }
    
    // Get user details including studio info for parents
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        email,
        name,
        role,
        stripe_customer_id,
        studio:studios!users_studio_id_fkey (
          id,
          stripe_connect_id,
          stripe_connect_enabled
        )
      `)
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'User not found' })
      };
    }

    // For parents, we need to handle Stripe Connect
    if (userData.role === 'parent' && userData.studio?.stripe_connect_id) {
      console.log('Parent user detected, handling Stripe Connect setup');
      console.log('Studio Connect ID:', userData.studio.stripe_connect_id);
      
      // Check if customer already exists in connected account
      let connectedCustomerId;
      try {
        const { data: connectedCustomer } = await supabase
          .from('connected_customers')
          .select('stripe_connected_customer_id')
          .eq('parent_id', userId)
          .eq('studio_id', userData.studio.id)
          .single();
          
        if (connectedCustomer?.stripe_connected_customer_id) {
          connectedCustomerId = connectedCustomer.stripe_connected_customer_id;
          console.log('Found existing connected customer:', connectedCustomerId);
        }
      } catch (err) {
        console.log('No existing connected customer found');
      }
      
      // Create connected customer if doesn't exist
      if (!connectedCustomerId) {
        try {
          const connectedCustomer = await stripe.customers.create(
            {
              email: userData.email,
              name: userData.name,
              metadata: {
                parent_id: userId,
                platform_customer_id: userData.stripe_customer_id
              }
            },
            { stripeAccount: userData.studio.stripe_connect_id }
          );
          
          connectedCustomerId = connectedCustomer.id;
          console.log('Created new connected customer:', connectedCustomerId);
          
          // Save connected customer ID
          await supabase
            .from('connected_customers')
            .insert({
              parent_id: userId,
              studio_id: userData.studio.id,
              stripe_connected_customer_id: connectedCustomerId
            });
        } catch (err) {
          console.error('Error creating connected customer:', err);
          throw err;
        }
      }

      // Create SetupIntent on the connected account
      const setupIntent = await stripe.setupIntents.create(
        {
          customer: connectedCustomerId,
          usage: 'off_session',
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          },
          metadata: {
            parent_id: userId,
            studio_id: userData.studio.id
          }
        },
        {
          stripeAccount: userData.studio.stripe_connect_id
        }
      );
      
      console.log('Created setup intent on connected account:', setupIntent.id);
      
      // Verify setup intent was created
      const verifiedSetupIntent = await stripe.setupIntents.retrieve(
        setupIntent.id,
        { stripeAccount: userData.studio.stripe_connect_id }
      );
      
      console.log('Verified setup intent exists:', verifiedSetupIntent.id);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          clientSecret: setupIntent.client_secret,
          isConnectedAccount: true,
          connectedAccountId: userData.studio.stripe_connect_id
        })
      };
    }
    
    // For non-parent users or if no connected account, create SetupIntent on platform
    let stripeCustomerId = userData.stripe_customer_id;
    console.log('Creating setup intent for platform customer:', stripeCustomerId);
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.name,
        metadata: {
          supabase_id: userId
        }
      });
      
      stripeCustomerId = customer.id;
      
      await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);
    }
    
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: 'off_session',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    });
    
    console.log('Created setup intent:', setupIntent.id);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        clientSecret: setupIntent.client_secret,
        isConnectedAccount: false
      })
    };
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to create setup intent'
      })
    };
  }
};
