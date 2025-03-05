import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as sgMail from "npm:@sendgrid/mail";

// Configure SendGrid
sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY') || '');

Deno.serve(async (req: Request) => {
  // CORS handling
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Change '*' to your specific domain in production
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const { to, subject, html } = await req.json();

    // Input validation (add more as needed)
    if (!to || !subject || !html) {
      throw new Error('Missing required email parameters');
    }

    const msg = {
      to,
      from: {
        email: 'noreply@studioalignpro.com',
        name: 'Studio Align'
      },
      subject,
      html
    };

    // Log the attempt (without API key)
    console.log('Attempting to send email to:', to);

    await sgMail.send(msg);
    console.log('SendGrid API call successful');

    return new Response(JSON.stringify({ success: true, message: 'Email sent successfully!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Email sending error:', error); // Log full error

    // Generic error response
    return new Response(JSON.stringify({ error: error.message }), { // Return specific error message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});