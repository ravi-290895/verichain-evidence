import { useCallback, useEffect, useState } from "react";
import { ensureAmoy, getCurrentChainId, hasMetaMask, POLYGON_AMOY, requestAccounts } from "@/lib/wallet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useWallet() {
  const { user } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const installed = hasMetaMask();
  const onAmoy = chainId === POLYGON_AMOY.chainIdHex;

  // Hydrate from existing connection (no prompt)
  useEffect(() => {
    if (!installed) return;
    (async () => {
      try {
        const accs: string[] = await window.ethereum!.request({ method: "eth_accounts" });
        if (accs?.[0]) setAddress(accs[0].toLowerCase());
        setChainId(await getCurrentChainId());
      } catch { /* ignore */ }
    })();

    const onAccounts = (accs: string[]) => setAddress(accs?.[0]?.toLowerCase() ?? null);
    const onChain = (id: string) => setChainId(id);
    window.ethereum?.on?.("accountsChanged", onAccounts);
    window.ethereum?.on?.("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAccounts);
      window.ethereum?.removeListener?.("chainChanged", onChain);
    };
  }, [installed]);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const addr = await requestAccounts();
      await ensureAmoy();
      setAddress(addr);
      setChainId(await getCurrentChainId());
      // Persist on profile (non-blocking)
      if (user) {
        await supabase.from("profiles").update({ wallet_address: addr }).eq("id", user.id);
      }
      return addr;
    } finally {
      setConnecting(false);
    }
  }, [user]);

  const switchToAmoy = useCallback(async () => {
    await ensureAmoy();
    setChainId(await getCurrentChainId());
  }, []);

  return { installed, address, chainId, onAmoy, connecting, connect, switchToAmoy };
}
