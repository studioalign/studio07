import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as sgMail from "npm:@sendgrid/mail";

// Configure SendGrid
sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY') || '');

Deno.serve(async (req: Request) => {
  // CORS handling
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
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
        name: 'Studio Align Pro'
      },
      subject,
      html
    };

    // Send email
    await sgMail.send(msg);

    return new Response(JSON.stringify({ success: true, message: 'Email sent successfully!' }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
      status: 200,
    });
  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error 
    }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      },
      status: 400,
    });
  }
});