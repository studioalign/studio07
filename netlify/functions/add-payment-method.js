// netlify/functions/add-payment-method.js
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
    
    const { userId, paymentMethodId } = requestData;
    
    if (!userId || !paymentMethodId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'User ID and payment method ID are required' })
      };
    }
    
    console.log('Adding payment method for user:', userId);
    
    // Get user's details including role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, email, name, role')
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
    
    // Attach payment method to customer
    console.log('Attaching payment method to customer:', paymentMethodId);
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });
      
      // Set as default payment method
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
      // Get payment method details
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      console.log('Payment method retrieved:', paymentMethod.id);
      
      // Save to Supabase payment_methods table
      if (paymentMethod.type === 'card') {
        // Check if this is first payment method
        const { data: existingMethods, error: countError } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('user_id', userId);
        
        if (countError) {
          console.error('Error checking existing payment methods:', countError);
        }
        
        const isDefault = !existingMethods || existingMethods.length === 0;
        console.log('Is default payment method:', isDefault);
        
        // Insert into payment_methods table with parent_id for parent users
        const paymentMethodData = {
          user_id: userId,
          type: 'card',
          last_four: paymentMethod.card.last4,
          expiry_month: paymentMethod.card.exp_month,
          expiry_year: paymentMethod.card.exp_year,
          is_default: isDefault,
          stripe_payment_method_id: paymentMethodId,
        };

        // Add parent_id if user is a parent
        if (userData.role === 'parent') {
          paymentMethodData.parent_id = userId;
        }

        const { error: insertError } = await supabase
          .from('payment_methods')
          .insert([paymentMethodData]);
          
        if (insertError) {
          console.error('Error saving payment method to database:', insertError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'Failed to save payment method in database: ' + insertError.message
            })
          };
        }
      }
      
      console.log('Payment method added successfully');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          customerId: stripeCustomerId
        })
      };
    } catch (stripeError) {
      console.error('Stripe error attaching payment method:', stripeError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to attach payment method: ' + stripeError.message
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
