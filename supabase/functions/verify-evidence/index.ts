import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { file_hash } = await req.json();
    if (!file_hash || !/^[a-f0-9]{64}$/i.test(file_hash)) {
      return new Response(JSON.stringify({ error: "Invalid hash" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: evidence } = await admin
      .from("evidence_ledger").select("*").eq("file_hash", file_hash.toLowerCase()).maybeSingle();

    if (!evidence) {
      return new Response(JSON.stringify({ verdict: "NOT_FOUND", message: "Hash not found in ledger" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch uploader profile
    const { data: uploader } = await admin
      .from("profiles").select("display_name, badge_id, department, email").eq("id", evidence.uploader_id).maybeSingle();

    // Log verification
    await admin.from("custody_log").insert({
      evidence_id: evidence.id, actor_id: userId, action: "VERIFIED",
      details: { result: "AUTHENTIC", hash: file_hash },
    });

    return new Response(JSON.stringify({
      verdict: "AUTHENTIC", evidence, uploader,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
