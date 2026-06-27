import { useCallback, useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { shortAddress, recipientNoun, isValidEmail, type CampaignType, type Recipient } from "@/lib/recipients";
import { type VestingRecipientDelivery, formatUnlockDate } from "@/lib/vesting";
import { buildClaimLink } from "@/lib/claimLink";
import { sendClaimEmails } from "@/lib/emailDelivery";
import { generateClaimZip } from "@/lib/zipExport";

interface StepDeliverProps {
  tokenAddress: string;
  campaignAddress: string;
  campaignName?: string;
  recipients?: Recipient[];
  authorizations: Array<{
    address: string;
    amount: string;
    label?: string;
    encryptedInput: { handle: string; inputProof: string };
    signature: string;
  }>;
  campaignType: CampaignType;
  vestingDeliveries?: VestingRecipientDelivery[];
  onReset: () => void;
}

type EmailState = "idle" | "sending" | "done" | "skipped";

export function StepDeliver({
  tokenAddress,
  campaignAddress,
  campaignName,
  recipients,
  authorizations,
  campaignType,
  vestingDeliveries,
  onReset,
}: StepDeliverProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCampaignLink, setCopiedCampaignLink] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [emailState, setEmailState] = useState<EmailState>("idle");
  const [emailSent, setEmailSent] = useState(0);
  const [emailFailed, setEmailFailed] = useState(0);
  const [emailNotConfigured, setEmailNotConfigured] = useState(false);

  const noun = recipientNoun(campaignType);
  const isVesting = !!vestingDeliveries && vestingDeliveries.length > 0;

  /* ── Link builders ───────────────────────────────────────────────── */

  const getVestingClaimLink = (d: VestingRecipientDelivery) =>
    buildClaimLink(window.location.origin, {
      r: d.address,
      l: d.label ?? "",
      total: d.totalAmount,
      t: d.tranches.map((tr) => ({
        i: tr.index,
        c: tr.campaignAddress,
        u: tr.unlockTs,
        a: tr.amount,
        h: tr.encryptedInput.handle,
        p: tr.encryptedInput.inputProof,
        s: tr.signature,
      })),
    });

  const getClaimLink = (auth: (typeof authorizations)[0]) =>
    buildClaimLink(window.location.origin, {
      c: campaignAddress,
      r: auth.address,
      a: auth.amount,
      h: auth.encryptedInput.handle,
      p: auth.encryptedInput.inputProof,
      s: auth.signature,
      ...(auth.label ? { l: auth.label } : {}),
    });

  const campaignDiscoveryLink = !isVesting && campaignAddress
    ? `${window.location.origin}/claim/${campaignAddress}`
    : null;

  /* ── Email delivery ──────────────────────────────────────────────── */

  const buildEmailRecipients = useCallback(() => {
    if (!recipients) return [];
    const emailMap = new Map(
      recipients
        .filter((r) => r.email && isValidEmail(r.email))
        .map((r) => [r.address.toLowerCase(), r.email!])
    );
    if (emailMap.size === 0) return [];

    if (isVesting) {
      return (vestingDeliveries ?? [])
        .filter((d) => emailMap.has(d.address.toLowerCase()))
        .map((d) => ({
          email: emailMap.get(d.address.toLowerCase())!,
          label: d.label,
          claimLink: getVestingClaimLink(d),
          campaignName: campaignName || "Your Token Campaign",
        }));
    }
    return authorizations
      .filter((a) => emailMap.has(a.address.toLowerCase()))
      .map((a) => ({
        email: emailMap.get(a.address.toLowerCase())!,
        label: a.label,
        claimLink: getClaimLink(a),
        campaignName: campaignName || "Your Token Campaign",
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const emailRecipients = buildEmailRecipients();
    if (emailRecipients.length === 0) {
      setEmailState("skipped");
      return;
    }
    setEmailState("sending");
    sendClaimEmails(emailRecipients).then((result) => {
      setEmailSent(result.sent);
      setEmailFailed(result.failed);
      setEmailNotConfigured(result.notConfigured ?? false);
      setEmailState("done");
    });
  }, [buildEmailRecipients]);

  /* ── ZIP download ────────────────────────────────────────────────── */

  const handleDownloadZip = async () => {
    setZipLoading(true);
    try {
      const zipRecipients = isVesting
        ? (vestingDeliveries ?? []).map((d) => ({
            address: d.address,
            label: d.label,
            claimLink: getVestingClaimLink(d),
          }))
        : authorizations.map((a) => ({
            address: a.address,
            label: a.label,
            claimLink: getClaimLink(a),
          }));

      const blob = await generateClaimZip({
        campaignName: campaignName || "campaign",
        campaignAddress,
        recipients: zipRecipients,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug = (campaignName || campaignAddress.slice(0, 8))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      a.download = `enveil-${slug}-claim-cards.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setZipLoading(false);
    }
  };

  /* ── CSV / JSON export ───────────────────────────────────────────── */

  const csvEscape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

  const handleCopyAllCsv = () => {
    const header = "label,address,amount,claimLink";
    const rows = authorizations.map((auth) =>
      [auth.label ?? "", auth.address, auth.amount, getClaimLink(auth)]
        .map((c) => csvEscape(String(c)))
        .join(",")
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadJson = () => {
    const data = {
      campaignAddress,
      tokenAddress,
      authorizations: authorizations.map((auth) => ({
        recipient: auth.address,
        amount: auth.amount,
        label: auth.label ?? "",
        encryptedInput: auth.encryptedInput,
        signature: auth.signature,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enveil-airdrop-${campaignAddress.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyAllVestingCsv = () => {
    const header = "label,address,total,unlocks,claimLink";
    const rows = (vestingDeliveries ?? []).map((d) =>
      [d.label ?? "", d.address, d.totalAmount, String(d.tranches.length), getVestingClaimLink(d)]
        .map((c) => csvEscape(String(c)))
        .join(","),
    );
    navigator.clipboard.writeText([header, ...rows].join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadVestingJson = () => {
    const data = { type: "vesting", tokenAddress, deliveries: vestingDeliveries };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enveil-vesting-${(campaignAddress || "campaign").slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ── Render ──────────────────────────────────────────────────────── */

  const withEmailCount = recipients?.filter((r) => r.email && isValidEmail(r.email)).length ?? 0;
  const noEmailCount = (isVesting ? vestingDeliveries?.length : authorizations.length) ?? 0;
  const missingEmailCount = noEmailCount - withEmailCount;

  return (
    <div className="animate-step-in space-y-5">

      {/* Confetti hero */}
      <div className="text-center py-4 flex flex-col items-center gap-1">
        <div className="w-32 h-32 -mb-2">
          <DotLottieReact
            src="/Confetti Check.lottie"
            autoplay
            loop={false}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-ink">Campaign Live!</h2>
        <p className="text-sm text-ink/60 mt-1 max-w-md mx-auto">
          Your campaign has been deployed, funded, and recipient payloads are authorized.
        </p>
      </div>

      {/* Campaign summary */}
      <div className="rounded-xl border border-edge bg-panel-2 p-5 space-y-4 text-sm shadow-xs">
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-0">
          <span className="text-ink/60 font-medium">Campaign Address</span>
          <span className="font-mono font-medium text-ink hidden sm:inline break-all bg-panel px-2 py-0.5 rounded-md border border-edge">
            {campaignAddress}
          </span>
          <span className="font-mono font-medium text-ink sm:hidden bg-panel px-2 py-0.5 rounded-md border border-edge">
            {shortAddress(campaignAddress)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-ink/60 font-medium">Total {isVesting ? "Grantees" : "Recipients"}</span>
          <span className="font-mono font-bold text-lg" style={{ color: "var(--card-accent)" }}>
            {isVesting ? vestingDeliveries!.length : authorizations.length}
          </span>
        </div>
        {isVesting && (
          <div className="flex justify-between items-center">
            <span className="text-ink/60 font-medium">Unlocks per grantee</span>
            <span className="font-mono font-bold text-lg" style={{ color: "var(--card-accent)" }}>
              {vestingDeliveries![0]?.tranches.length ?? 0}
            </span>
          </div>
        )}
      </div>

      {/* Email delivery status */}
      {emailState !== "skipped" && (
        <div className="rounded-xl border border-edge bg-panel p-5 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-mute">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            <h3 className="text-sm font-bold text-ink">Email Notifications</h3>
          </div>

          {emailState === "idle" || emailState === "sending" ? (
            <div className="flex items-center gap-2 text-sm text-mute">
              <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>
              </svg>
              Sending notification emails…
            </div>
          ) : emailNotConfigured ? (
            <div className="space-y-1.5">
              <p className="text-sm text-mute">
                Email delivery requires the{" "}
                <code className="rounded bg-panel-2 px-1 py-0.5 text-[11px] font-mono border border-edge">RESEND_API_KEY</code>{" "}
                environment variable set in your Vercel deployment.
              </p>
              <p className="text-xs text-faint">Share the per-recipient links or ZIP cards below instead.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {emailSent > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-bg shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-success-text"><path d="M20 6 9 17l-5-5"/></svg>
                  </span>
                  <span className="text-ink font-medium">{emailSent} of {withEmailCount} recipient{withEmailCount !== 1 ? "s" : ""} notified by email</span>
                </div>
              )}
              {emailFailed > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger-bg shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-danger"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </span>
                  <span className="text-danger font-medium">{emailFailed} email{emailFailed !== 1 ? "s" : ""} failed — share their links manually</span>
                </div>
              )}
              {missingEmailCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning-bg shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-warning-text"><path d="M12 8v4M12 16h.01"/></svg>
                  </span>
                  <span className="text-warning-text font-medium">{missingEmailCount} recipient{missingEmailCount !== 1 ? "s have" : " has"} no email — share their link manually</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Download ZIP */}
      <div className="rounded-xl border border-edge bg-panel p-5 shadow-xs">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-bold text-ink">Download Claim Cards</h3>
            <p className="text-xs text-mute mt-0.5">
              One branded card + QR code per recipient. Share via WhatsApp, Telegram, or print.
            </p>
          </div>
          <button
            onClick={handleDownloadZip}
            disabled={zipLoading}
            className="shrink-0 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-md transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" }}
          >
            {zipLoading ? (
              <>
                <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <DownloadIcon />
                Download all cards (.zip)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Campaign discovery link (non-vesting only) */}
      {campaignDiscoveryLink && (
        <div className="rounded-xl border border-edge bg-panel p-5 shadow-xs">
          <h3 className="text-sm font-bold text-ink mb-1">Campaign Link</h3>
          <p className="text-xs text-mute mb-3">
            Share publicly so recipients can check eligibility by connecting their wallet.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-edge bg-panel-2 px-3 py-2.5 font-mono text-xs text-ink">
              {campaignDiscoveryLink}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(campaignDiscoveryLink);
                setCopiedCampaignLink(true);
                setTimeout(() => setCopiedCampaignLink(false), 2000);
              }}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel px-3.5 py-2.5 text-xs font-bold text-ink transition-all duration-150 hover:bg-panel-2"
            >
              {copiedCampaignLink ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Advanced: per-recipient links (collapsed) */}
      <details className="group rounded-xl border border-edge bg-panel shadow-xs overflow-hidden">
        <summary className="flex cursor-pointer items-center justify-between px-5 py-4 select-none list-none">
          <div>
            <h3 className="text-sm font-bold text-ink">Advanced: per-recipient links</h3>
            <p className="text-xs text-ink/50 mt-0.5">
              Each link carries a private encrypted payload for that {noun} only.
            </p>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className="shrink-0 text-mute transition-transform duration-200 group-open:rotate-180"
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </summary>

        {/* Export row */}
        <div className="border-t border-edge px-5 py-3 flex flex-wrap gap-2">
          <button
            onClick={isVesting ? handleCopyAllVestingCsv : handleCopyAllCsv}
            className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel-2 px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-panel"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            {copiedAll ? "Copied!" : "Copy all as CSV"}
          </button>
          <button
            onClick={isVesting ? handleDownloadVestingJson : handleDownloadJson}
            className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel-2 px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-panel"
          >
            <DownloadIcon size={12} />
            Download JSON
          </button>
        </div>

        {/* Table */}
        <div className="max-h-72 overflow-y-auto overflow-x-auto border-t border-edge">
          <table className="w-full text-left text-sm min-w-[380px]">
            <thead className="bg-panel-2 text-[11px] font-bold uppercase tracking-widest text-ink/50 border-b border-edge sticky top-0">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">{noun}</th>
                <th className="px-4 py-3 text-right">{isVesting ? "Total" : "Amount"}</th>
                {isVesting && <th className="px-4 py-3 text-right">Unlocks</th>}
                <th className="px-4 py-3 text-right">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/60 font-mono text-sm">
              {isVesting
                ? vestingDeliveries!.map((d, idx) => (
                    <tr key={d.address} className="transition-colors hover:bg-panel-2/50">
                      <td className="px-4 py-3 font-sans text-ink">
                        {d.label ? d.label : <span className="text-ink/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-ink">{shortAddress(d.address)}</td>
                      <td className="px-4 py-3 text-right text-ink font-semibold">{d.totalAmount}</td>
                      <td
                        className="px-4 py-3 text-right text-ink/60"
                        title={d.tranches.map((t) => formatUnlockDate(t.unlockTs)).join(", ")}
                      >
                        {d.tranches.length}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(getVestingClaimLink(d));
                            setCopiedIndex(idx);
                            setTimeout(() => setCopiedIndex(null), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ color: "var(--card-accent)" }}
                        >
                          {copiedIndex === idx ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                              Copied!
                            </>
                          ) : "Copy link"}
                        </button>
                      </td>
                    </tr>
                  ))
                : authorizations.map((auth, idx) => (
                    <tr key={auth.address} className="transition-colors hover:bg-panel-2/50">
                      <td className="px-4 py-3 font-sans text-ink">
                        {auth.label ? auth.label : <span className="text-ink/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-ink">{shortAddress(auth.address)}</td>
                      <td className="px-4 py-3 text-right text-ink font-semibold">{auth.amount}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(getClaimLink(auth));
                            setCopiedIndex(idx);
                            setTimeout(() => setCopiedIndex(null), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold hover:opacity-80 transition-opacity"
                          style={{ color: "var(--card-accent)" }}
                        >
                          {copiedIndex === idx ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
                              Copied!
                            </>
                          ) : "Copy link"}
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Reset */}
      <div className="flex items-center justify-center border-t border-edge pt-8 mt-4">
        <button
          onClick={onReset}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-edge bg-panel px-8 py-3 text-sm font-bold text-ink transition-all duration-150 hover:bg-panel-2"
        >
          Create another campaign
        </button>
      </div>
    </div>
  );
}

function DownloadIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
