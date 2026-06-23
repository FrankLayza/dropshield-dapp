

function required(name: string, value: string | undefined): string {
  if (!value) {
    
    
    console.warn(`[env] Missing ${name}. Set it in .env (see .env.example).`);
    return "";
  }
  return value;
}

export const env = {
  /* * Sepolia RPC endpoint (Alchemy/Infura recommended for demo stability). */
  rpcUrl: required("VITE_RPC_URL", import.meta.env.VITE_RPC_URL),

  /* *
   * ERC-7984 confidential token to distribute. For the demo this is our
   * cMockToken (see mock-token/). Swap to an official Zama cTokenMock here. */
  tokenAddress: (import.meta.env.VITE_MOCK_TOKEN_ADDRESS ?? "") as `0x${string}` | "",

  
  factoryAddressOverride: (import.meta.env.VITE_AIRDROP_FACTORY_ADDRESS ?? "") as
    | `0x${string}`
    | "",

  /* *
   * Block to start scanning factory `ConfidentialAirdropCreated` logs from when
   * listing an admin's campaigns (bounds the getLogs range so RPC providers don't
   * reject it). Defaults to 0 (full scan — slower but safe). Set this to the
   * factory's deployment block for fast queries. NEVER set it higher than the
   * factory deploy block or campaigns will be hidden. */
  factoryFromBlock: BigInt(import.meta.env.VITE_FACTORY_FROM_BLOCK ?? "0"),

  
  walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "",
} as const;
