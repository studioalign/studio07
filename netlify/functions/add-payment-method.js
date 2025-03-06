// netlify/functions/add-payment-method.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    const { userId, paymentMethodId } = JSON.parse(event.body);
    
    if (!userId || !paymentMethodId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'User ID and payment method ID are required' })
      };
    }
    
    // Get user's Stripe customer ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, email, name')
      .eq('id', userId)
      .single();
    
    if (userError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'User not found' })
      };
    }
    
    let stripeCustomerId = userData.stripe_customer_id;
    
    // Create customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.name,
        metadata: {
          supabase_id: userId
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Save Stripe customer ID back to user record
      await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);
    }
    
    // Attach payment method to customer
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
    
    // Save to Supabase payment_methods table
    if (paymentMethod.type === 'card') {
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (parentData) {
        // Check if this is first payment method
        const { data: existingMethods } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('parent_id', parentData.id);
        
        const isDefault = !existingMethods || existingMethods.length === 0;
        
        // Insert into payment_methods table
        await supabase
          .from('payment_methods')
          .insert({
            parent_id: parentData.id,
            type: 'card',
            last_four: paymentMethod.card.last4,
            expiry_month: paymentMethod.card.exp_month,
            expiry_year: paymentMethod.card.exp_year,
            is_default: isDefault,
            stripe_payment_method_id: paymentMethodId,
          });
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        customerId: stripeCustomerId
      })
    };
  } catch (error) {
    console.error('Error adding payment method:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to add payment method'
      })
    };
  }
};