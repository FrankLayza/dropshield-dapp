import type { CampaignType } from "@/lib/recipients";



const STORE_KEY = "enveil.campaigns.v1";

export interface StoredCampaign {
  
  address: string;
  
  name: string;
  campaignType: CampaignType;
  tokenAddress: string;
  
  totalRecipients: number;
  startTimestamp: number;
  endTimestamp: number;
  
  createdAt: number;
  
  admin: string;
  
  trancheAddresses?: string[];
  
  trancheCount?: number;
}


export function getHiddenTrancheAddresses(admin: string): Set<string> {
  const hidden = new Set<string>();
  for (const c of getStoredCampaigns(admin)) {
    for (const t of c.trancheAddresses ?? []) hidden.add(t.toLowerCase());
  }
  return hidden;
}

type CampaignStore = Record<string, StoredCampaign>;

function readStore(): CampaignStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CampaignStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: CampaignStore): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    
  }
}


export function saveCampaign(c: StoredCampaign): void {
  const key = c.address.toLowerCase();
  const store = readStore();
  store[key] = { ...store[key], ...c, address: key, admin: c.admin.toLowerCase() };
  writeStore(store);
}

export function getStoredCampaign(address: string): StoredCampaign | undefined {
  return readStore()[address.toLowerCase()];
}


export function getStoredCampaigns(admin: string): StoredCampaign[] {
  const a = admin.toLowerCase();
  return Object.values(readStore())
    .filter((c) => c.admin === a)
    .sort((x, y) => y.createdAt - x.createdAt);
}

export function updateStoredCampaign(address: string, patch: Partial<StoredCampaign>): void {
  const key = address.toLowerCase();
  const store = readStore();
  if (!store[key]) return;
  store[key] = { ...store[key], ...patch, address: key };
  writeStore(store);
}
