import { http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  phantomWallet,
  metaMaskWallet,
  rainbowWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { env } from "@/lib/env";


export const wagmiConfig = getDefaultConfig({
  appName: "Enveil",
  projectId: env.walletConnectProjectId || "ENVEIL_DEV_PLACEHOLDER",
  chains: [sepolia],
  wallets: [
    {
      groupName: "Recommended",
      wallets: [
        phantomWallet,
        metaMaskWallet,
        rainbowWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
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
