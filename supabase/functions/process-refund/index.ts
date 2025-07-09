import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  try {
    console.log("=== REFUND PROCESS STARTED ===");
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient()
    });

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const requestBody = await req.json();
    console.log("Request body:", requestBody);
    
    const { paymentId, amount, reason, studioId } = requestBody;

    // Basic validation
    if (!paymentId || !amount || !studioId) {
      console.error("Missing required fields:", { paymentId: !!paymentId, amount: !!amount, studioId: !!studioId });
      return new Response(JSON.stringify({
        success: false,
        error: "Missing required fields: paymentId, amount, or studioId"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log("Processing refund for:", { paymentId, amount, studioId });

    // Get the studio's connected account ID from the database
    console.log("Looking up studio:", studioId);
    const { data: studioData, error: studioError } = await supabaseClient
      .from("studios")
      .select("stripe_connect_id, name")
      .eq("id", studioId)
      .single();

    if (studioError) {
      console.error("Studio lookup error:", studioError);
      return new Response(JSON.stringify({
        success: false,
        error: `Database error: ${studioError.message}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    if (!studioData?.stripe_connect_id) {
      console.error("No Stripe Connect ID found for studio:", studioData);
      return new Response(JSON.stringify({
        success: false,
        error: "Studio's Stripe account not connected"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const connectedAccountId = studioData.stripe_connect_id;
    console.log("Using connected account:", connectedAccountId);

    // Get the payment intent using the connected account ID
    console.log("Retrieving payment intent:", paymentId);
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentId, {
        stripeAccount: connectedAccountId
      });
      console.log("Payment intent found:", {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status
      });
    } catch (retrieveError) {
      console.error("Error retrieving payment intent:", retrieveError);
      return new Response(JSON.stringify({
        success: false,
        error: `Could not find payment intent: ${retrieveError.message}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Create the refund
    console.log("Creating refund with amount:", amount);
    let refund;
    try {
      refund = await stripe.refunds.create({
        payment_intent: paymentId,
        amount,
        reason: reason || "requested_by_customer",
        metadata: {
          reason: reason || "Customer requested refund",
          studio_id: studioId
        }
      }, {
        stripeAccount: connectedAccountId
      });
      console.log("Refund created:", {
        id: refund.id,
        amount: refund.amount,
        status: refund.status
      });
    } catch (refundError) {
      console.error("Error creating refund:", refundError);
      return new Response(JSON.stringify({
        success: false,
        error: `Refund creation failed: ${refundError.message}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    if (refund.status === "succeeded") {
      console.log("=== REFUND SUCCESSFUL ===");
      return new Response(JSON.stringify({
        success: true,
        refundId: refund.id
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } else {
      console.error("Refund failed with status:", refund.status);
      return new Response(JSON.stringify({
        success: false,
        error: `Refund failed with status: ${refund.status}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  } catch (error) {
    console.error("=== REFUND ERROR ===", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
