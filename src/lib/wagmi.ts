import { http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { env } from "@/lib/env";


export const wagmiConfig = getDefaultConfig({
  appName: "Enveil",
  
  
  projectId: env.walletConnectProjectId || "ENVEIL_DEV_PLACEHOLDER",
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
