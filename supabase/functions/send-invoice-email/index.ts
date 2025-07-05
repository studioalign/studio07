// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get request parameters
    const { invoiceId, paymentMethod = 'stripe' } = await req.json();

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select(`
        id, 
        total, 
        due_date, 
        pdf_url,
        parent:parent_id(id, name, email),
        studio:studio_id(id, name, email, address, phone, currency)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get studio bank details if BACS payment
    let bankDetails = null;
    if (paymentMethod === 'bacs') {
      const { data: bankData } = await supabaseClient
        .from("studio_bank_details")
        .select("*")
        .eq("studio_id", invoice.studio.id)
        .single();
      
      bankDetails = bankData;
    }

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: invoice.studio.currency || 'GBP'
      }).format(amount);
    };

    // Create email content
    const emailSubject = paymentMethod === 'bacs' 
      ? `Bank Transfer Required: Invoice from ${invoice.studio.name}`
      : `New Invoice from ${invoice.studio.name}`;

    let emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #131a56; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${invoice.studio.name}</h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p>Dear ${invoice.parent.name},</p>
          
          <p>A new invoice has been created for you. Details are below:</p>
          
          <div style="background-color: #f9fafb; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Invoice Amount:</strong> ${formatCurrency(invoice.total)}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
            ${invoice.pdf_url ? `<p><a href="${invoice.pdf_url}" style="color: #131a56;">View Invoice PDF</a></p>` : ''}
          </div>
    `;

    if (paymentMethod === 'bacs') {
      emailContent += `
        <div style="background-color: #e6f7ff; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #1890ff;">
          <h3 style="margin-top: 0; color: #0c53b7;">Payment Instructions</h3>
          <p>Please make payment via bank transfer using the following details:</p>
          
          ${bankDetails ? `
            <p><strong>Account Name:</strong> ${bankDetails.account_name}</p>
            <p><strong>Account Number:</strong> ${bankDetails.account_number}</p>
            <p><strong>Sort Code:</strong> ${bankDetails.sort_code}</p>
          ` : `
            <p>Please contact the studio for bank details.</p>
          `}
          
          <p><strong>Payment Reference:</strong> Invoice-${invoice.id.substring(0, 8)}</p>
          <p><strong>Amount:</strong> ${formatCurrency(invoice.total)}</p>
        </div>
        
        <p>Once you've made the payment, the studio will mark your invoice as paid in the system.</p>
      `;
    } else {
      emailContent += `
        <p>You can view and pay this invoice online through your StudioAlign account.</p>
      `;
    }

    emailContent += `
          <p>If you have any questions about this invoice, please contact ${invoice.studio.name} directly.</p>
          
          <p>Thank you,<br>${invoice.studio.name}</p>
        </div>
        
        <div style="background-color: #f3f4f6; padding: 10px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>${invoice.studio.name}<br>
          ${invoice.studio.address || ''}<br>
          ${invoice.studio.phone || ''}<br>
          ${invoice.studio.email || ''}</p>
        </div>
      </div>
    `;

    // Send email using the send-mail function
    const emailResponse = await supabaseClient.functions.invoke("send-mail", {
      body: {
        to: invoice.parent.email,
        subject: emailSubject,
        html: emailContent,
      },
    });

    if (emailResponse.error) {
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending invoice email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});