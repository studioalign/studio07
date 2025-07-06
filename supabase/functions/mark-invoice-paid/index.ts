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

    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the JWT token from the authorization header
    const jwt = authHeader.replace("Bearer ", "");

    // Get the user from the JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(jwt);

    if (userError) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get request parameters
    const { invoiceId, paymentReference } = await req.json();

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify that the user is a studio owner
    const { data: userData, error: roleError } = await supabaseClient
      .from("users")
      .select("role, studio_id")
      .eq("id", user.id)
      .single();

    if (roleError) {
      return new Response(
        JSON.stringify({ error: "Failed to verify user role" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (userData.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only studio owners can mark invoices as paid" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify that the invoice belongs to the user's studio
    const { data: invoiceData, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select("studio_id, payment_method, status, parent_id, total")
      .eq("id", invoiceId)
      .single();

    if (invoiceError) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (invoiceData.studio_id !== userData.studio_id) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to mark this invoice as paid" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (invoiceData.payment_method !== "bacs") {
      return new Response(
        JSON.stringify({ error: "Only BACS invoices can be marked as paid manually" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (invoiceData.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Only pending invoices can be marked as paid" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update the invoice status
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from("invoices")
      .update({
        status: "paid",
        manual_payment_status: "paid",
        manual_payment_date: now,
        manual_payment_reference: paymentReference || null,
        paid_at: now,
      })
      .eq("id", invoiceId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update invoice status" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a payment record
    const { error: paymentError } = await supabaseClient
      .from("payments")
      .insert([
        {
          invoice_id: invoiceId,
          parent_id: invoiceData.parent_id,
          studio_id: invoiceData.studio_id,
          amount: invoiceData.total,
          payment_method: "bank_transfer",
          payment_type: "bacs",
          status: "completed",
          payment_date: now,
          description: `Manual BACS payment${paymentReference ? ` (Ref: ${paymentReference})` : ''}`,
        },
      ]);

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
      // Continue even if payment record creation fails
    }

    // Send notification to parent
    try {
      await supabaseClient.functions.invoke("send-payment-confirmation", {
        body: {
          invoiceId,
          paymentMethod: "bacs",
          paymentReference,
        },
      });
    } catch (notifyError) {
      console.error("Error sending payment confirmation:", notifyError);
      // Continue even if notification fails
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error marking invoice as paid:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});