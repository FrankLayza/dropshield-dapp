import type { CampaignType } from "@/lib/recipients";

/**
 * CampaignTypeSelector — display-only campaign framing. Picking a type changes
 * copy/labels throughout the wizard (e.g. "contributor" vs "investor"); it does
 * NOT change any contract call. Same create → fund → authorize → claim pipeline.
 */
const OPTIONS: Array<{
  id: CampaignType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: "payroll",
    label: "Contributor Payroll",
    description: "Pay DAO contributors privately. Salaries stay between you and each recipient.",
    icon: "💼",
  },
  {
    id: "investor",
    label: "Investor Distribution",
    description: "Distribute to cap-table participants without exposing allocation sizes.",
    icon: "📊",
  },
  {
    id: "community",
    label: "Community Rewards",
    description: "Airdrop to community members. Amounts remain confidential on-chain.",
    icon: "🎁",
  },
];

export function CampaignTypeSelector({
  value,
  onChange,
}: {
  value: CampaignType;
  onChange: (t: CampaignType) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">Campaign type</h3>
        <p className="text-xs text-mute">
          Sets the wording across the wizard. The encrypted pipeline is identical for every type.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const selected = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={selected}
              className={
                "rounded-xl border p-3.5 text-left transition-colors duration-150 " +
                (selected
                  ? "border-gold bg-gold/5 ring-1 ring-gold/40"
                  : "border-edge-strong hover:border-gold/50 hover:bg-panel-2")
              }
            >
              <span className="text-xl">{opt.icon}</span>
              <p className="mt-1.5 text-sm font-semibold text-ink">{opt.label}</p>
              <p className="mt-0.5 text-xs leading-snug text-mute">{opt.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
