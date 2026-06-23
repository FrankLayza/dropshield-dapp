import { toRawUnits, formatTokens, type Recipient } from "@/lib/recipients";



const SECONDS_PER_DAY = 86_400;

/* * Rough Sepolia gas for one create+fund tranche deploy (measured ~0.045 ETH). */
export const GAS_PER_TRANCHE_ETH = 0.05;


export const MIN_TRANCHES = 2;
export const MAX_TRANCHES = 12;

export interface VestingSchedule {
  
  trancheCount: number;
  
  intervalDays: number;
  
  cliffDays: number;
  
  startTs: number;
}

export const DEFAULT_SCHEDULE: Omit<VestingSchedule, "startTs"> = {
  trancheCount: 4,
  intervalDays: 30,
  cliffDays: 0,
};

export interface Tranche {
  
  index: number;
  
  unlockTs: number;
}


export function computeTranches(s: VestingSchedule): Tranche[] {
  const count = clampTrancheCount(s.trancheCount);
  const cliff = Math.max(0, Math.floor(s.cliffDays));
  const interval = Math.max(1, Math.floor(s.intervalDays));
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    unlockTs: s.startTs + (cliff + i * interval) * SECONDS_PER_DAY,
  }));
}

export function clampTrancheCount(n: number): number {
  if (!Number.isFinite(n)) return MIN_TRANCHES;
  return Math.min(MAX_TRANCHES, Math.max(MIN_TRANCHES, Math.floor(n)));
}


export function splitRawAmount(totalRaw: bigint, count: number): bigint[] {
  const n = BigInt(clampTrancheCount(count));
  const base = totalRaw / n;
  const parts = Array.from({ length: Number(n) }, () => base);
  const remainder = totalRaw - base * n;
  parts[parts.length - 1] += remainder;
  return parts;
}


export interface RecipientVestingPlan {
  recipient: Recipient;
  
  amountsRaw: bigint[];
  
  amountsDisplay: string[];
}


export function buildRecipientPlans(
  recipients: Recipient[],
  count: number,
): RecipientVestingPlan[] {
  return recipients.map((r) => {
    const amountsRaw = splitRawAmount(toRawUnits(r.amount), count);
    return {
      recipient: r,
      amountsRaw,
      amountsDisplay: amountsRaw.map((a) => formatTokens(a)),
    };
  });
}


export function planGrandTotalRaw(plans: RecipientVestingPlan[]): bigint {
  return plans.reduce(
    (sum, p) => sum + p.amountsRaw.reduce((s, a) => s + a, 0n),
    0n,
  );
}


export function tranchePoolTotalsRaw(plans: RecipientVestingPlan[], count: number): bigint[] {
  const n = clampTrancheCount(count);
  const totals = Array.from({ length: n }, () => 0n);
  for (const p of plans) {
    for (let i = 0; i < n; i++) totals[i] += p.amountsRaw[i] ?? 0n;
  }
  return totals;
}


export function formatUnlockDate(unlockTs: number): string {
  return new Date(unlockTs * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


export function isTrancheUnlocked(unlockTs: number, nowTs: number = Math.floor(Date.now() / 1000)): boolean {
  return nowTs >= unlockTs;
}




export interface VestingTrancheAuth {
  index: number;
  
  campaignAddress: string;
  unlockTs: number;
  
  amount: string;
  encryptedInput: { handle: string; inputProof: string };
  signature: string;
}


export interface VestingRecipientDelivery {
  address: string;
  label?: string;
  
  totalAmount: string;
  tranches: VestingTrancheAuth[];
}
