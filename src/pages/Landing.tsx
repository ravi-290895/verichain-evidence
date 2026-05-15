import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Database, ScrollText, Fingerprint, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/60 to-background pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold tracking-tight">ChainCustody</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Evidence Registry</div>
          </div>
        </div>
        <Link to={user ? "/dashboard" : "/auth"}>
          <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
            {user ? "Go to Dashboard" : "Sign In"} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono uppercase tracking-wider mb-6">
          <Fingerprint className="h-3.5 w-3.5" /> Tamper-Proof · Court-Defensible
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Evidence you can{" "}
          <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            trust on-chain
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          A blockchain-backed digital evidence registry with cryptographic chain of custody.
          Every file hashed, every action logged, every block linked.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to={user ? "/dashboard" : "/auth"}>
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold shadow-[0_0_30px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.6)]">
              Launch Console <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/verify">
            <Button size="lg" variant="outline" className="border-border">
              Verify Evidence
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-4">
        {[
          { icon: Lock, title: "SHA-256 Fingerprint", desc: "Every file is hashed in-browser before upload. The hash, not just the file, anchors the proof." },
          { icon: Database, title: "Chained Ledger", desc: "Each new record cryptographically links to the previous block. Tampering breaks the chain." },
          { icon: ScrollText, title: "Custody Timeline", desc: "Every view, verify, and access is logged with actor, role, and timestamp — court-ready." },
        ].map((f) => (
          <div key={f.title} className="glow-card rounded-lg p-6">
            <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-4">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
