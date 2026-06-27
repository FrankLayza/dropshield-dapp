import { getAddress, isAddress } from "viem";


export const TOKEN_DECIMALS = 6;
const ONE = 10n ** BigInt(TOKEN_DECIMALS);

export interface Recipient {
  id: string;
  address: string;
  amount: string;
  label?: string;
  /** Optional — used for email delivery only, never stored on-chain */
  email?: string;
}


export type CampaignType = "payroll" | "investor" | "community" | "vesting";


export function recipientNoun(type: CampaignType): string {
  switch (type) {
    case "payroll":
      return "contributor";
    case "investor":
      return "investor";
    case "vesting":
      return "grantee";
    default:
      return "recipient";
  }
}

export interface RecipientIssue {
  field: "address" | "amount";
  message: string;
}


export function validateRecipient(r: Recipient, allAddresses: string[]): RecipientIssue[] {
  const issues: RecipientIssue[] = [];

  const addr = r.address.trim();
  if (!addr) {
    issues.push({ field: "address", message: "Address required" });
  } else if (!isAddress(addr)) {
    issues.push({ field: "address", message: "Not a valid address" });
  } else {
    const dupes = allAddresses.filter((a) => a.trim().toLowerCase() === addr.toLowerCase());
    if (dupes.length > 1) issues.push({ field: "address", message: "Duplicate recipient" });
  }

  const amt = r.amount.trim();
  if (!amt) {
    issues.push({ field: "amount", message: "Amount required" });
  } else if (!/^\d+(\.\d{1,6})?$/.test(amt)) {
    issues.push({ field: "amount", message: "Positive number, ≤6 decimals" });
  } else if (toRawUnits(amt) <= 0n) {
    issues.push({ field: "amount", message: "Must be greater than 0" });
  }

  return issues;
}


export function toRawUnits(amount: string): bigint {
  const clean = amount.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,6})?$/.test(clean)) return 0n;
  const [whole, frac = ""] = clean.split(".");
  const fracPadded = (frac + "0".repeat(TOKEN_DECIMALS)).slice(0, TOKEN_DECIMALS);
  return BigInt(whole) * ONE + BigInt(fracPadded || "0");
}


export function formatTokens(raw: bigint): string {
  const whole = raw / ONE;
  const frac = raw % ONE;
  const wholeStr = whole.toLocaleString("en-US");
  if (frac === 0n) return wholeStr;
  const fracStr = frac.toString().padStart(TOKEN_DECIMALS, "0").replace(/0+$/, "");
  return `${wholeStr}.${fracStr}`;
}


export function shortAddress(addr: string): string {
  if (!isAddress(addr)) return addr;
  const a = getAddress(addr);
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}


export function parseRecipientsCsv(text: string, makeId: () => string): Recipient[] {
  const rows: Recipient[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const cells = line.split(/[,\t;]/).map((c) => c.trim());
    if (cells.length < 2) continue;
    const [address, amount, label, email] = cells;
    if (/address/i.test(address) && /amount/i.test(amount)) continue;
    rows.push({ id: makeId(), address, amount, label: label ?? "", email: email ?? "" });
  }
  return rows;
}


export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


export function totalRawUnits(recipients: Recipient[]): bigint {
  return recipients.reduce((sum, r) => sum + toRawUnits(r.amount), 0n);
}
