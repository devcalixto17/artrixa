import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const body = await req.json();
    logStep("Webhook body", body);

    // Mercado Pago sends different notification types
    if (body.type !== "payment" && body.action !== "payment.updated" && body.action !== "payment.created") {
      logStep("Ignoring non-payment notification", { type: body.type, action: body.action });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      logStep("No payment ID found in webhook");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not set");

    // Fetch payment details from Mercado Pago API
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!paymentResponse.ok) {
      throw new Error(`Failed to fetch payment: ${paymentResponse.status}`);
    }

    const payment = await paymentResponse.json();
    logStep("Payment details fetched", {
      id: payment.id,
      status: payment.status,
      amount: payment.transaction_amount,
      method: payment.payment_method_id,
    });

    const userId = payment.external_reference || payment.metadata?.user_id;
    if (!userId) {
      throw new Error("No user ID found in payment");
    }

    // Validate payment amount (R$ 19,90)
    const expectedAmount = 19.90;
    if (payment.transaction_amount < expectedAmount) {
      logStep("Payment amount mismatch", {
        expected: expectedAmount,
        received: payment.transaction_amount,
      });
      throw new Error("Payment amount does not match expected value");
    }

    // Update or insert subscription record
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Save payment record in vip_subscriptions
    const { error: subError } = await supabaseClient
      .from("vip_subscriptions")
      .upsert({
        user_id: userId,
        status: payment.status === "approved" ? "active" : payment.status,
        plan_name: "VIP Diamante",
        price_cents: Math.round(payment.transaction_amount * 100),
        mercadopago_subscription_id: String(payment.id),
        mercadopago_payer_id: payment.payer?.id ? String(payment.payer.id) : null,
        expires_at: payment.status === "approved" ? expiresAt.toISOString() : null,
        updated_at: now.toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (subError) {
      logStep("Error upserting subscription", { error: subError.message });
      throw new Error(`Failed to update subscription: ${subError.message}`);
    }
    logStep("Subscription record updated");

    // Only activate VIP if payment is approved
    if (payment.status === "approved") {
      // Assign VIP role
      const { data: existingRole } = await supabaseClient
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "vip_diamante")
        .maybeSingle();

      if (!existingRole) {
        await supabaseClient
          .from("user_roles")
          .insert({ user_id: userId, role: "vip_diamante" });
        logStep("VIP role assigned");
      }

      // Assign VIP badge
      const { data: vipBadge } = await supabaseClient
        .from("badges")
        .select("id")
        .eq("name", "VIP Diamante")
        .maybeSingle();

      if (vipBadge) {
        const { data: existingBadge } = await supabaseClient
          .from("user_badges")
          .select("id")
          .eq("user_id", userId)
          .eq("badge_id", vipBadge.id)
          .maybeSingle();

        if (!existingBadge) {
          await supabaseClient
            .from("user_badges")
            .insert({ user_id: userId, badge_id: vipBadge.id });
          logStep("VIP badge assigned");
        }
      }

      logStep("VIP DIAMANTE fully activated for user", { userId });
    } else {
      logStep("Payment not approved, VIP not activated", { status: payment.status });
    }

    return new Response(JSON.stringify({ received: true, status: payment.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
