import { Link, useParams } from "react-router-dom";
import { useAccount } from "wagmi";
import { shortAddress } from "@/lib/recipients";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusPill } from "@/components/admin/StatusPill";
import { useMyCampaigns, useClaimCount } from "@/lib/useCampaignAnalytics";

const fmtFull = (ts: number) =>
  new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function CampaignDetail() {
  const { address: param } = useParams();
  const { address: admin, isConnected } = useAccount();
  const { data: campaigns, isLoading, isError, isFetching, refetch } = useMyCampaigns(admin);

  const campaign = (campaigns ?? []).find(
    (c) => c.address.toLowerCase() === param?.toLowerCase(),
  );

  const { data: claimed } = useClaimCount(
    campaign?.address,
    campaign?.creationBlock,
    campaign?.status === "active",
  );

  const back = (
    <Link to="/admin" className="link-rise mb-5 inline-block text-sm font-medium text-mute hover:text-ink">
      ← Dashboard
    </Link>
  );

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-2xl">
        {back}
        <div className="rounded-2xl border border-violet-edge bg-violet-tint/40 px-6 py-12 text-center text-sm text-mute">
          Connect your wallet to view this campaign.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        {back}
        <div className="h-64 animate-pulse rounded-2xl border border-edge bg-panel-2" />
      </div>
    );
  }

  // Network/RPC failure — distinct from "not found" so the admin doesn't think
  // their campaign vanished when it's really a rate-limited public node.
  if (isError) {
    return (
      <div className="mx-auto max-w-2xl">
        {back}
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-sm font-semibold text-danger">Couldn't load this campaign</h2>
          <p className="mt-1 max-w-md text-sm text-danger/80">
            The RPC endpoint rejected the request — usually a rate limit on a public
            node. Wait a moment and retry, or switch to a dedicated RPC.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isFetching ? "animate-spin" : ""}
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
            </svg>
            {isFetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-2xl">
        {back}
        <div className="rounded-2xl border border-edge bg-panel px-6 py-12 text-center">
          <h2 className="font-display text-lg font-semibold text-ink">Campaign not found</h2>
          <p className="mt-1.5 text-sm text-mute">
            No campaign at <span className="font-mono">{param ? shortAddress(param) : "—"}</span> for
            this wallet. It may belong to another admin account.
          </p>
        </div>
      </div>
    );
  }

  const { name, address, token, status, totalRecipients, startTime, endTime, campaignType } =
    campaign;
  const hasTotal = typeof totalRecipients === "number" && totalRecipients > 0;
  const pct =
    hasTotal && typeof claimed === "number"
      ? Math.round((claimed / totalRecipients!) * 100)
      : null;

  return (
    <div className="mx-auto max-w-2xl">
      {back}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            {name || shortAddress(address)}
          </h1>
          {campaignType && (
            <p className="mt-1 text-sm capitalize text-mute">{campaignType} campaign</p>
          )}
        </div>
        <StatusPill status={status} />
      </div>

      {/* Progress hero */}
      <div className="mt-6 rounded-2xl border border-edge bg-panel p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-faint">Claim progress</p>
        <p className="mt-2 font-display text-4xl font-bold text-ink">
          {typeof claimed === "number" ? claimed : "—"}
          {hasTotal && (
            <span className="text-2xl font-semibold text-mute"> / {totalRecipients}</span>
          )}
          {pct !== null && <span className="ml-2 text-2xl font-semibold text-violet">· {pct}%</span>}
        </p>
        <div className="mt-4">
          <ProgressBar
            value={claimed ?? 0}
            max={hasTotal ? totalRecipients : undefined}
            indeterminate={!hasTotal}
          />
        </div>
        {!hasTotal && (
          <p className="mt-2 text-xs text-faint">
            Recipient total unknown for this device — showing claim count only.
          </p>
        )}
      </div>

      {/* Facts */}
      <div className="mt-4 rounded-2xl border border-edge bg-panel p-6">
        <dl className="divide-y divide-edge text-sm">
          <Row label="Campaign">
            <a
              href={`https://sepolia.etherscan.io/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="link-rise font-mono text-xs text-ink"
            >
              {shortAddress(address)}
            </a>
          </Row>
          <Row label="Token">
            <span className="font-mono text-xs text-ink">{shortAddress(token)}</span>
          </Row>
          <Row label="Claim opens">
            <span className="text-ink">{fmtFull(startTime)}</span>
          </Row>
          <Row label="Claim closes">
            <span className="text-ink">{fmtFull(endTime)}</span>
          </Row>
        </dl>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-mute">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
