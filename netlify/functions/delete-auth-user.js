// netlify/functions/delete-auth-user.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  // Set CORS headers for security
  const headers = {
    'Access-Control-Allow-Origin': '*', // Lock this down to your specific domain in production
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Check if method is POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  try {
    // Get Supabase URL and service role key from environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Required environment variables are missing');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        }),
      };
    }
    
    // Parse the request body
    const { userId, email } = JSON.parse(event.body || '{}');
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'User ID is required' 
        }),
      };
    }
    
    console.log(`Processing auth user email randomization for user ID: ${userId}`);
    
    // Initialize Supabase with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // First, check if the user exists in auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'User not found in auth system' 
        }),
      };
    }
    
    if (!userData || !userData.user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'User not found' 
        }),
      };
    }
    
    // Store the original email temporarily
    const originalEmail = userData.user.email;
    
    // Generate a unique, random email that won't conflict with real emails
    const randomEmail = `deleted.${userId}.${Date.now()}@deleted-accounts.studioalign.com`;
    
    // Update the auth user with the random email
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        email: randomEmail,
        user_metadata: { 
          ...userData.user.user_metadata,
          deleted: true,
          deleted_at: new Date().toISOString(),
          original_email: originalEmail // store original email in metadata
        }
      }
    );
    
    if (updateError) {
      console.error('Error updating auth user email:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to update auth user email: ' + updateError.message
        }),
      };
    }
    
    // Additionally ban the user to prevent any access
    const { error: banError } = await supabase.auth.admin.updateUserById(
      userId,
      { banned: true }
    );
    
    if (banError) {
      console.warn('Failed to ban user, but email was randomized:', banError);
      // Continue despite this error since the email was freed up
    }
    
    console.log(`Successfully randomized auth user email from ${originalEmail} to ${randomEmail}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Auth user email randomized. Original email is now available for reuse.'
      }),
    };
  } catch (error) {
    console.error('Server error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Server error processing request: ' + (error.message || 'Unknown error')
      }),
    };
  }
};
