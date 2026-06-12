/**
 * Headless end-to-end pipeline: create+fund → authorize → claim → verify-decrypt.
 *
 * PURPOSE: prove the entire confidential-airdrop lifecycle works against Sepolia
 * from the command line, BEFORE building UI. If this passes, the frontend is just
 * buttons on proven calls.
 *
 * All call shapes below are taken from the INSTALLED @tokenops/sdk type defs
 * (dist/fhe-airdrop/*.d.ts), not from docs — the package is the source of truth.
 *
 * RUN:
 *   1. cp .env.example .env  and fill ADMIN_PRIVATE_KEY, RECIPIENT_PRIVATE_KEY,
 *      RPC_URL, VITE_MOCK_TOKEN_ADDRESS (deploy mock-token first; admin wallet
 *      must hold a confidential balance — run the faucet as the admin).
 *   2. pnpm pipeline
 */
import "dotenv/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { RelayerNode, SepoliaConfig } from "@zama-fhe/sdk/node";
import {
  createConfidentialAirdropFactoryClient,
  createConfidentialAirdropClient,
  encryptUint64,
  signClaimAuthorization,
} from "@tokenops/sdk/fhe-airdrop";

// Minimal ERC-7984 setOperator ABI — deadline is uint48 (NOT uint256; wrong
// type encodes silently). Used so the factory can pull the admin's tokens to fund.
const erc7984SetOperatorAbi = [
  {
    type: "function",
    name: "setOperator",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "until", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} (see .env.example)`);
  return v;
}

async function main() {
  const rpcUrl = need("RPC_URL");
  const adminPk = need("ADMIN_PRIVATE_KEY") as `0x${string}`;
  const recipientPk = need("RECIPIENT_PRIVATE_KEY") as `0x${string}`;
  const token = need("VITE_MOCK_TOKEN_ADDRESS") as `0x${string}`;

  const admin = privateKeyToAccount(adminPk);
  const recipient = privateKeyToAccount(recipientPk);

  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const adminWallet = createWalletClient({ account: admin, chain: sepolia, transport: http(rpcUrl) });
  const recipientWallet = createWalletClient({
    account: recipient,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  // Node relayer for headless FHE encryption (browser uses @zama-fhe/react-sdk).
  const encryptor = new RelayerNode({
    transports: { [SepoliaConfig.chainId]: { ...SepoliaConfig, network: rpcUrl } },
    getChainId: () => Promise.resolve(sepolia.id),
  });

  const allocation = 1_000_000n; // 1 cmUSD @ 6 decimals
  const now = Math.floor(Date.now() / 1000);
  const userSalt =
    "0x0000000000000000000000000000000000000000000000000000000000000001" as const;

  console.log("admin    :", admin.address);
  console.log("recipient:", recipient.address);
  console.log("token    :", token);

  const factory = createConfidentialAirdropFactoryClient({
    publicClient,
    walletClient: adminWallet,
    encryptor,
  });
  console.log("factory  :", factory.address);

  // 1) Authorize the factory to pull the admin's confidential tokens (uint48 deadline).
  console.log("\n1/5  setOperator(factory) on token…");
  const until = 2_000_000_000; // ~year 2033, fits uint48
  const opHash = await adminWallet.writeContract({
    address: token,
    abi: erc7984SetOperatorAbi,
    functionName: "setOperator",
    args: [factory.address, until],
  });
  await publicClient.waitForTransactionReceipt({ hash: opHash });
  console.log("     ok:", opHash);

  // 2) Deploy + fund the campaign in one tx. SDK encrypts `amount` via encryptor.
  console.log("\n2/5  createAndFundConfidentialAirdrop…");
  const params = {
    token,
    startTimestamp: now + 30,
    endTimestamp: now + 7 * 86400,
    canExtendClaimWindow: true,
    admin: admin.address,
  };
  const { airdrop: airdropAddress, hash: createHash } =
    await factory.createAndFundConfidentialAirdrop({
      params,
      userSalt,
      amount: allocation, // pool seed; >= total of all claims
    });
  console.log("     campaign:", airdropAddress, "tx:", createHash);

  // 3) Authorize the recipient: encrypt (bound to recipient) + admin EIP-712 sign.
  console.log("\n3/5  encrypt + signClaimAuthorization…");
  const encrypted = await encryptUint64({
    encryptor,
    contractAddress: airdropAddress,
    userAddress: recipient.address, // MUST be recipient, not admin
    value: allocation,
  });
  const signature = await signClaimAuthorization({
    walletClient: adminWallet,
    airdropAddress,
    recipient: recipient.address,
    encryptedAmountHandle: encrypted.handle,
  });
  console.log("     payload ready");

  // 4) Recipient claims. Wait for the start window first.
  const airdrop = createConfidentialAirdropClient({
    publicClient,
    walletClient: recipientWallet,
    address: airdropAddress,
  });
  console.log("\n4/5  waiting for claim window, then claim…");
  while (!(await airdrop.isClaimWindowActive())) {
    await new Promise((r) => setTimeout(r, 3000));
  }
  const claimHash = await airdrop.claim({ encryptedInput: encrypted, signature });
  await publicClient.waitForTransactionReceipt({ hash: claimHash });
  console.log("     claimed:", claimHash);

  // 5) Verify: recipient grants self decrypt access, then userDecrypts the handle.
  console.log("\n5/5  getClaimAmount + userDecrypt (recipient-only)…");
  const recipientAirdrop = createConfidentialAirdropClient({
    publicClient,
    walletClient: recipientWallet,
    address: airdropAddress,
  });
  const view = await recipientAirdrop.getClaimAmount({ encryptedInput: encrypted, signature });
  console.log("     granted handle:", view.handle, "tx:", view.hash);
  console.log(
    "     (decrypt via relayer.userDecrypt with a recipient EIP-712 keypair to read plaintext —",
    "wired in the dApp; allocation was", allocation.toString(), "raw units)",
  );

  console.log("\nPipeline complete ✅  campaign:", airdropAddress);
}

main().catch((err) => {
  console.error("\nPipeline failed ❌\n", err);
  process.exitCode = 1;
});
