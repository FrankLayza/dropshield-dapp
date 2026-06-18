# DropShield — Bounty Differentiation Suggestions
> Pass this file to your IDE AI. It describes a vertical pivot and concrete UI/copy/code changes
> to make DropShield stand out from the previous confidential airdrop winner.
> No core architecture changes — this is positioning, copy, and additive UX features.

---

## The Pivot: Generic Airdrop → DAO Contributor Payroll

DropShield already works end-to-end. The goal now is to reframe it so judges see
a **production-ready payroll tool** rather than another airdrop demo.

The privacy story for payroll is instantly obvious to anyone: contributors don't want
colleagues knowing their salary, competitors shouldn't see your burn rate, bots
shouldn't front-run your treasury transfers. FHE solves all three — no explanation needed.

**Nothing in the core SDK flow changes.** Same create → fund → authorize → claim pipeline.
Only copy, labelling, and two additive UX features change.

---

## 1. Landing Page — Rewrite Copy

### Headline (current: generic)
Replace whatever the current hero headline is with:

```
Private payroll for DAOs.
Every contributor gets paid.
Nobody sees what anyone else earns.
```

### Subheading
```
DropShield uses on-chain FHE (Fully Homomorphic Encryption) to distribute
confidential ERC-7984 tokens to your team. Amounts are encrypted on-chain —
recipients verify and claim only their own payment. Not even validators can read
the numbers.
```

### Feature Cards — replace or augment with these three
```
1. "Salary privacy, on-chain"
   Contributors can't see each other's pay. Competitors can't see your burn rate.
   Every amount is an FHE ciphertext on Sepolia.

2. "Verify before you claim"
   Recipients cryptographically decrypt their own allocation before signing the
   claim transaction. No trust required — the math is the proof.

3. "Zero recipient list on-chain"
   Only contributors who choose to claim reveal themselves. Your full payroll
   roster never touches the blockchain.
```

### CTA Buttons
```
Primary: "Run a Payroll Campaign"  → /admin
Secondary: "Claim Your Payment"    → /claim
```

---

## 2. Admin Wizard — UI Changes

### Step 0: Add a Campaign Type Selector (new first step or inline on Step 1)

Add a radio/pill selector before (or at the top of) the recipient entry step.
This is display-only — it does not change any contract call. It sets `campaignType`
in local React state and affects labels/copy throughout the wizard.

```tsx
// src/components/CampaignTypeSelector.tsx
// Three options rendered as selectable pill cards:

type CampaignType = 'payroll' | 'investor' | 'community'

const options = [
  {
    id: 'payroll',
    label: 'Contributor Payroll',
    description: 'Pay DAO contributors privately. Salaries stay between you and each recipient.',
    icon: '💼',
  },
  {
    id: 'investor',
    label: 'Investor Distribution',
    description: 'Distribute to cap table participants without exposing allocation sizes.',
    icon: '📊',
  },
  {
    id: 'community',
    label: 'Community Rewards',
    description: 'Airdrop to community members. Amounts remain confidential on-chain.',
    icon: '🎁',
  },
]
```

Store the selection in a React context or lifted state so child steps can read it
for label copy (e.g. "recipients" vs "contributors" vs "investors").

---

### Step 1: Recipient Entry — CSV Schema Change

Change the CSV template the admin downloads/sees from:
```
address,amount
```
to:
```
address,amount,label
```

- `label` is a free-text display name (e.g. `Engineering Lead`, `Designer`, `vitalik.eth`).
- It is **never sent on-chain** — used only in the Admin UI preview table and the
  exported `payload.json` so recipients see a human-readable identifier.
- Validation: `label` is optional; empty is fine.

Update the CSV parser (`src/lib/csv.ts` or wherever parsing lives) to handle the
third column gracefully — strip it before building the on-chain authorization objects.

Update the preview table to show a `Label` column between `Address` and `Amount`.

**Demo CSV to include in the README and use in the video:**
```csv
address,amount,label
0xRecipient1,3200,Engineering Lead
0xRecipient2,2800,Smart Contract Dev
0xRecipient3,1500,Designer
0xRecipient4,1200,Community Manager
0xRecipient5,900,Part-time Contributor
```
(Replace 0xRecipient* with real Sepolia test wallet addresses.)

---

### Step 4: Payload Export — Replace JSON Download with Encrypted Claim Links

Currently: admin downloads a `payload.json` and manually distributes it.

**New behaviour:** for each recipient, generate a shareable claim URL where the
payload is base64url-encoded in the URL **fragment** (the `#` part — never sent
to any server).

