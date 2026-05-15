/**
 * MetaMask + Polygon Amoy helpers.
 * Anchoring strategy: officer signs each new block_hash with personal_sign.
 * Signature + signer address are stored on the ledger as cryptographic proof.
 */

export const POLYGON_AMOY = {
  chainIdHex: "0x13882", // 80002
  chainId: 80002,
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  rpcUrls: ["https://rpc-amoy.polygon.technology/"],
  blockExplorerUrls: ["https://amoy.polygonscan.com/"],
};

export const explorerAddress = (addr: string) =>
  `${POLYGON_AMOY.blockExplorerUrls[0]}address/${addr}`;

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | object }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export function hasMetaMask(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export async function requestAccounts(): Promise<string> {
  if (!window.ethereum) throw new Error("MetaMask is not installed");
  const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts?.[0]) throw new Error("No wallet account returned");
  return accounts[0].toLowerCase();
}

export async function getCurrentChainId(): Promise<string | null> {
  if (!window.ethereum) return null;
  return await window.ethereum.request({ method: "eth_chainId" });
}

export async function ensureAmoy(): Promise<void> {
  if (!window.ethereum) throw new Error("MetaMask is not installed");
  const current = await getCurrentChainId();
  if (current === POLYGON_AMOY.chainIdHex) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: POLYGON_AMOY.chainIdHex }],
    });
  } catch (err: any) {
    // 4902 = chain not added
    if (err?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: POLYGON_AMOY.chainIdHex,
          chainName: POLYGON_AMOY.chainName,
          nativeCurrency: POLYGON_AMOY.nativeCurrency,
          rpcUrls: POLYGON_AMOY.rpcUrls,
          blockExplorerUrls: POLYGON_AMOY.blockExplorerUrls,
        }],
      });
    } else {
      throw err;
    }
  }
}

/**
 * Personal-sign an arbitrary message (we sign the canonical block payload).
 * Returns the 0x-prefixed signature.
 */
export async function personalSign(message: string, address: string): Promise<string> {
  if (!window.ethereum) throw new Error("MetaMask is not installed");
  const sig: string = await window.ethereum.request({
    method: "personal_sign",
    params: [message, address],
  });
  return sig;
}

export const shortAddr = (a?: string | null) =>
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
