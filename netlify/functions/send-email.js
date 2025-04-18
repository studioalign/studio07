const sgMail = require('@sendgrid/mail');

exports.handler = async function(event, context) {
  // Allow CORS from any origin
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Check if emails are disabled (moved after headers definition)
  if (process.env.DISABLE_EMAIL_NOTIFICATIONS === 'true') {
    console.log('Emails disabled by environment variable. Would have sent to:', JSON.parse(event.body).to);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, disabled: true })
    };
  }
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    // Validate that we have a body
    if (!event.body) {
      console.error('No request body provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'No request body provided' })
      };
    }
    
    // Try to parse the JSON body
    let to, subject, html;
    try {
      const parsed = JSON.parse(event.body);
      to = parsed.to;
      subject = parsed.subject;
      html = parsed.html;
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid JSON in request body' })
      };
    }
    
    // Validate required fields
    if (!to || !subject || !html) {
      console.error('Missing required fields', { to, subject, htmlProvided: !!html });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing required fields: to, subject, or html' })
      };
    }
    
    // Check for SendGrid API key
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY environment variable is not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Email service configuration error' })
      };
    }
    
    // Set SendGrid API key from environment variable
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to,
      from: {
        email: 'noreply@studioalignpro.com',
        name: 'StudioAlign'
      },
      subject,
      html
    };
    
    console.log('Sending email to', to);
    await sgMail.send(msg);
    console.log('Email sent successfully to', to);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
