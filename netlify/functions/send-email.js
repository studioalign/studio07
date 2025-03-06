const sgMail = require('@sendgrid/mail');

exports.handler = async function(event, context) {
  // Allow CORS from any origin
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
  
  try {
    const { to, subject, html } = JSON.parse(event.body);
    
    // Set SendGrid API key from environment variable
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to,
      from: {
        email: 'noreply@studioalignpro.com',
        name: 'Studio Align Pro'
      },
      subject,
      html
    };
    
    await sgMail.send(msg);
    
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
        error: error.message 
      })
    };
  }
};