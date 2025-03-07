// netlify/functions/create-setup-intent.js
exports.handler = async function(event, context) {
  console.log('Function started: create-setup-intent');
  
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
  
  // Validate all environment variables upfront
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  // Log environment variables (but not their values for security)
  console.log('Environment check:', {
    hasStripeKey: !!stripeSecretKey,
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseServiceKey
  });
  
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
    // Initialize Stripe with error handling
    let stripe;
    try {
      console.log('Initializing Stripe...');
      const stripeModule = require('stripe');
      stripe = stripeModule(stripeSecretKey);
      
      // Test Stripe connection with a simple API call
      await stripe.balance.retrieve();
      console.log('Stripe initialized successfully');
    } catch (stripeInitError) {
      console.error('Stripe initialization error:', stripeInitError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to initialize Stripe: ' + stripeInitError.message
        })
      };
    }
    
    // Initialize Supabase with error handling
    let supabase;
    try {
      console.log('Initializing Supabase...');
      const { createClient } = require('@supabase/supabase-js');
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Test Supabase connection
      await supabase.from('users').select('id').limit(1);
      console.log('Supabase initialized successfully');
    } catch (supabaseInitError) {
      console.error('Supabase initialization error:', supabaseInitError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to initialize Supabase: ' + supabaseInitError.message
        })
      };
    }
    
    // Parse request data
    let requestData;
    try {
      console.log('Request body:', event.body);
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body'
        })
      };
    }
    
    const { userId } = requestData;
    
    if (!userId) {
      console.error('Missing userId in request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'User ID is required'
        })
      };
    }
    
    console.log('Processing setup intent for user:', userId);
    
    // Get user details with timeout
    let userData;
    try {
      // Set a timeout for the Supabase query
      const userQuery = Promise.race([
        supabase
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
          .single(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase query timeout')), 8000)
        )
      ]);
      
      const { data, error } = await userQuery;
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('User not found');
      }
      
      userData = data;
      console.log('User data retrieved:', {
        email: userData.email ? 'found' : 'missing',
        name: userData.name ? 'found' : 'missing',
        role: userData.role,
        hasStripeCustomerId: !!userData.stripe_customer_id,
        hasStudio: !!userData.studio,
      });
    } catch (userError) {
      console.error('Error fetching user:', userError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Error fetching user data: ' + userError.message
        })
      };
    }
    
    // For parents, handle Stripe Connect
    if (userData.role === 'parent' && userData.studio?.stripe_connect_id) {
      console.log('Parent user detected, handling Stripe Connect setup');
      console.log('Studio Connect ID:', userData.studio.stripe_connect_id);
      
      if (!userData.studio.stripe_connect_enabled) {
        console.error('Studio Connect account is not enabled');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Studio Stripe Connect account is not fully configured or enabled'
          })
        };
      }
      
      // Check if customer already exists in connected account
      let connectedCustomerId;
      try {
        console.log('Checking for existing connected customer...');
        const connectedCustomerQuery = Promise.race([
          supabase
            .from('connected_customers')
            .select('stripe_connected_customer_id')
            .eq('parent_id', userId)
            .eq('studio_id', userData.studio.id)
            .single(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connected customer query timeout')), 5000)
          )
        ]);
        
        const { data } = await connectedCustomerQuery;
        
        if (data?.stripe_connected_customer_id) {
          connectedCustomerId = data.stripe_connected_customer_id;
          console.log('Found existing connected customer:', connectedCustomerId);
        }
      } catch (connectedCustomerError) {
        console.log('No existing connected customer found');
        // This is not a critical error, we'll create one
      }
      
      // Create connected customer if doesn't exist
      if (!connectedCustomerId) {
        try {
          console.log('Creating new connected customer...');
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
        } catch (createCustomerError) {
          console.error('Error creating connected customer:', createCustomerError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Failed to create Stripe customer: ' + createCustomerError.message
            })
          };
        }
      }

      // Create SetupIntent on the connected account
      try {
        console.log('Creating setup intent on connected account for customer:', connectedCustomerId);
        const setupIntent = await stripe.setupIntents.create(
          {
            customer: connectedCustomerId,
            usage: 'off_session',
            payment_method_types: ['card'],
            confirm: false,
            payment_method_options: {
              card: {
                request_three_d_secure: 'automatic'
              }
            }
          },
          {
            stripeAccount: userData.studio.stripe_connect_id
          }
        );
        
        console.log('Created setup intent on connected account:', setupIntent.id);
        
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
      } catch (setupIntentError) {
        console.error('Error creating connected setup intent:', setupIntentError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Failed to create setup intent on connected account: ' + setupIntentError.message
          })
        };
      }
    }
    
    // For non-parent users or if no connected account, create SetupIntent on platform
    let stripeCustomerId = userData.stripe_customer_id;
    console.log('Creating setup intent for platform customer:', stripeCustomerId);
    
    if (!stripeCustomerId) {
      try {
        console.log('Creating new Stripe customer for platform...');
        const customer = await stripe.customers.create({
          email: userData.email,
          name: userData.name,
          metadata: {
            supabase_id: userId
          }
        });
        
        stripeCustomerId = customer.id;
        console.log('Created new Stripe customer:', stripeCustomerId);
        
        // Save Stripe customer ID to database
        await supabase
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', userId);
      } catch (createCustomerError) {
        console.error('Error creating Stripe customer:', createCustomerError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Failed to create Stripe customer: ' + createCustomerError.message
          })
        };
      }
    }
    
    try {
      console.log('Creating setup intent for platform customer:', stripeCustomerId);
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        usage: 'off_session', 
        payment_method_types: ['card'],
        confirm: false,
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
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
    } catch (setupIntentError) {
      console.error('Error creating platform setup intent:', setupIntentError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to create setup intent: ' + setupIntentError.message
        })
      };
    }
  } catch (error) {
    console.error('Unhandled error in function:', error);
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
