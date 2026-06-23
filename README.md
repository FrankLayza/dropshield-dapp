# Enveil — Confidential Payroll & Token Distribution

Enveil is a B2B private token distribution and payroll dApp built under the **Zama Developer Program** using the **TokenOps SDK** on the Zama Protocol. It allows DAOs, founders, and finance operators to disperse tokens to contributors, investors, and community members while keeping individual reward amounts and recipient rosters entirely private on-chain.

---

## Key Features

1. **Confidential Vesting (Differentiator)**
   - Distribute tokens over cliffs and scheduled durations.
   - Implemented as discrete vesting tranches (dated on-chain campaigns).
   - Recipients claim mature slices privately via an intuitive timeline display.
2. **Confidential Payroll & Community Airdrops**
   - Disperse salaries (e.g. `cmUSD`) privately to contributors.
   - Send community rewards without exposing user allocations or producing a public leaderboard.
3. **Recipient-Only Access**
   - Allocations are encrypted in-browser before deployment.
   - On-chain balance values are private ERC-7984 ciphertexts.
   - Only the intended recipient can authorize decryption locally using their wallet signature via the Zama relayer.
4. **Off-Chain Recipient Roster**
   - The list of eligible claimants never touches the blockchain.
   - Distribute claim payload JSON or generated private links directly to recipients.

---

## Contract Addresses (Sepolia Testnet)

- **TokenOps Airdrop Factory**: `0xbE6A3B78B36684fFee48De77d47Bc3393F5Acd4c`
- **ERC-7984 Confidential Mock USD (cMockToken)**: `0x87c5287752e871d46932FF8eE2C21158804bba68`
  *Note: cMockToken includes a rate-limited public `faucet()` function yielding 1,000 cmUSD per drip (1-hour cooldown) to easily fund test campaigns.*

---

## Tech Stack

- **Core**: React + TypeScript + Vite
- **Styling**: Modern Vanilla CSS with HSL tailored variables, dark/light zones (Violet and Gold/Peach), and GSAP animations.
- **Web3 Integration**:
  - **Wagmi v2.x** (compatible with `@tokenops/sdk` peer requirements).
  - **RainbowKit v2.x** for smooth multi-wallet connection modal.
  - **Zama React SDK** + **ViemSigner** (from `@zama-fhe/sdk/viem`) for EIP-712 local self-decryption signatures.
  - **TanStack Query** for loading/error state caching.
- **Smart Contract Scaffold**: Hardhat project inside `mock-token/` (used to compile and deploy `cMockToken.sol`).

---

## Getting Started

### Prerequisites

- **Node.js**: Node 22+ (required by Zama SDK)
- **PNPM**: Package manager

### Frontend Installation & Setup

1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Copy the `.env.example` file and configure your Sepolia parameters:
   ```bash
   cp .env.example .env
   ```
   Provide:
   - `VITE_RPC_URL`: Sepolia RPC endpoint (Alchemy / dRPC recommended).
   - `VITE_MOCK_TOKEN_ADDRESS`: The deployed `cMockToken` contract address (`0x87c5287752e871d46932FF8eE2C21158804bba68`).
   - `VITE_FACTORY_FROM_BLOCK`: Earliest scanning block (default is block `11050000` to speed up log indexing).
   - `VITE_WALLETCONNECT_PROJECT_ID`: Free key from walletconnect.com.
3. Launch the development server:
   ```bash
   pnpm dev
   ```

### Running the Demo Token Faucet

To test the end-to-end claim flow, you'll need `cmUSD` mock tokens. You can request them using one of the following methods:
1. **Via CLI script (recommended)**:
   Navigate to the `mock-token` directory, configure your wallet private key in `mock-token/.env`, and run the faucet task:
   ```bash
   cd mock-token
   pnpm faucet:sepolia
   ```
2. **Via Sepolia Etherscan**:
   Visit the contract's Write Contract tab on Etherscan and trigger the `faucet()` function:
   [cMockToken Write Contract](https://sepolia.etherscan.io/address/0x87c5287752e871d46932FF8eE2C21158804bba68#writeContract)

---

## Core Architecture & Simulation of Vesting

TokenOps smart contracts naturally support single, cliff-based releases. Enveil simulates multi-tranche vesting schedules by deploying **$N$ distinct airdrop campaigns** (one per tranche) in a single unified flow. 
- The issuer sets up the schedule (e.g. Cliff: 30 days, Unlocks: 3, Interval: 30 days).
- The wizard deploys $N$ separate on-chain campaigns, each programmed with a different `startTimestamp`.
- The final payload stores claim metadata for all $N$ contracts, which the claim page processes as an interactive vesting timeline.
- The recipient reveals and claims each mature slice sequentially in a single private dashboard.
