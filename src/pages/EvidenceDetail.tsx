import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Boxes, ArrowLeft, Download, Fingerprint, Link2, Clock, User, Wallet, ExternalLink } from "lucide-react";
import { formatBytes, shortHash } from "@/lib/hash";
import { format, formatDistanceToNow } from "date-fns";
import { StatusPill } from "@/components/StatusPill";
import { toast } from "sonner";
import { explorerAddress, shortAddr } from "@/lib/wallet";

export default function EvidenceDetail() {
  const { id } = useParams<{ id: string }>();
  const [evidence, setEvidence] = useState<any>(null);
  const [uploader, setUploader] = useState<any>(null);
  const [custody, setCustody] = useState<any[]>([]);
  const [actorMap, setActorMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: ev } = await supabase.from("evidence_ledger").select("*").eq("id", id).maybeSingle();
      setEvidence(ev);
      if (ev) {
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", ev.uploader_id).maybeSingle();
        setUploader(prof);
        const { data: log } = await supabase.from("custody_log").select("*").eq("evidence_id", id).order("created_at", { ascending: true });
        setCustody(log ?? []);
        const actorIds = Array.from(new Set((log ?? []).map((l: any) => l.actor_id)));
        if (actorIds.length) {
          const { data: actors } = await supabase.from("profiles").select("*").in("id", actorIds);
          setActorMap(Object.fromEntries((actors ?? []).map((a: any) => [a.id, a])));
        }
      }
    })();
  }, [id]);

  const downloadFile = async () => {
    if (!evidence) return;
    const { data, error } = await supabase.storage.from("evidence").createSignedUrl(evidence.file_cid, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  if (!evidence) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  return (
    <div>
      <Link to="/registry" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to registry
      </Link>

      <PageHeader
        title={`Block #${evidence.block_number}`}
        description={evidence.file_name}
        icon={<Boxes className="h-6 w-6" />}
        actions={
          <Button variant="outline" onClick={downloadFile}>
            <Download className="h-4 w-4" /> Download File
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Block info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2"><Fingerprint className="h-4 w-4 text-primary" /> Cryptographic Proof</h2>
              <StatusPill status="AUTHENTIC" />
            </div>
            <div className="space-y-3">
              <Field label="File SHA-256" value={evidence.file_hash} mono />
              <Field label="Block Hash" value={evidence.block_hash} mono />
              <Field label="Previous Block Hash" value={evidence.prev_hash} mono icon={<Link2 className="h-3 w-3" />} />
              <Field label="Storage CID" value={evidence.file_cid} mono />
            </div>
          </Card>

          <Card className="glow-card p-6">
            <h2 className="font-semibold mb-4">Evidence Metadata</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Case ID" value={evidence.case_id} mono />
              <Field label="File Type" value={evidence.file_type || "—"} />
              <Field label="File Size" value={formatBytes(evidence.file_size)} />
              <Field label="Collection Location" value={evidence.location || "—"} />
              <Field label="Collected At" value={evidence.collected_at ? format(new Date(evidence.collected_at), "PPpp") : "—"} />
              <Field label="Registered At" value={format(new Date(evidence.created_at), "PPpp")} />
              {evidence.description && (
                <div className="md:col-span-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</div>
                  <div className="mt-1 text-sm">{evidence.description}</div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="glow-card p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><User className="h-4 w-4 text-primary" /> Uploader</h2>
            <div className="space-y-2 text-sm">
              <div className="font-medium">{uploader?.display_name || uploader?.email}</div>
              <div className="text-xs text-muted-foreground">{uploader?.email}</div>
              {uploader?.badge_id && <div className="font-mono text-xs">Badge: {uploader.badge_id}</div>}
              {uploader?.department && <div className="text-xs text-muted-foreground">{uploader.department}</div>}
            </div>
          </Card>

          {evidence.signer_address && (
            <Card className="glow-card p-6 border-primary/30">
              <h2 className="font-semibold flex items-center gap-2 mb-4">
                <Wallet className="h-4 w-4 text-primary" /> On-chain Signature
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Signer Wallet</div>
                  <a href={explorerAddress(evidence.signer_address)} target="_blank" rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline break-all">
                    {evidence.signer_address}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Network</div>
                  <div className="mt-0.5 text-xs">Polygon Amoy Testnet</div>
                </div>
                {evidence.signature && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Signature</div>
                    <div className="hash-block mt-1 text-[10px]">{evidence.signature}</div>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="glow-card p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><Clock className="h-4 w-4 text-primary" /> Chain of Custody</h2>
            <div className="space-y-4">
              {custody.length === 0 ? (
                <p className="text-sm text-muted-foreground">No actions logged.</p>
              ) : (
                custody.map((c, idx) => (
                  <div key={c.id} className="relative pl-5">
                    {idx !== custody.length - 1 && <div className="absolute left-[5px] top-3 bottom-[-16px] w-px bg-border" />}
                    <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                    <div className="text-xs font-mono text-primary">{c.action}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {actorMap[c.actor_id]?.display_name || actorMap[c.actor_id]?.email || shortHash(c.actor_id)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })} · {format(new Date(c.created_at), "MMM d, HH:mm:ss")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {icon} {label}
      </div>
      {mono ? (
        <div className="hash-block mt-1">{value}</div>
      ) : (
        <div className="mt-0.5 text-sm">{value}</div>
      )}
    </div>
  );
}
