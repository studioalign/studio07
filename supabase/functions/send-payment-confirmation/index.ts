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
    const { invoiceId, paymentMethod = 'stripe', paymentReference } = await req.json();

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
        pdf_url,
        parent:parent_id(id, name, email),
        studio:studio_id(id, name, email, currency)
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

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: invoice.studio.currency || 'GBP'
      }).format(amount);
    };

    // Create email content
    const emailSubject = `Payment Confirmation: Invoice from ${invoice.studio.name}`;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #131a56; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${invoice.studio.name}</h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p>Dear ${invoice.parent.name},</p>
          
          <div style="background-color: #f0fdf4; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #22c55e;">
            <h2 style="margin-top: 0; color: #166534;">Payment Received</h2>
            <p>We've received your payment of ${formatCurrency(invoice.total)} for invoice #${invoice.id.substring(0, 8)}.</p>
            ${paymentMethod === 'bacs' ? `
              <p>Payment Method: Bank Transfer</p>
              ${paymentReference ? `<p>Reference: ${paymentReference}</p>` : ''}
            ` : `
              <p>Payment Method: Card Payment</p>
            `}
          </div>
          
          <p>Thank you for your payment. Your invoice has been marked as paid.</p>
          
          ${invoice.pdf_url ? `
            <p><a href="${invoice.pdf_url}" style="display: inline-block; background-color: #131a56; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">View Invoice</a></p>
          ` : ''}
          
          <p>If you have any questions about this payment, please contact us.</p>
          
          <p>Thank you,<br>${invoice.studio.name}</p>
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

    // Create notification for the parent
    await supabaseClient.from("notifications").insert([
      {
        user_id: invoice.parent.id,
        studio_id: invoice.studio.id,
        type: "payment_confirmation",
        title: "Payment Received",
        message: `Your payment of ${formatCurrency(invoice.total)} has been received.`,
        priority: "medium",
        entity_id: invoiceId,
        entity_type: "invoice",
        details: {
          amount: invoice.total,
          paymentMethod,
          paymentReference,
        },
      },
    ]);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending payment confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});