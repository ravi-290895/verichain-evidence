import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { Wallet, AlertTriangle, ExternalLink } from "lucide-react";
import { explorerAddress, shortAddr } from "@/lib/wallet";
import { toast } from "sonner";

export function WalletButton() {
  const { installed, address, onAmoy, connecting, connect, switchToAmoy } = useWallet();

  if (!installed) {
    return (
      <a href="https://metamask.io/download" target="_blank" rel="noreferrer">
        <Button variant="outline" size="sm" className="gap-2 border-warning/40 text-warning">
          <AlertTriangle className="h-3.5 w-3.5" /> Install MetaMask
        </Button>
      </a>
    );
  }

  if (!address) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-primary/40 text-primary"
        disabled={connecting}
        onClick={() => connect().catch((e) => toast.error(e.message))}
      >
        <Wallet className="h-3.5 w-3.5" />
        {connecting ? "Connecting…" : "Connect Wallet"}
      </Button>
    );
  }

  if (!onAmoy) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-warning/40 text-warning"
        onClick={() => switchToAmoy().catch((e) => toast.error(e.message))}
      >
        <AlertTriangle className="h-3.5 w-3.5" /> Switch to Polygon Amoy
      </Button>
    );
  }

  return (
    <a href={explorerAddress(address)} target="_blank" rel="noreferrer" className="inline-flex">
      <Button size="sm" variant="outline" className="gap-2 border-primary/40 text-primary font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_hsl(var(--success))]" />
        {shortAddr(address)}
        <ExternalLink className="h-3 w-3 opacity-60" />
      </Button>
    </a>
  );
}
