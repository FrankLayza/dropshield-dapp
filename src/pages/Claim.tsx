import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, useReducedMotion, useMotionValue, animate } from "framer-motion";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useUserDecrypt } from "@zama-fhe/react-sdk";
import {
  useGetClaimAmount,
  useClaim,
  useAirdropIsSignatureClaimed,
} from "@tokenops/sdk/fhe-airdrop/react";
import { formatTokens, shortAddress, TOKEN_DECIMALS } from "@/lib/recipients";
import { ConfidentialBalance } from "@/components/ConfidentialBalance";
import { Shield } from "@/components/Shield";
import { VestingClaim, type VestingPayload } from "@/components/VestingClaim";
import { decodeClaimPayload, isVestingPayload } from "@/lib/claimLink";
import { useCheckRecipient, useCampaignName } from "@/lib/registry";

// The Zama relayer and Sepolia RPC intermittently time out / fetch-fail.
const isTransientRelayerError = (msg: string) =>
  /timed out|fetch|relayer|network|ENCRYPT|worker|NODE_INIT|ECONNRESET|ETIMEDOUT/i.test(
    msg,
  );

const LOW_ETH_THRESHOLD = 5_000_000_000_000_000n;

/* ── Claim page state machine ─────────────────────────────────────────
 *
 * Allocations can ONLY be claimed through the unique, self-contained claim
 * link the campaign creator sends each recipient (`/claim#z=<payload>`). That
 * link carries the encrypted handle + input proof + EIP-712 signature — the
 * page never accepts a manually uploaded/pasted payload.
 *
 * No-link    — no campaign in the URL: visitor didn't arrive from a link.
 *              Empty state pointing them to their personal claim link.
 * Pre-connect — campaign discovery link (`/claim/:address`), wallet not yet
 *              connected: prompt connect to check eligibility.
 * Checking    — wallet connected, registry checkRecipient in flight.
 * Confirmed-no-payload — registry confirms recipient, but this is a discovery
 *              link (no payload) → tell them to open their personal claim link.
 * No-claim    — registry says this wallet isn't a recipient.
 * Claim-found / Already-claimed / Legacy-loaded — full payload present
 *              (from the `#z=` claim link): reveal + claim flow.
 * Vesting     — vesting payload loaded from the claim link.
 * ──────────────────────────────────────────────────────────────────── */

type ClaimPageState =
  | "pre-connect"
  | "no-link"
  | "checking"
  | "confirmed-no-payload"
  | "claim-found"
  | "no-claim"
  | "already-claimed"
  | "vesting"
  | "legacy-loaded"; // payload came from a hash link, skip registry

