import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileSearch, Loader2, Fingerprint, X, ArrowRight, Wallet, ExternalLink } from "lucide-react";
import { sha256File, formatBytes } from "@/lib/hash";
import { StatusPill } from "@/components/StatusPill";
import { toast } from "sonner";
import { format } from "date-fns";
import { explorerAddress, shortAddr } from "@/lib/wallet";

type Result =
  | { verdict: "AUTHENTIC"; evidence: any; uploader: any }
  | { verdict: "NOT_FOUND"; message: string }
  | null;

export default function VerifyEvidence() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [hashing, setHashing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [drag, setDrag] = useState(false);

  const handleFile = async (f: File) => {
    setFile(f);
    setHash("");
    setResult(null);
    setHashing(true);
    try {
      const h = await sha256File(f);
      setHash(h);
    } finally {
      setHashing(false);
    }
  };

  const verify = async () => {
    if (!hash) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-evidence", { body: { file_hash: hash } });
      if (error) throw error;
      setResult(data as Result);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setVerifying(false);
    }
  };

  const reset = () => { setFile(null); setHash(""); setResult(null); };

  return (
    <div>
      <PageHeader
        title="Verify Evidence"
        description="Re-hash any file and check its integrity against the ledger"
        icon={<ShieldCheck className="h-6 w-6" />}
      />

      <Card className="glow-card p-6 mb-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          onClick={() => !file && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
            drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/20"
          } ${!file ? "cursor-pointer" : ""}`}
        >
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {!file ? (
            <>
              <FileSearch className="h-10 w-10 mx-auto mb-3 text-primary opacity-70" />
              <div className="font-medium">Drop a file to verify or click to browse</div>
              <div className="text-xs text-muted-foreground mt-1">We'll compute its SHA-256 and look it up</div>
            </>
          ) : (
            <div className="text-left max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={reset}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-1.5 mb-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Fingerprint className="h-3 w-3" /> Computed Hash
                </div>
                {hashing ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Computing…</div>
                ) : (
                  <div className="hash-block">{hash}</div>
                )}
              </div>
              <Button onClick={verify} disabled={!hash || hashing || verifying} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold">
                {verifying && <Loader2 className="h-4 w-4 animate-spin" />} Verify Against Ledger
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Result */}
      {result && (
        <Card className={`glow-card p-6 animate-fade-in border-2 ${
          result.verdict === "AUTHENTIC" ? "border-success/50" : "border-warning/50"
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Verdict</div>
              <StatusPill status={result.verdict} className="text-base px-3 py-1.5" />
            </div>
            {result.verdict === "AUTHENTIC" && (
              <Link to={`/evidence/${result.evidence.id}`}>
                <Button variant="outline" className="border-primary/30 text-primary">
                  View Full Record <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          {result.verdict === "NOT_FOUND" ? (
            <p className="text-muted-foreground">
              This hash does not match any evidence in the ledger. The file is either not registered, or it has been altered since registration.
            </p>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm">
                <Field label="Block Number" value={`#${result.evidence.block_number}`} mono />
                <Field label="Case ID" value={result.evidence.case_id} mono />
                <Field label="File Name" value={result.evidence.file_name} />
                <Field label="Registered" value={format(new Date(result.evidence.created_at), "PPpp")} />
                <Field label="Uploader" value={result.uploader?.display_name || result.uploader?.email || "—"} />
                <Field label="Badge / Department" value={[result.uploader?.badge_id, result.uploader?.department].filter(Boolean).join(" · ") || "—"} />
              </div>

              {result.evidence.signer_address && (
                <div className="mt-6 p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <div className="text-xs uppercase tracking-wider text-primary font-semibold">On-chain Signature Verified</div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Block was cryptographically signed on Polygon Amoy by:
                  </div>
                  <a
                    href={explorerAddress(result.evidence.signer_address)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 font-mono text-sm text-primary hover:underline"
                  >
                    {result.evidence.signer_address}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {shortAddr(result.evidence.signer_address)} · View on Polygonscan
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
