import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-PREFERENCE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not set");
    logStep("Mercado Pago token verified");

    const origin = req.headers.get("origin") || "https://artrixa.lovable.app";

    const preference = {
      items: [
        {
          title: "VIP Diamante - Artrixa",
          description: "Assinatura VIP Diamante com acesso exclusivo ao melhor conteúdo",
          quantity: 1,
          currency_id: "BRL",
          unit_price: 19.90,
        },
      ],
      payer: {
        email: user.email,
      },
      back_urls: {
        success: `${origin}/vip?status=success`,
        failure: `${origin}/vip?status=failure`,
        pending: `${origin}/vip?status=pending`,
      },
      auto_return: "approved",
      external_reference: user.id,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        plan: "vip_diamante",
      },
    };

    logStep("Creating preference", { externalRef: user.id });

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Mercado Pago API error: ${response.status} - ${errorData}`);
    }

    const data2 = await response.json();
    logStep("Preference created", { id: data2.id, init_point: data2.init_point });

    return new Response(JSON.stringify({ url: data2.init_point }), {
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
