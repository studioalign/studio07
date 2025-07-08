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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request body
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

    // Get the user from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header is required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user role and studio ownership
    const { data: userRole, error: roleError } = await supabaseClient
      .from("users")
      .select("role, studio_id")
      .eq("id", userData.user.id)
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

    if (userRole.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only studio owners can mark invoices as paid" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify that the invoice belongs to the user's studio and get all needed data
    const { data: invoiceData, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select(`
        studio_id, 
        payment_method, 
        status, 
        parent_id, 
        total, 
        subtotal,
        is_recurring,
        recurring_interval,
        recurring_end_date,
        due_date
      `)
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

    if (invoiceData.studio_id !== userRole.studio_id) {
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

    // Create a payment record using only existing schema columns
    const { error: paymentError } = await supabaseClient
      .from("payments")
      .insert([
        {
          invoice_id: invoiceId,
          amount: invoiceData.total,
          original_amount: invoiceData.subtotal || invoiceData.total,
          discount_amount: invoiceData.subtotal ? invoiceData.subtotal - invoiceData.total : 0,
          payment_method: "bank_transfer",
          status: "completed",
          payment_date: now,
          is_recurring: invoiceData.is_recurring || false,
          recurring_interval: invoiceData.is_recurring ? invoiceData.recurring_interval : null,
          // Store BACS reference in stripe_payment_intent_id field (since it exists and we need somewhere to store it)
          stripe_payment_intent_id: paymentReference ? `BACS-REF-${paymentReference}` : null,
        },
      ]);

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
      console.error("Payment record error details:", {
        error: paymentError,
        invoiceId,
        amount: invoiceData.total,
      });
      // Continue even if payment record creation fails, but log the error
    }

    // If this is a recurring invoice, we need to create the next invoice
    if (invoiceData.is_recurring && invoiceData.recurring_interval) {
      try {
        // Calculate next due date
        const currentDueDate = new Date(invoiceData.due_date);
        let nextDueDate = new Date(currentDueDate);

        switch (invoiceData.recurring_interval) {
          case "week":
            nextDueDate.setDate(currentDueDate.getDate() + 7);
            break;
          case "month":
            nextDueDate.setMonth(currentDueDate.getMonth() + 1);
            break;
          case "year":
            nextDueDate.setFullYear(currentDueDate.getFullYear() + 1);
            break;
          default:
            console.warn(`Unknown recurring interval: ${invoiceData.recurring_interval}`);
            break;
        }

        // Check if we should create the next invoice (not past end date)
        const endDate = invoiceData.recurring_end_date ? new Date(invoiceData.recurring_end_date) : null;
        const shouldCreateNext = !endDate || nextDueDate <= endDate;

        if (shouldCreateNext) {
          console.log(`Creating next recurring invoice for ${invoiceId}, due: ${nextDueDate.toISOString()}`);
          
          // Create the next recurring invoice
          await supabaseClient.functions.invoke("create-recurring-invoice", {
            body: {
              sourceInvoiceId: invoiceId,
              nextDueDate: nextDueDate.toISOString(),
            },
          });
        } else {
          console.log(`Recurring invoice series completed for ${invoiceId} - past end date`);
        }
      } catch (recurringError) {
        console.error("Error creating next recurring invoice:", recurringError);
        // Don't fail the main payment processing if recurring creation fails
      }
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
      JSON.stringify({ 
        success: true,
        message: "Invoice marked as paid successfully",
        isRecurring: invoiceData.is_recurring,
      }),
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
