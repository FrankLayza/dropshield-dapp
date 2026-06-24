import { Routes, Route, useLocation } from "react-router-dom";
import { Providers } from "@/providers";
import { AppNav } from "@/components/AppNav";
import { Dashboard } from "@/pages/Dashboard";
import { CampaignWizard } from "@/pages/CampaignWizard";
import { CampaignDetail } from "@/pages/CampaignDetail";
import { Claim } from "@/pages/Claim";

/* *
 * The whole web3 surface (wagmi + RainbowKit + MetaMask/WalletConnect + the
 * Zama FHE SDK) lives behind this module, which App.tsx loads with React.lazy.
 * Because the marketing landing renders OUTSIDE this boundary, visitors to `/`
 * never download or initialize any wallet/FHE code — the heavy chunks load only
 * when the user enters `/admin*` or `/claim*`. This is the fix for the mobile
 * INP/RES regression (see plans/reflective-purring-cray.md). */
export default function AppSection() {
  const { pathname } = useLocation();

  return (
    <Providers>
      <AppNav pathname={pathname} />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-3 sm:px-6">
        <Routes>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/new" element={<CampaignWizard />} />
          <Route path="/admin/c/:address" element={<CampaignDetail />} />
          <Route path="/claim" element={<Claim />} />
          <Route path="/claim/:address" element={<Claim />} />
        </Routes>
      </main>
    </Providers>
  );
}