```
https://dropshield.vercel.app/claim#<base64url(JSON.stringify(recipientPayload))>
```

Implementation in `src/lib/claimLink.ts`:

```ts
import { base64url } from 'ox' // already in your dep tree via the SDK

export function encodeClaimLink(baseUrl: string, payload: RecipientPayload): string {
  const encoded = base64url.encode(JSON.stringify(payload))
  return `${baseUrl}/claim#${encoded}`
}

export function decodeClaimLink(): RecipientPayload | null {
  const hash = window.location.hash.slice(1)
  if (!hash) return null
  try {
    return JSON.parse(base64url.decode(hash))
  } catch {
    return null
  }
}
```

On `/claim`, call `decodeClaimLink()` on mount (before any user interaction) and
pre-populate the claim state if a payload is found in the fragment. This replaces
the "paste your payload JSON" input entirely for link-based flows — the JSON import
input can remain as a fallback.

In the Admin wizard's final step, show a table:

| Label | Address | Claim Link |
|---|---|---|
| Engineering Lead | 0xABC...123 | [Copy Link] |
| Designer | 0xDEF...456 | [Copy Link] |

Each row has a **"Copy Link"** button (copies the full URL to clipboard) and an
optional **"Copy All as CSV"** button that exports `label, address, claimLink` for
bulk email/Notion paste.

This is entirely frontend — no backend, no server, no new dependencies beyond
what `ox` already provides.

---

## 3. Claim Page — "Verify Before You Claim" as the Hero Moment

Reorder and relabel the claim flow to make the decrypt/verify step feel special,
not like a loading state.

### New claim page flow:

**Stage 1 — Connect**
Standard wallet connect. No change.

**Stage 2 — Your Payment**
After connecting, if a payload is found (from link fragment or manual import):
- Show a card with the contributor's `label` (from payload) and campaign name.
- Show the encrypted amount as `●●●● cmUSD` (masked).
- Show a prominent button: **"Reveal My Amount"**
- Below the button, small copy: *"Signing this message lets you — and only you —
  decrypt your allocation. Nothing is sent on-chain yet."*

**Stage 3 — Verified ✓**
After `userDecrypt` resolves:
- Animate the masked `●●●● cmUSD` → real number (e.g. `3,200 cmUSD`).
- Show a green "Verified on-chain" badge.
- Show: *"This amount is cryptographically proven. It matches the encrypted value
  locked in the smart contract."*
- Show the **"Claim Payment"** button now.

**Stage 4 — Claimed**
After claim tx confirms:
- Success screen with Etherscan link.
- Show updated confidential balance widget.
- Copy: *"Your payment has been transferred. Only you can see the amount."*

The key UX principle: **Claim is disabled until Verify completes.** This forces
users through the verify step and makes it the centerpiece of the demo, not an
afterthought.

---

## 4. Admin Dashboard — Claim Progress Widget

Add a simple stats widget to the campaign detail page (after creation). This shows
**count-based** stats only — no amounts, so privacy is preserved.

```tsx
// src/components/CampaignProgress.tsx

// Props derived from your existing SDK hooks:
// - totalRecipients: number  (from the payload you exported — store in localStorage keyed by campaignId)
// - claimCount: number       (read from on-chain events: count of Claim events for this campaign)

export function CampaignProgress({ totalRecipients, claimCount }: Props) {
  const pct = Math.round((claimCount / totalRecipients) * 100)
  return (
    <div className="...">
      <p>{claimCount} of {totalRecipients} contributors claimed</p>
      <div className="progress-bar">
        <div style={{ width: `${pct}%` }} className="bg-gold" />
      </div>
      <p>{totalRecipients - claimCount} payments unclaimed</p>
    </div>
  )
}
```

To get `claimCount`: query `Claim` events from the campaign contract address using
viem's `getLogs`. You already have the campaign address after creation.

Store `totalRecipients` in `localStorage` keyed by `campaignId` when the admin
exports payloads — it's off-chain data the admin entered, so localStorage is fine.

This widget makes the Admin page feel like a real treasury dashboard, not a wizard
that disappears after submission.

---

## 5. Demo Video Script (3 minutes)

Structure the video around this narrative. Record by Jul 3 to avoid RPC flakiness.

```
[0:00–0:20] Hook
"Every month, DAOs pay contributors on-chain. Every salary is public.
 Every amount. Every address. Anyone can see who gets paid what.
 DropShield fixes that."

