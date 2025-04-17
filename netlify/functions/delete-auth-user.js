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
    
    console.log(`Processing auth user anonymization for user ID: ${userId}`);
    
    // Initialize Supabase with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // With service role key, we have several options:
    // 1. Actually delete the user from auth.users (not recommended as it can break referential integrity)
    // 2. Anonymize the user in auth.users (better approach)
    
    // Approach: Anonymize the user in auth.users
    
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
    
    // Next, update the user's metadata to indicate account deletion
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        user_metadata: { 
          ...userData.user.user_metadata,
          deleted: true,
          deleted_at: new Date().toISOString(),
          original_email: userData.user.email, // store original email in metadata
        },
        email: email // use the anonymized email
      }
    );
    
    if (updateError) {
      console.error('Error updating auth user:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to update auth user' 
        }),
      };
    }
    
    // Finally, disable the user's account
    // This approach is better than deleting as it preserves referential integrity
    const { error: disableError } = await supabase.auth.admin.updateUserById(
      userId,
      { 
        banned: true, // ban the user so they can't sign in
      }
    );
    
    if (disableError) {
      console.error('Error disabling auth user:', disableError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to disable auth user' 
        }),
      };
    }
    
    console.log(`Successfully anonymized auth user: ${userId}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Auth user successfully anonymized' 
      }),
    };
  } catch (error) {
    console.error('Server error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Server error processing request' 
      }),
    };
  }
};
