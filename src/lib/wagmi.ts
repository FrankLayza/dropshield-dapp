import { http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { env } from "@/lib/env";

/**
 * wagmi config via RainbowKit's getDefaultConfig — pinned to wagmi v2
 * (TokenOps SDK peer requirement; do NOT bump to v3).
 *
 * getDefaultConfig wires the standard wallet connectors (MetaMask, WalletConnect,
 * Coinbase, Rainbow, injected, …) from a single WalletConnect projectId.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "DropShield",
  // A placeholder keeps dev working without WalletConnect; injected wallets
  // (MetaMask) still connect. Set VITE_WALLETCONNECT_PROJECT_ID for full support.
  projectId: env.walletConnectProjectId || "DROPSHIELD_DEV_PLACEHOLDER",
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(env.rpcUrl || undefined),
  },
  ssr: false,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
