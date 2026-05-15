import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Returns the canonical payload + computed block_hash for the *next* block,
 * along with the message the client should personal_sign with MetaMask.
 *
 * The client signs `message`. The server later (in register-evidence) re-derives
 * the same payload+hash and verifies the signature against the provided wallet.
 *
 * NOTE: there is an inherent race window between preview and register if two
 * officers register concurrently. We re-derive prev_hash again at register time
 * and reject the signature if it doesn't match (officer must re-sign).
 */
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

    const body = await req.json();
    const { file_hash, file_cid, case_id, description, ts } = body;
    if (!file_hash || !file_cid || !case_id || !ts) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[a-f0-9]{64}$/i.test(file_hash)) {
      return new Response(JSON.stringify({ error: "Invalid SHA-256 hash" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: prevBlock } = await admin
      .from("evidence_ledger").select("block_hash").order("block_number", { ascending: false }).limit(1).maybeSingle();
    const prev_hash = prevBlock?.block_hash ?? GENESIS_HASH;

    const payload = JSON.stringify({
      file_hash, file_cid, case_id, description: description ?? "",
      uploader_id: userId, ts,
    });
    const block_hash = await sha256(prev_hash + payload);

    const message =
      `ChainCustody — Sign to anchor evidence block\n\n` +
      `Block hash: ${block_hash}\n` +
      `Previous : ${prev_hash}\n` +
      `File SHA-256: ${file_hash}\n` +
      `Case: ${case_id}\n` +
      `Timestamp: ${ts}`;

    return new Response(JSON.stringify({ prev_hash, block_hash, payload, message, ts }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
