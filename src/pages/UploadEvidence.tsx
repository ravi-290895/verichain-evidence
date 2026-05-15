import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { personalSign, shortAddr } from "@/lib/wallet";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileUp, Loader2, X, Fingerprint, Wallet, AlertTriangle } from "lucide-react";
import { sha256File, formatBytes } from "@/lib/hash";
import { toast } from "sonner";

export default function UploadEvidence() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { installed, address, onAmoy, connecting, connect, switchToAmoy } = useWallet();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string>("");
  const [hashing, setHashing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"" | "uploading" | "signing" | "anchoring">("");
  const [drag, setDrag] = useState(false);

  const [caseId, setCaseId] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [collectedAt, setCollectedAt] = useState("");

  const handleFile = async (f: File) => {
    setFile(f);
    setHash("");
    setHashing(true);
    try {
      const h = await sha256File(f);
      setHash(h);
    } catch (e: any) {
      toast.error("Hashing failed: " + e.message);
    } finally {
      setHashing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const walletReady = installed && !!address && onAmoy;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !hash || !user) return;
    if (!walletReady) {
      toast.error("Connect MetaMask on Polygon Amoy to sign the block");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Upload file to private storage
      setStep("uploading");
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("evidence").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      // 2. Ask server for the block hash to sign
      setStep("signing");
      const ts = new Date().toISOString();
      const { data: preview, error: previewErr } = await supabase.functions.invoke("preview-block", {
        body: { file_hash: hash, file_cid: path, case_id: caseId, description, ts },
      });
      if (previewErr) throw previewErr;
      if ((preview as any)?.error) throw new Error((preview as any).error);

      // 3. Sign with MetaMask
      const signature = await personalSign((preview as any).message, address!);

      // 4. Submit signed block
      setStep("anchoring");
      const { data, error } = await supabase.functions.invoke("register-evidence", {
        body: {
          file_hash: hash,
          file_cid: path,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || "application/octet-stream",
          case_id: caseId,
          description,
          location,
          collected_at: collectedAt || null,
          ts,
          signer_address: address,
          signature,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(`Block #${(data as any).evidence.block_number} signed & anchored`);
      navigate(`/evidence/${(data as any).evidence.id}`);
    } catch (e: any) {
      const msg = e?.message || "Registration failed";
      // MetaMask rejection codes
      if (msg.includes("User rejected") || e?.code === 4001) {
        toast.error("Signature rejected in MetaMask");
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
      setStep("");
    }
  };

  return (
    <div>
      <PageHeader
        title="Register Evidence"
        description="Upload, hash, sign with your wallet, and anchor to the immutable ledger"
        icon={<Upload className="h-6 w-6" />}
      />

      {/* Wallet status banner */}
      {!walletReady && (
        <Card className="glow-card p-4 mb-6 border-warning/40 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm">Wallet signature required</div>
              <div className="text-xs text-muted-foreground">
                {!installed
                  ? "MetaMask is required to cryptographically sign each evidence block."
                  : !address
                  ? "Connect your MetaMask wallet to sign new blocks."
                  : "Switch to Polygon Amoy testnet to continue."}
              </div>
            </div>
          </div>
          {!installed ? (
            <a href="https://metamask.io/download" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="border-warning/50 text-warning">Install MetaMask</Button>
            </a>
          ) : !address ? (
            <Button size="sm" disabled={connecting} onClick={() => connect().catch((e) => toast.error(e.message))}
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
              <Wallet className="h-4 w-4" /> {connecting ? "Connecting…" : "Connect Wallet"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="border-warning/50 text-warning"
              onClick={() => switchToAmoy().catch((e) => toast.error(e.message))}>
              Switch to Amoy
            </Button>
          )}
        </Card>
      )}

      <form onSubmit={onSubmit} className="grid lg:grid-cols-2 gap-6">
        {/* Drop zone */}
        <Card className="glow-card p-6">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Evidence File</Label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`mt-3 border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/20"
            }`}
          >
            <input
              ref={inputRef} type="file" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {!file ? (
              <>
                <FileUp className="h-10 w-10 mx-auto mb-3 text-primary opacity-70" />
                <div className="font-medium">Drop file here or click to browse</div>
                <div className="text-xs text-muted-foreground mt-1">SHA-256 computed in-browser</div>
              </>
            ) : (
              <div className="text-left">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">{formatBytes(file.size)} · {file.type || "binary"}</div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setFile(null); setHash(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Fingerprint className="h-3 w-3" /> SHA-256 Fingerprint
                  </div>
                  {hashing ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Computing hash…
                    </div>
                  ) : (
                    <div className="hash-block">{hash}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {walletReady && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success))]" />
              Signing wallet: <span className="font-mono text-foreground">{shortAddr(address)}</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-primary">Polygon Amoy</span>
            </div>
          )}
        </Card>

        {/* Metadata */}
        <Card className="glow-card p-6 space-y-4">
          <div>
            <Label htmlFor="case">Case ID *</Label>
            <Input id="case" required value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="CASE-2025-0042" className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Body-cam footage from arrest scene…" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="loc">Collection Location</Label>
            <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="123 Main St, NYC" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="when">Collected At</Label>
            <Input id="when" type="datetime-local" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)} className="mt-1.5" />
          </div>
          <Button
            type="submit"
            disabled={!file || !hash || hashing || submitting || !caseId || !walletReady}
            className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === "uploading" && "Uploading file…"}
            {step === "signing" && "Awaiting wallet signature…"}
            {step === "anchoring" && "Anchoring to ledger…"}
            {!step && "Sign & Register Block"}
          </Button>
        </Card>
      </form>
    </div>
  );
}