[0:20–0:50] Problem (show a real Etherscan tx)
Show a real public ERC-20 transfer on Etherscan. Point out the amount
is visible. "This is your contributor's salary. Your whole team can see it.
Competitors can see it. Bots can see it."

[0:50–1:40] Admin flow (screen record)
- Open DropShield, click "Run a Payroll Campaign"
- Select "Contributor Payroll"
- Upload the demo CSV (with real labels: Engineering Lead, Designer, etc.)
- Show the preview table with masked amounts
- Walk through Create → Fund → Authorize
- Show the generated claim links table
- "I just set up a private payroll for 5 contributors in under 3 minutes."

[1:40–2:20] Recipient flow (switch wallet, screen record)
- Open the claim link as the contributor
- Show the masked ●●●● cmUSD card
- Click "Reveal My Amount" → sign the EIP-712 message
- Watch the number animate in: 3,200 cmUSD
- Click "Claim Payment" → tx confirms
- Show Etherscan: tx visible, amount NOT visible
- "The contributor verified their exact salary and claimed it.
   Nobody else saw the number."

[2:20–2:50] Real-world viability
"DropShield works on Sepolia today using Zama's FHE protocol and the
 TokenOps SDK. The airdrop contracts are OpenZeppelin-audited.
 Any DAO could use this for payroll, investor distributions, or
 community grants — today."

[2:50–3:00] Close
Show the landing page. Say the URL. "DropShield — private payroll for DAOs."
```

---

## 6. README Updates

Add a section near the top:

```markdown
## Real-World Use Case: DAO Contributor Payroll

DropShield is built for teams that need to pay contributors on-chain
without exposing salary information publicly.

**The problem:** Standard ERC-20 transfers are fully public. Every amount,
every address, visible to anyone on Etherscan.

**The solution:** DropShield uses Zama's FHE protocol to keep every payment
amount encrypted on-chain. Recipients verify and claim only their own payment.
Not even validators can read the numbers.

### Supported campaign types
- **Contributor Payroll** — monthly/quarterly DAO payroll
- **Investor Distribution** — cap table token distributions  
- **Community Rewards** — confidential community airdrops
```

---

## 7. X Thread Draft

```
1/6
DAOs pay contributors on-chain every month.
Every salary is public on Etherscan.
We built something about that.

Introducing DropShield — private payroll for DAOs, powered by @zama_fhe FHE.
🧵

2/6
The problem:
Standard ERC-20 transfers expose every amount.
Your whole team sees what everyone earns.
Competitors see your burn rate.
Bots front-run your treasury.

This is a solved problem in Web2. Web3 deserves the same.

3/6
The solution: Fully Homomorphic Encryption.

DropShield encrypts every payment amount on-chain using @zama_fhe's FHE protocol.
The smart contract transfers the right amount — without ever decrypting it.

Not even validators see the numbers.

4/6
How it works:
→ Admin uploads contributor CSV with amounts
→ Amounts are encrypted in-browser, tied to each recipient
→ Encrypted authorizations are delivered via private claim links
→ Recipients verify (decrypt) their own amount, then claim
→ On-chain: only that a claim happened. Not how much.

5/6
Built on:
- @zama_fhe Protocol (FHE on Sepolia)
- TokenOps SDK (audited ConfidentialAirdrop contracts)
- ERC-7984 confidential tokens
- Zero custom Solidity — the contracts are already deployed

Live demo: [your Vercel URL]
GitHub: [your repo]

6/6
This is what confidential DeFi looks like in practice.

Try it on Sepolia → [URL]
Built for the @zama_fhe Developer Program Mainnet Season 3
#ZamaDeveloperProgram
```

---

## Priority Order (you have ~3 weeks left)

| Priority | Task | Effort | Judging Impact |
|---|---|---|---|
| 1 | Encrypted claim links (§2 Step 4) | 1–2 days | Very High — solves a real UX gap |
| 2 | "Verify before Claim" hero UX (§3) | 1 day | Very High — makes the unique feature visible |
| 3 | Campaign type selector + label column (§2) | half day | High — reframes as production tool |
| 4 | Landing page copy rewrite (§1) | half day | High — first thing judges see |
| 5 | Campaign progress widget (§4) | 1 day | Medium — makes admin feel real |
| 6 | Demo video (§5) | 1 day | Required — don't skip |
| 7 | X thread (§6) | 1 hour | Required — don't skip |

Do not spend more time on the Spline 3D hero. The above will win the bounty;
a 3D animation will not.
