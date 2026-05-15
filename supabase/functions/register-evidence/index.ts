import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { verifyMessage, isAddress, getAddress } from "https://esm.sh/viem@2.21.19";

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
    const {
      file_hash, file_cid, file_name, file_size, file_type,
      case_id, description, location, collected_at,
      ts, signer_address, signature,
    } = body;

    if (!file_hash || !file_cid || !file_name || !case_id || file_size == null) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[a-f0-9]{64}$/i.test(file_hash)) {
      return new Response(JSON.stringify({ error: "Invalid SHA-256 hash" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ts || !signer_address || !signature) {
      return new Response(JSON.stringify({ error: "Wallet signature required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isAddress(signer_address)) {
      return new Response(JSON.stringify({ error: "Invalid signer address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Role check: officer or admin
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    if (!roleSet.has("officer") && !roleSet.has("admin")) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Duplicate check
    const { data: existing } = await admin.from("evidence_ledger").select("id").eq("file_hash", file_hash).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "Evidence with this hash already registered", id: existing.id }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-derive prev_hash + block_hash exactly like preview-block did
    const { data: prevBlock } = await admin
      .from("evidence_ledger").select("block_hash").order("block_number", { ascending: false }).limit(1).maybeSingle();
    const prev_hash = prevBlock?.block_hash ?? GENESIS_HASH;

    const payload = JSON.stringify({
      file_hash, file_cid, case_id, description: description ?? "",
      uploader_id: userId, ts,
    });
    const block_hash = await sha256(prev_hash + payload);

    const expectedMessage =
      `ChainCustody — Sign to anchor evidence block\n\n` +
      `Block hash: ${block_hash}\n` +
      `Previous : ${prev_hash}\n` +
      `File SHA-256: ${file_hash}\n` +
      `Case: ${case_id}\n` +
      `Timestamp: ${ts}`;

    // Verify signature server-side. If prev_hash shifted (concurrent insert race),
    // the signature will not match and the officer must re-sign.
    let valid = false;
    try {
      valid = await verifyMessage({
        address: getAddress(signer_address),
        message: expectedMessage,
        signature: signature as `0x${string}`,
      });
    } catch (_e) {
      valid = false;
    }
    if (!valid) {
      return new Response(JSON.stringify({
        error: "Signature verification failed. The chain may have advanced — please re-sign.",
        code: "SIGNATURE_INVALID",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedSigner = getAddress(signer_address).toLowerCase();

    const { data: inserted, error: insertErr } = await admin.from("evidence_ledger").insert({
      file_hash, file_cid, file_name, file_size, file_type,
      case_id, description, location,
      collected_at: collected_at || null,
      uploader_id: userId, prev_hash, block_hash,
      signer_address: normalizedSigner,
      signature,
    }).select().single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist wallet on profile if not already set
    await admin.from("profiles").update({ wallet_address: normalizedSigner }).eq("id", userId);

    await admin.from("custody_log").insert({
      evidence_id: inserted.id, actor_id: userId, action: "REGISTERED",
      details: { case_id, file_name, block_number: inserted.block_number, signer: normalizedSigner },
    });

    return new Response(JSON.stringify({ success: true, evidence: inserted }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
