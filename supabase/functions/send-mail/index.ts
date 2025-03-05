import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as sgMail from "npm:@sendgrid/mail";

// Configure SendGrid
sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY') || '');

Deno.serve(async (req: Request) => {
  // CORS handling
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://studioalign.netlify.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const { to, subject, html } = await req.json();
  
    const msg = {
      to,
      from: {
        email: 'noreply@studioalignpro.com',
        name: 'Studio Align'
      },
      subject,
      html
    };
  
    // Log the attempt (without exposing the full API key)
    console.log('Attempting to send email to:', to);
    console.log('Using SendGrid API key (first 5 chars):', 
      (Deno.env.get('SENDGRID_API_KEY') || '').substring(0, 5) + '...');
  
    // Send email
    try {
      await sgMail.send(msg);
      console.log('SendGrid API call successful');
    } catch (sendGridError) {
      console.error('SendGrid API error:', sendGridError);
      throw sendGridError;
    }
  
    return new Response(JSON.stringify({ success: true, message: 'Email sent successfully!' }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
      status: 200,
    });
  } catch (error) {
    console.error('Email sending error:', error);
    // More detailed error response
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error.constructor?.name || typeof error,
      details: JSON.stringify(error, (key, value) => 
        key === 'stack' ? value : (value instanceof Error ? value.message : value)
      )
    }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
      status: 400,
    });
  }
});