export function Claim() {
  const { address: urlAddress } = useParams<{ address?: string }>();
  const { address: connectedAddress, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  // ETH balance check — claiming costs gas
  const { data: ethBalance } = useBalance({ address: connectedAddress });
  const isLowEth =
    isConnected && ethBalance !== undefined && ethBalance.value < LOW_ETH_THRESHOLD;

  /* ── Payload state (same fields as original) ────────────────────── */
  const [campaignAddress, setCampaignAddress] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [plaintextAmount, setPlaintextAmount] = useState("");
  const [encryptedHandle, setEncryptedHandle] = useState<`0x${string}` | "">("");
  const [inputProof, setInputProof] = useState<`0x${string}` | "">("");
  const [signature, setSignature] = useState<`0x${string}` | "">("");
  const [recipientLabel, setRecipientLabel] = useState("");

  /* ── Reveal / decrypt state ─────────────────────────────────────── */
  const [revealHandle, setRevealHandle] = useState<`0x${string}` | "">("");
  const [decryptedAmount, setDecryptedAmount] = useState<bigint | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  /* ── Vesting state ──────────────────────────────────────────────── */
  const [vestingPayload, setVestingPayload] = useState<VestingPayload | null>(null);

  /* ── Track whether payload came from a hash link (legacy flow) ── */
  const [hashLinkLoaded, setHashLinkLoaded] = useState(false);

  /* ── Set campaign address from URL param ────────────────────────── */
  useEffect(() => {
    if (urlAddress && !campaignAddress) {
      setCampaignAddress(urlAddress);
    }
  }, [urlAddress, campaignAddress]);

  /* ── Hash-based link parsing (backward compat) ─────────────────── */
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    try {
      // Current format: gzip-compressed payload under `z=`
      const zMatch = hash.match(/(?:^|&)z=([^&]+)/);
      if (zMatch) {
        const parsed = decodeClaimPayload(zMatch[1]);
        if (isVestingPayload(parsed)) {
          setVestingPayload(parsed as unknown as VestingPayload);
          setHashLinkLoaded(true);
          window.location.hash = "";
          return;
        }
        if (parsed && (parsed as any).c && (parsed as any).r) {
          const p = parsed as any;
          setCampaignAddress(p.c);
          setRecipientAddress(p.r);
          setPlaintextAmount(p.a);
          setEncryptedHandle(p.h as `0x${string}`);
          setInputProof(p.p as `0x${string}`);
          setSignature(p.s as `0x${string}`);
          if (p.l) setRecipientLabel(p.l);
          setHashLinkLoaded(true);
          window.location.hash = "";
          return;
        }
      }

      // Legacy format: `v=` carried encodeURIComponent'd JSON for vesting links
      const vMatch = hash.match(/(?:^|&)v=([^&]+)/);
      if (vMatch) {
        const parsed = JSON.parse(decodeURIComponent(vMatch[1]));
        if (parsed && Array.isArray(parsed.t) && parsed.r) {
          setVestingPayload(parsed as VestingPayload);
          setHashLinkLoaded(true);
          window.location.hash = "";
          return;
        }
      }

      // Legacy format: flat `c=&r=&a=&h=&p=&s=&l=` key/value pairs
      const params = new URLSearchParams(hash);
      const c = params.get("c");
      const r = params.get("r");
      const a = params.get("a");
      const h = params.get("h");
      const p = params.get("p");
      const s = params.get("s");
      const l = params.get("l");

      if (c && r && a && h && p && s) {
        setCampaignAddress(c);
        setRecipientAddress(r);
        setPlaintextAmount(a);
        setEncryptedHandle(h as `0x${string}`);
        setInputProof(p as `0x${string}`);
        setSignature(s as `0x${string}`);
        if (l) setRecipientLabel(l);
        setHashLinkLoaded(true);
        window.location.hash = "";
      }
    } catch (err) {
      console.error("Failed to parse URL hash parameters", err);
    }
  }, []);

  /* ── Registry hooks (wallet-based discovery) ────────────────────── */
  const campaignAddr = campaignAddress as `0x${string}` | undefined;
  const walletAddr = connectedAddress as `0x${string}` | undefined;

  const checkRecipientQuery = useCheckRecipient(
    !hashLinkLoaded ? campaignAddr : undefined,
    !hashLinkLoaded ? walletAddr : undefined,
  );

  const campaignNameQuery = useCampaignName(
    campaignAddr && campaignAddr !== ("" as any) ? campaignAddr : undefined,
  );
  const onChainCampaignName = campaignNameQuery.data as string | undefined;

  /* ── Claim / reveal hooks ───────────────────────────────────────── */
  const isLoaded = !!campaignAddress && !!encryptedHandle && !!signature;

  const isClaimedQuery = useAirdropIsSignatureClaimed({
    address: campaignAddress as `0x${string}`,
    user: recipientAddress as `0x${string}`,
    encryptedAmountHandle: encryptedHandle || undefined,
  });

  const revealMutation = useGetClaimAmount({
    address: campaignAddress as `0x${string}`,
  });

  const claimMutation = useClaim({
    address: campaignAddress as `0x${string}`,
  });

  const decryptQuery = useUserDecrypt(
    {
      handles: revealHandle
        ? [{ handle: revealHandle, contractAddress: campaignAddress as `0x${string}` }]
        : [],
    },
    {
      enabled: !!revealHandle && !!campaignAddress,
      retry: 4,
      retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 8000),
    }
  );

  useEffect(() => {
    if (!revealHandle || !decryptQuery.data) return;
    const value = decryptQuery.data[revealHandle];
    if (typeof value === "bigint") setDecryptedAmount(value);
  }, [decryptQuery.data, revealHandle]);

  useEffect(() => {
    if (!decryptQuery.error) return;
    const msg = decryptQuery.error.message || "";
    setErrorMsg(
      isTransientRelayerError(msg)
        ? "The secure reveal service is unresponsive right now. Wait a moment and try again."
        : msg || "Reveal failed.",
    );
  }, [decryptQuery.error]);

  const isDecryptRetrying =
    !!revealHandle && decryptedAmount === null && decryptQuery.failureCount > 0 && decryptQuery.isFetching;

  const isRevealing =
    revealMutation.isPending || (!!revealHandle && decryptedAmount === null && decryptQuery.isFetching);

  const handleReveal = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const result = await revealMutation.mutateAsync({
        encryptedInput: {
          handle: encryptedHandle as `0x${string}`,
          inputProof: inputProof as `0x${string}`,
        },
        signature: signature as `0x${string}`,
      });
      setRevealHandle(result.handle);
    } catch (err: any) {
      console.error(err);
      const msg = (err?.message ?? String(err)) + " " + (err?.cause?.message ?? "");
      setErrorMsg(
        isTransientRelayerError(msg)
          ? "The network is slow right now. Wait a moment and click Reveal again."
          : err?.message || "Reveal failed.",
      );
    }
  };

  const handleClaim = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const hash = await claimMutation.mutateAsync({
        encryptedInput: {
          handle: encryptedHandle as `0x${string}`,
          inputProof: inputProof as `0x${string}`,
        },
        signature: signature as `0x${string}`,
      });

      setSuccessMsg(`Tokens claimed successfully! Tx hash: ${hash}`);
      isClaimedQuery.refetch();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Claim transaction failed.");
    }
  };

  const addressMismatch =
    isConnected &&
    connectedAddress &&
    recipientAddress &&
    connectedAddress.toLowerCase() !== recipientAddress.toLowerCase();

  const clearPayload = () => {
    setCampaignAddress(urlAddress || "");
    setRecipientAddress("");
    setPlaintextAmount("");
    setEncryptedHandle("");
    setInputProof("");
    setSignature("");
    setRecipientLabel("");
    setDecryptedAmount(null);
    setRevealHandle("");
    setHashLinkLoaded(false);
  };

  /* ── Compute page state ─────────────────────────────────────────── */
  const computeState = (): ClaimPageState => {
    // Vesting always wins
    if (vestingPayload) return "vesting";

    // Legacy hash link — payload loaded directly, skip registry
    if (hashLinkLoaded && isLoaded) return "legacy-loaded";

    // No campaign in the URL → visitor didn't arrive from a claim/discovery
    // link. Show the "open your claim link" empty state (works connected or not).
    if (!campaignAddress) return "no-link";

    // Wallet not connected
    if (!isConnected) return "pre-connect";

    // Registry check in flight
    if (checkRecipientQuery.isLoading) return "checking";

    // Registry says yes
    if (checkRecipientQuery.data === true) {
      if (isLoaded) {
        if (isClaimedQuery.data === true) return "already-claimed";
        return "claim-found";
      }
      return "confirmed-no-payload";
    }

    // Registry says no (or registry not deployed yet / error)
    if (checkRecipientQuery.data === false) return "no-claim";

    // Registry query errored or hasn't returned yet — show checking
    return "checking";
  };

  const pageState = computeState();

  /* ── Display name for the campaign ──────────────────────────────── */
  const displayName = onChainCampaignName || (campaignAddress ? shortAddress(campaignAddress) : "Campaign");

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* ── State 5: Vesting ──────────────────────────────────────── */}
      {pageState === "vesting" && vestingPayload && (
        <VestingClaim payload={vestingPayload} onClear={() => setVestingPayload(null)} />
      )}

      {/* ── State 0: Pre-connect ──────────────────────────────────── */}
      {pageState === "pre-connect" && (
        <div className="space-y-6 animate-step-in">
          <div className="rounded-2xl border border-edge bg-panel p-6 sm:p-8 text-center space-y-5">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-violet/10 text-violet">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                {displayName}
              </h1>
              <p className="text-sm text-mute mt-2">
                Connect your wallet to check if you have an allocation in this campaign.
              </p>
            </div>
            <button
              onClick={openConnectModal}
              className="w-full rounded-xl bg-violet py-3.5 text-sm font-bold text-white transition-all hover:bg-violet-hover hover:-translate-y-0.5 shadow-md shadow-violet/20"
            >
              Connect Wallet to Check Your Allocation
            </button>
            <p className="text-xs text-faint">
              Your allocation is private. Only you can see it.
            </p>
          </div>
        </div>
      )}

      {/* ── State 1: Checking ─────────────────────────────────────── */}
      {pageState === "checking" && (
        <div className="space-y-6 animate-step-in">
          <div className="rounded-2xl border border-edge bg-panel p-6 sm:p-8 text-center space-y-4">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-edge border-t-violet mx-auto" />
            <div>
              <p className="text-sm font-semibold text-ink">
                Checking your allocation…
              </p>
              <p className="font-mono text-xs text-mute mt-1">
                {connectedAddress ? shortAddress(connectedAddress) : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── No-link: visitor didn't arrive from a claim link ───────── */}
      {pageState === "no-link" && (
        <div className="space-y-6 animate-step-in">
          <div className="rounded-2xl border border-edge bg-panel p-8 text-center">
            <span className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet/10 text-violet">
              <Shield size={30} />
            </span>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Open your private claim link
            </h1>
            <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-mute">
              Allocations are claimed only through the unique, encrypted link the
              campaign creator sent you — by email or direct message. Open that
              link to privately reveal and claim your tokens.
            </p>

            <div className="mx-auto mt-6 flex max-w-sm items-start gap-2.5 rounded-xl border border-edge bg-panel-2/50 p-3.5 text-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-mute)" strokeWidth="1.8" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <p className="text-xs leading-relaxed text-mute">
                Don't have your link? Ask the campaign creator to resend it — your
                allocation can't be looked up without it, which is what keeps it private.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmed recipient via discovery link, but no payload ──── */}
      {pageState === "confirmed-no-payload" && (
        <div className="space-y-6 animate-step-in">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {displayName}
            </h1>
          </div>

          {/* Confirmation badge — registry verified this wallet is a recipient */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                You're confirmed as a recipient of this campaign.
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                One more step — open your personal claim link to reveal and claim.
              </p>
            </div>
          </div>

          {/* Direct them to their personal claim link (no manual upload) */}
          <div className="rounded-2xl border border-edge bg-panel p-6 text-center">
            <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet/10 text-violet">
              <Shield size={26} />
            </span>
            <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
              Open your personal claim link
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-mute">
              Your encrypted allocation can only be unlocked from the unique claim
              link the creator sent you — it carries the private authorization this
              page needs to reveal and claim. Open that link to continue.
            </p>
          </div>
        </div>
      )}

      {/* ── State 3: No Claim Found ───────────────────────────────── */}
      {pageState === "no-claim" && (
        <div className="space-y-6 animate-step-in">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {displayName}
            </h1>
          </div>

          <div className="rounded-xl border border-gold/40 bg-gold-tint/30 p-5 text-center space-y-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold-dim mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                No allocation found for {connectedAddress ? shortAddress(connectedAddress) : "this wallet"} in this campaign.
              </p>
              <p className="text-xs text-mute mt-1.5">
                Try switching to a different wallet, or contact the campaign creator.
              </p>
            </div>
            <button
              onClick={openConnectModal}
              className="inline-flex items-center gap-2 rounded-lg border border-edge-strong px-5 py-2.5 text-sm font-semibold text-ink hover:bg-panel-2/60 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12H3M8 6l-6 6 6 6" /></svg>
              Switch Wallet
            </button>
          </div>
        </div>
      )}

      {/* ── State 2 / State 4 / Legacy: Payload loaded ────────────── */}
      {(pageState === "claim-found" || pageState === "already-claimed" || pageState === "legacy-loaded") && isLoaded && (
        <div className="space-y-6 animate-step-in">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Claim your tokens
            </h1>
            <p className="text-sm text-mute mt-1">
              Your allocation is confirmed. Reveal the amount privately, then claim.
            </p>
          </div>

          {/* Allocation details card */}
          <div className="rounded-xl border border-edge bg-panel p-4 sm:p-5 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <span className="text-sm font-semibold text-ink">
                {recipientLabel ? `Allocation for ${recipientLabel}` : "Airdrop Details"}
              </span>
              <button
                onClick={clearPayload}
                className="text-xs font-semibold text-danger text-left sm:text-right hover:underline"
              >
                Clear
              </button>
            </div>

            <div className="divide-y divide-edge text-sm">
              <div className="flex justify-between py-2">
                <span className="text-mute">Campaign</span>
                <span className="font-mono text-xs text-ink">
                  {shortAddress(campaignAddress)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-mute">Recipient</span>
                <span className="font-mono text-xs text-ink">
                  {shortAddress(recipientAddress)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-mute">Your Allocation</span>
                {decryptedAmount === null ? (
                  <span
                    className="font-mono font-medium tracking-widest text-faint select-none"
                    title="Private on-chain — click below to reveal"
                  >
                    •••••• tokens
                  </span>
                ) : (
                  <span className="font-mono font-semibold text-ink">
                    <AmountReveal raw={decryptedAmount} /> tokens
                  </span>
                )}
              </div>
            </div>

            {/* Verified badge */}
            {decryptedAmount !== null && (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm">
                <span className="shrink-0 text-emerald-600">
                  <Shield size={22} />
                </span>
                <div>
                  <p className="font-semibold">Securely Verified</p>
                  <p className="text-xs opacity-90">
                    Your private allocation is {formatTokens(decryptedAmount)} tokens
                    {plaintextAmount ? " — matching the amount your sender committed" : ""}.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions card */}
          <div className="rounded-2xl border border-edge bg-panel p-4 sm:p-6 space-y-5">
            {!isConnected ? (
              <div className="text-center py-6 text-sm text-mute">
                Connect your wallet to check eligibility and claim.
              </div>
            ) : addressMismatch ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-danger space-y-2">
                <p className="font-semibold">Recipient address mismatch</p>
                <p>
                  Your connected address ({shortAddress(connectedAddress)}) does not match the
                  designated recipient address ({shortAddress(recipientAddress)}). Please switch to the correct account in your wallet.
                </p>
              </div>
            ) : isClaimedQuery.data === true ? (
              /* ── State 4: Already Claimed ────────────────────────── */
              <div className="text-center py-6 space-y-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <h3 className="font-semibold text-base text-ink">
                  You've already claimed your allocation.
                </h3>
                <p className="text-xs text-mute">
                  The tokens for this signature have already been claimed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Low gas warning */}
                {isLowEth && (
                  <div className="rounded-lg border border-gold/40 bg-gold-tint/40 p-3 text-xs text-gold-dim">
                    Low on Sepolia ETH (
                    <span className="font-mono">
                      {Number(formatEther(ethBalance!.value)).toFixed(4)} ETH
                    </span>
                    ). Claiming sends an on-chain transaction with an attached gas
                    fee — top up a little testnet ETH first, or the claim may fail
                    with \u201cinsufficient funds.\u201d
                  </div>
                )}

                {/* Step 1: Reveal */}
                {decryptedAmount === null && (
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-ink">
                      1. Securely Reveal Amount
                    </h3>
                    <p className="text-xs text-mute">
                      Triggers a secure request to reveal your allocation. You will approve a signature in your wallet to view the amount privately.
                    </p>
                    <button
                      onClick={handleReveal}
                      disabled={isRevealing}
                      className="w-full rounded-lg border border-gold/40 bg-gold/5 py-2.5 text-sm font-semibold text-gold-dim transition-all hover:bg-gold/10 disabled:opacity-60"
                    >
                      {isDecryptRetrying
                        ? `Secure service slow — retrying (${decryptQuery.failureCount})…`
                        : isRevealing
                          ? "Revealing allocation…"
                          : "Reveal Allocation"}
                    </button>
                  </div>
                )}

                {/* Step 2: Claim */}
                <div className="space-y-2.5 pt-3 border-t border-edge">
                  <h3 className="text-sm font-semibold text-ink">
                    2. Claim Tokens
                  </h3>
                  <p className="text-xs text-mute">
                    {decryptedAmount === null
                      ? "Reveal your allocation above to unlock claiming."
                      : "Consumes your claim signature and transfers the tokens directly to your wallet."}
                  </p>
                  <button
                    onClick={handleClaim}
                    disabled={claimMutation.isPending || decryptedAmount === null}
                    className="w-full rounded-lg bg-iris py-2.5 text-sm font-semibold text-white transition-all hover:bg-iris-dim disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {claimMutation.isPending
                      ? "Claiming..."
                      : decryptedAmount === null
                        ? "Reveal to unlock"
                        : "Claim Allocation"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Error / success banners (global) ──────────────────────── */}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-danger">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 break-all">
          {successMsg}
        </div>
      )}

      {/* ── Confidential balance footer ───────────────────────────── */}
      {isConnected && (
        <div className="border-t border-edge pt-6">
          <ConfidentialBalance />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * AmountReveal — animates a confidential allocation from 0 up to its
 * decrypted value, turning the FHE decrypt into the visible "reveal"
 * moment. Honors the user's reduced-motion preference by snapping
 * straight to the final value.
 * ────────────────────────────────────────────────────────────────── */
function AmountReveal({ raw }: { raw: bigint }) {
  const reduceMotion = useReducedMotion();
  const target = Number(raw) / 10 ** TOKEN_DECIMALS;
  const mv = useMotionValue(reduceMotion ? target : 0);
  const [display, setDisplay] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(target);
      return;
    }
    const controls = animate(mv, target, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [mv, target, reduceMotion]);

  const isSettled = Math.abs(display - target) < 0.5;
  const text = isSettled
    ? formatTokens(raw)
    : display.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <motion.span
      initial={reduceMotion ? false : { opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {text}
    </motion.span>
  );
}
