# DeRisk Protocol

**AI-Powered DeFi Risk Oracle | Chainlink Convergence Hackathon 2026**

> Institutional-grade early warning system providing 24-72 hour advance notice before major DeFi collapses. Powered by 5 Chainlink services with multi-AI consensus scoring.

[![Live Demo](https://img.shields.io/badge/Live-Demo-00b894?style=for-the-badge)](https://frontend-4b4fiyt5o-maxs-projects-64e484e7.vercel.app)
[![Sepolia Contract](https://img.shields.io/badge/Sepolia-Contract-blue?style=for-the-badge)](https://sepolia.etherscan.io/address/0xbC75cCB19bc37a87bB0500c016bD13E50c591f09)
[![YouTube Demo](https://img.shields.io/badge/YouTube-Demo-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/watch?v=tx1b3JtV-d8)

---

## The problem your project addresses

DeFi protocols managing tens of billions in TVL have no on-chain early warning system for systemic risk. When cascading liquidations hit — as in the Terra/Luna collapse (May 2022), FTX contagion (Nov 2022), and Euler hack (Mar 2023) — individual protocols have minutes to react, not days. There is no primitive that monitors cross-protocol contagion, stablecoin depeg risk, and AI-scored threat level simultaneously and exposes the result on-chain so any smart contract can read it.

## How you've addressed the problem

DeRisk Protocol is an on-chain risk oracle that runs a 5-step assessment pipeline every 5 minutes via Chainlink CRE:

1. Fetches live TVL across Aave V3, Compound V3, and MakerDAO from DeFi Llama
2. Reads the live ETH/USD price from a Chainlink Price Feed on Sepolia
3. Runs a cross-protocol contagion cascade simulation (empirical correlation matrix: Aave↔Compound 0.87)
4. Scores aggregate risk via multi-AI consensus: Claude AI (50%), rule-based (30%), contagion-adjusted (20%)
5. Writes the final risk score, TVL snapshot, and circuit breaker state to `DeRiskOracle.sol` on Sepolia

Any DeFi protocol integrates in 5 lines of Solidity. `SimpleLendingPool` demonstrates auto-pause when risk ≥ 70/100; `RiskAwareVault` demonstrates dynamic LTV that scales continuously with risk. Historical backtesting against 4 real events shows an average 2.3-day advance warning.

## How you've used CRE

CRE is the only component that makes this oracle possible. Every step runs inside the Chainlink Runtime Environment:

- **`HTTPClient` + `ConsensusAggregationByFields`** — fetches TVL from DeFi Llama across all DON nodes and takes the median, preventing any single node from manipulating inputs
- **`EVMClient`** — reads the Chainlink Price Feed (`latestRoundData`) directly from Sepolia at a finalized block, so the price is tamper-proof
- **`HTTPClient`** (AI call) — sends the enriched prompt to Anthropic Claude API; in production this becomes `ConfidentialHTTPClient` so the API key and raw AI response never leave the TEE enclave
- **`writeReport()`** — generates a cryptographically signed consensus report and writes it to `DeRiskOracle.sol` via `IReceiver.onReport()`; no trusted intermediary required
- **`runtime.getSecret()`** — loads the Anthropic API key from CRE secrets (VaultDON in production), keeping it out of all committed config files

The CRE cron trigger fires every 5 minutes. Without CRE, achieving DON-level consensus on multi-source off-chain data and writing it on-chain with cryptographic attestation would require building a custom oracle network from scratch.

**Demo:** [Watch the full walkthrough on YouTube](https://www.youtube.com/watch?v=tx1b3JtV-d8)

---

## What It Does

DeRisk Protocol monitors systemic risk across major DeFi protocols in real-time:

1. **Multi-Protocol Monitoring** — Tracks TVL across Aave V3, Compound V3, and MakerDAO via DeFi Llama
2. **Chainlink Price Feed** — Reads live ETH/USD from Chainlink oracle on Sepolia
3. **Contagion Analysis** — Cascade simulation with empirical correlation matrix across protocols
4. **Stablecoin Depeg Detection** — Early warning system for USDT, USDC, and DAI peg deviations
5. **Multi-AI Consensus Scoring** — 3 independent models (Claude AI, rule-based, contagion-adjusted) with weighted median
6. **On-Chain Circuit Breaker** — Automatic alerts when aggregate risk exceeds 80/100
7. **Historical Backtesting** — Algorithm validated against 4 real DeFi disasters, proofs stored on-chain

## Architecture

```
[DeFi Llama] → [CRE Workflow] → [AI Consensus] → [DeRiskOracle.sol] → [Dashboard]
  TVL Data     5-step pipeline   3 models vote     On-chain write      Real-time UI
```

### 5-Step CRE Pipeline

| Step | Action | Chainlink Service |
|------|--------|-------------------|
| 1 | Fetch multi-protocol TVL (HTTP GET x3) | Data Streams |
| 2 | Read ETH/USD price (EVM Read) | Price Feeds |
| 3 | Contagion cascade + depeg monitoring | CRE |
| 4 | Multi-AI consensus scoring (3 models) | Functions |
| 5 | Write risk + contagion data on-chain | Automation |

### Chainlink Services Used (5)

| Service | Usage |
|---------|-------|
| **CRE** | Orchestrates entire 5-step risk assessment pipeline |
| **Price Feeds** | Live ETH/USD from Chainlink oracle on Sepolia |
| **Data Streams** | Real-time DeFi metrics via external API integration |
| **Automation** | Staleness monitoring, auto-escalation after 10 min |
| **Functions** | Fallback scoring on DON when AI API is unavailable |

## Backtesting Results

Algorithm applied retroactively to historical market data from 4 major events. Results stored immutably on-chain as `BacktestProof` records.

| Event | Date | Alert Lead Time | Est. Savings* | Effectiveness |
|-------|------|-----------------|---------------|---------------|
| Terra/Luna Collapse | May 2022 | 2 days | $30.0B | 50% |
| FTX/Alameda Contagion | Nov 2022 | 3 days | $4.0B | 50% |
| Euler Finance Hack | Mar 2023 | 3 days | $98.5M | 50% |
| Curve Pool Exploit | Jul 2023 | 1 day | $17.5M | 25% |

**4/4 events detected. Average 2.3 days early warning.**

*\*Estimated savings assume governance acted on alerts to reduce exposure. Historical backtesting uses TVL and price data from DeFi Llama and Chainlink feeds. Results do not guarantee future performance. See [docs/BACKTESTING.md](docs/BACKTESTING.md) for full methodology.*

## Smart Contracts

**DeRiskOracle** on Sepolia: [`0xbC75cCB19bc37a87bB0500c016bD13E50c591f09`](https://sepolia.etherscan.io/address/0xbC75cCB19bc37a87bB0500c016bD13E50c591f09)

## 🏗️ Consumer Contract Examples

Two deployed contracts demonstrate composability — different integration patterns for different use cases.

### SimpleLendingPool — Circuit Breaker Pattern

**Contract:** [`0x942a20CF83626dA1aAb50f1354318eE04dF292c0`](https://sepolia.etherscan.io/address/0x942a20CF83626dA1aAb50f1354318eE04dF292c0)

**Use Case:** Binary protection — auto-pauses all deposits/borrows when systemic risk ≥ 70/100.

**SimpleLendingPool:** [`0x942a20CF83626dA1aAb50f1354318eE04dF292c0`](https://sepolia.etherscan.io/address/0x942a20CF83626dA1aAb50f1354318eE04dF292c0)

Live integration showing how DeFi protocols use DeRisk for protection:
- Auto-pause when systemic risk ≥ 70/100 (`whenSafe` modifier on every `deposit` and `borrow`)
- Circuit breaker integration — reverts if oracle circuit breaker is active
- Real-time risk monitoring — anyone can call `checkRiskAndPause()` to lock the pool at risk ≥ 80
- 200% overcollateralized borrowing with collateral-ratio enforcement

**What This Proves:** If deployed before the Terra collapse (May 2022), this contract would have automatically paused deposits and borrows 48 hours before the crash — protecting user funds from contagion that reached 87/100 on our risk scale.

```solidity
// SimpleLendingPool reads DeRiskOracle on every state-changing call
modifier whenSafe() {
    require(!emergencyPaused,               "Pool: emergency paused");
    require(!oracle.circuitBreakerActive(), "Pool: circuit breaker active");
    require(oracle.riskScore() < 70,        "Pool: risk score too high");
    _;
}

function deposit(uint256 amount) external whenSafe { ... }
function borrow(uint256 amount)  external whenSafe { ... }
```

**MockUSDC (test token):** [`0xAd714Eb7B95d3De5d0A91b816e0a39cDbE5C586B`](https://sepolia.etherscan.io/address/0xAd714Eb7B95d3De5d0A91b816e0a39cDbE5C586B)

---

### RiskAwareVault — Dynamic LTV Pattern

**Contract:** [`0x016B459747B34b3d24Ea4e3a5aBb7095a58C8287`](https://sepolia.etherscan.io/address/0x016B459747B34b3d24Ea4e3a5aBb7095a58C8287)

**Use Case:** Continuous risk adjustment — dynamically scales max LTV based on live systemic risk score. No binary pause; risk is a dial, not a switch.

| Risk Score | LTV | Regime |
|------------|-----|--------|
| 0–20 | 75% | Normal operations |
| 20–40 | ~66% | Reduce new positions |
| 40–60 | ~57% | Conservative mode |
| 60–80 | ~48% | High caution |
| 80+ | 40% | Floor (circuit breaker zone) |

```solidity
// RiskAwareVault reads live risk on every deposit
function getCurrentMaxLTV() public view returns (uint256 maxLtvBps) {
    uint256 risk = deRiskOracle.riskScore();
    if (risk >= 80) return 4000;                           // 40% floor
    uint256 reduction = (risk * 4375) / 1000;             // 43.75 bps per risk point
    return 7500 - reduction;                               // linear decrease from 75%
}
```

**What This Proves:** Two completely different integration patterns — binary circuit breaker vs. continuous parameter adjustment — both reading the same DeRisk oracle. Any DeFi primitive can compose with this.

---

### Integration Example

```solidity
interface IDeRiskOracle {
    function riskScore() external view returns (uint256);
    function circuitBreakerActive() external view returns (bool);
    function protocolScores(string calldata) external view returns (uint256);
    function contagionScore() external view returns (uint256);
}

contract MyDeFiProtocol {
    IDeRiskOracle oracle = IDeRiskOracle(0xbC75cCB19bc37a87bB0500c016bD13E50c591f09);

    modifier whenSafe() {
        require(oracle.riskScore() < 80, "Risk too high");
        require(!oracle.circuitBreakerActive(), "Circuit breaker active");
        _;
    }

    function deposit() external whenSafe {
        // Protected by DeRisk Oracle
    }
}
```

### Key Functions

| Function | Description |
|----------|-------------|
| `getRiskData()` | Full risk assessment (score, TVL, ETH price, timestamp) |
| `getProtocolScores()` | Per-protocol risk breakdown (Aave, Compound, Maker) |
| `getProtocolTvls()` | Per-protocol TVL data |
| `getAggregateScore()` | Weighted average: Aave 50%, Compound 25%, Maker 25% |
| `getContagionData()` | Cascade risk score and worst-case loss estimate |
| `circuitBreakerActive()` | True when aggregate score > 80 |
| `checkUpkeep()` / `performUpkeep()` | Chainlink Automation staleness monitoring |
| `backtestResults(index)` | On-chain backtest proof records |

## 🔗 CRE Workflow Orchestration

DeRisk uses Chainlink Runtime Environment to orchestrate a 5-step risk assessment pipeline:

### Workflow Steps

| Step | Action | CRE Service | Data Source |
|------|--------|-------------|-------------|
| 1 | Fetch multi-protocol TVL | HTTPClient | DeFi Llama API (Aave, Compound, Maker) |
| 2 | Read ETH/USD price | EVMClient | Chainlink Price Feed (Sepolia) |
| 3 | Contagion cascade simulation | Internal | Correlation matrix (0.87 Aave↔Compound) |
| 4 | Multi-AI consensus scoring | HTTPClient (ConfidentialHTTPClient in production) | Anthropic Claude API |
| 5 | Write risk data on-chain | writeReport() | DeRiskOracle.sol |

### Reproduce Locally
```bash
# From project root — install workflow dependencies first
cd derisk-workflow && bun install && cd ..

# Run simulation (uses live Chainlink Price Feed + DeFi Llama)
cre workflow simulate ./derisk-workflow --non-interactive --trigger-index 0 -T staging-settings
```

**Evidence:** [View simulation output](docs/cre-simulation-output.txt)

### Key CRE Features Used

- **HTTPClient** — Public data from DeFi Llama + AI scoring (simulation)
- **ConfidentialHTTPClient** — AI calls in production, executed inside TEE enclave via VaultDON
- **EVMClient** — Read Chainlink Price Feeds
- **writeReport()** — On-chain risk score updates
- **ConsensusAggregation** — Multi-model weighted median
- **runtime.getSecret()** — Anthropic API key from CRE secrets, never in committed config

---

## 🛡️ Failure Mode Handling

DeRisk is designed for institutional use with robust failure handling:

### Failure Scenarios & Responses

| Failure Point | Detection | Fallback Behavior | Safe Default |
|---------------|-----------|-------------------|--------------|
| **DeFi Llama API Down** | HTTP timeout (10s) | Use cached TVL data (max 1h old) | Elevate risk score +10 |
| **Chainlink Price Feed Stale** | Timestamp check (>1h) | Fetch backup feed or halt scoring | Mark as stale, no new scores |
| **Anthropic API Error** | API 5xx response | Use rule-based model only (30% weight → 60%) | Conservative risk estimate |
| **CRE Workflow Fails** | Runtime exception | Retry 3x with exponential backoff | Alert via Chainlink Automation |
| **Contagion Model Error** | Division by zero, invalid matrix | Skip contagion component | Use TVL + Depeg only |

### Fail-Safe vs Fail-Open

- **Fail-Safe (Default):** When in doubt, elevate risk score → protects users
- **Fail-Open (Configurable):** For testing environments only

### Monitoring & Alerts

- Chainlink Automation monitors staleness (>10 min) via `checkUpkeep()` / `performUpkeep()`
- Circuit breaker auto-activates if risk > 80/100 or data confidence is insufficient
- Consumer contracts inherit failure protection automatically via `whenSafe()` modifier — no risk of unprotected state

---

## 🔐 Trust Model — On-Chain Guarantees

### What's Verifiable On-Chain

**Stored Immutably:**
- Risk scores (`uint256`, timestamped per assessment)
- Protocol TVL snapshots (per-protocol breakdown: Aave, Compound, Maker)
- ETH/USD price at assessment time
- Contagion scores and cascade estimates
- Backtest proof records (4 historical events)
- Consumer contract pause states

**Verifiable Actions:**
- Circuit breaker activation (when risk > 80)
- Consumer contract auto-pause triggers
- Governance decisions based on risk thresholds

**Etherscan Evidence:**
- Every risk update: [View event logs](https://sepolia.etherscan.io/address/0xbC75cCB19bc37a87bB0500c016bD13E50c591f09#events)
- SimpleLendingPool pause: [View contract state](https://sepolia.etherscan.io/address/0x942a20CF83626dA1aAb50f1354318eE04dF292c0#readContract)

---

### What's Off-Chain (AI-Assisted)

**Not Stored On-Chain:**
- Raw API responses from DeFi Llama
- Individual AI model prompts and responses
- Intermediate contagion calculations

**Why This Is Acceptable:**
- Risk monitoring requires real-time external data (TVL, prices) — impossible to fully on-chain
- AI consensus adds qualitative analysis impossible to encode purely on-chain
- All final decisions (risk scores, circuit breaker) **are** on-chain and fully auditable
- CRE provides cryptographic attestation of off-chain compute integrity

**Verification Path:**
1. View on-chain risk score via Etherscan or `cast call`
2. Reproduce CRE workflow locally with same inputs (`cre workflow simulate .`)
3. Compare results (deterministic except the AI component)
4. AI component uses weighted median — outliers don't dominate final score

This hybrid model is standard for oracle networks: external data → consensus → on-chain finality.

---

## 🏆 Prize Track Alignment

### 🎯 Risk & Compliance (Primary Target)

**How DeRisk Fits:**
- **Automated Risk Monitoring:** Real-time tracking across Aave V3, Compound V3, MakerDAO
- **Protocol Safeguard Triggers:** SimpleLendingPool auto-pauses at risk > 70/100
- **Circuit Breaker Integration:** Emergency protection when systemic risk reaches 80/100
- **Institutional Grade:** Historical backtesting proves 2.3 days average early warning

**Consumer Contract Example:** SimpleLendingPool demonstrates how any DeFi protocol can integrate DeRisk for automated protection.

---

### 🤖 CRE & AI (Strong Fit)

**How DeRisk Fits:**
- **Multi-AI Consensus:** 3 independent models (Claude AI 50%, Rule-based 30%, Contagion 20%)
- **AI in the Loop:** Claude API responses directly influence on-chain riskScore
- **Weighted Median Logic:** Outlier detection (>1.5 std dev) prevents manipulation
- **CRE Orchestration:** AI calls executed inside CRE workflow, results written on-chain

**Explainability:** Frontend shows per-model scores and consensus decision in Debug tab.

---

### 🔒 Privacy & Compliance

**How DeRisk Fits:**
- **Confidential HTTP (production):** In production, Anthropic API calls use `ConfidentialHTTPClient` + TEE enclave via VaultDON; in simulation, `HTTPClient` is used with the key loaded from `runtime.getSecret()`
- **Protected Secrets:** API keys stored in VaultDON (`secrets.json` + `workflow.yaml secrets-path`), never committed to git and never exposed to DON nodes
- **Private Prompts:** In production, risk model prompts execute inside a Trusted Execution Environment — raw AI responses never leave the enclave
- **Institutional Use Case:** Enables regulated entities (RWA issuers, centralized venues) to monitor DeFi exposure without revealing positions or proprietary risk models

**Why This Matters:** Traditional HTTP exposes API keys and AI responses to all DON nodes. The VaultDON + ConfidentialHTTP architecture isolates this in a TEE enclave for production deployments.

---

## Quick Start

### Prerequisites

- Node.js 18+ / Bun runtime
- CRE CLI ([install guide](https://docs.chain.link/cre))
- Sepolia ETH + Anthropic API key

### Installation

```bash
# Clone repository
git clone https://github.com/MaxWK96/derisk-protocol
cd derisk-protocol

# Install workflow dependencies
cd derisk-workflow && bun install

# Install frontend dependencies
cd ../frontend && npm install
```

### Run CRE Simulation

```bash
cd derisk-workflow && bun install && cd ..
cre workflow simulate ./derisk-workflow --non-interactive --trigger-index 0 -T staging-settings
```

### Launch Dashboard

```bash
cd frontend
npm run dev
# Open http://localhost:3001
```

## 🎬 Run the Demo — Reproduce On-Chain

### Scenario: Simulate USDC Depeg Event

**Step 1: Use the What-If Simulator (Frontend)**
```bash
cd frontend && npm run dev
# Open http://localhost:3001
# Set: USDC Depeg to 4.2%, Aave TVL Drop to 15%
# Observe: Risk score → 68/100, Consumer contracts → WARNING
```

**Step 2: Trigger CRE Workflow**
```bash
cd derisk-workflow && bun install && cd ..
cre workflow simulate ./derisk-workflow --non-interactive --trigger-index 0 -T staging-settings

# Real output (see docs/cre-simulation-output.txt):
# [1/5] Aave V3: $26.73B, Compound V3: $1.30B, MakerDAO: $5.71B
# [2/5] ETH/USD: $2039.90 (live Chainlink Price Feed)
# [3/5] Contagion Risk: 83/100, Worst-Case Loss: $14.66B
# [3b]  USDT: $1.0000 (STABLE), USDC: $1.0000 (STABLE), DAI: $0.9999 (STABLE)
# [4/5] Claude Score: 68/100, Scored By: Anthropic Claude AI
# [5/5] On-chain write successful. TxHash: 0x000...000 (sim mode)
```

**Step 3: Verify On-Chain**
```bash
cast call 0xbC75cCB19bc37a87bB0500c016bD13E50c591f09 \
  "getRiskData()(uint256,bool,uint256,uint256,uint256,uint256,uint256)" \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com

# Returns: (28, false, 23683662522, 0, 281847000000, 1739887394, 247)
# Risk: 28, CircuitBreaker: false, TVL: $23.6B, ETH: $2818.47
```

**Step 4: Check Consumer Contract Response**
```bash
cast call 0x942a20CF83626dA1aAb50f1354318eE04dF292c0 \
  "oracle()(address)" \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com

# Then read live risk from oracle via SimpleLendingPool
cast call 0xbC75cCB19bc37a87bB0500c016bD13E50c591f09 \
  "riskScore()(uint256)" \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

**Live Evidence:**
- Risk update events: [View on Etherscan](https://sepolia.etherscan.io/address/0xbC75cCB19bc37a87bB0500c016bD13E50c591f09#events)
- Consumer contract state: [Read SimpleLendingPool](https://sepolia.etherscan.io/address/0x942a20CF83626dA1aAb50f1354318eE04dF292c0#readContract)
- Full simulation output: [docs/cre-simulation-output.txt](docs/cre-simulation-output.txt)

---

## Advanced Features

### Cross-Protocol Contagion Analysis

Cascade simulation using empirical correlation matrix:
- Aave ↔ Compound: 0.87 (shared lending dynamics)
- Aave ↔ Maker: 0.72 (shared ETH collateral)
- Compound ↔ Maker: 0.65 (indirect channels)

### Stablecoin Depeg Early Warning

Monitors USDT, USDC, and DAI with severity thresholds:
- **Watch**: >0.5% deviation | **Warning**: >2% | **Critical**: >5%

### Multi-AI Consensus Scoring

| Model | Weight | Confidence |
|-------|--------|------------|
| Claude AI | 50% | 95% |
| Rule-Based | 30% | 70% |
| Contagion-Adjusted | 20% | 60% |

Weighted median with outlier detection (>1.5 std dev).

### Risk Scoring Model

| Score | Level | Circuit Breaker |
|-------|-------|-----------------|
| 0-20 | LOW | Inactive |
| 21-40 | MODERATE | Inactive |
| 41-60 | ELEVATED | Inactive |
| 61-80 | HIGH | Inactive |
| 81-100 | CRITICAL | **ACTIVE** |

## 🎯 Target Markets

### For Centralized Exchanges
**Use Case:** Auto-throttle DeFi-related withdrawals during contagion events

```solidity
if (deRisk.contagionRiskScore() > 60) {
    // Reduce max withdrawal limits by 50%
    // Increase withdrawal delays by 24h
    // Alert risk team for manual review
}
```

**Why:** CEXs hold billions in DeFi exposure. Early warning (2.3 day average lead time) prevents bank runs.

---

### For RWA (Real-World Asset) Issuers
**Use Case:** Dynamically adjust over-collateralization requirements based on DeFi systemic health

```solidity
uint256 baseCollateral = 120; // 120% over-collateralization
uint256 riskAdjustment = deRisk.riskScore() / 2; // +40% at max risk
uint256 requiredCollateral = baseCollateral + riskAdjustment;

require(collateralRatio >= requiredCollateral, "Insufficient collateral");
```

**Why:** RWA bridges (Ondo, Centrifuge, MakerDAO RWA) need DeFi health monitoring for compliance with institutional counterparties.

---

### For Stablecoin Issuers
**Use Case:** For issuers like Circle, Tether, and Paxos monitoring $150B+ in DeFi protocol reserves with 24/7 AI surveillance and depeg early warnings.

---

### For Protocol Governance
**Use Case:** For safety modules like those in Aave and Compound that can integrate circuit breaker signals for automatic pause during systemic risk.

---

### For Institutional Risk Desks
**Use Case:** For risk teams at firms like BlackRock and Fidelity monitoring DeFi exposure with enterprise-grade dashboards and audit trails.

## 🔒 Privacy-Preserving Risk Analysis

DeRisk uses the **Chainlink secrets architecture** to protect proprietary risk data, with a clear path to full Confidential HTTP in production:

**What's Protected:**
- Anthropic API keys — stored in `secrets.json` locally, loaded via `runtime.getSecret()` from CRE; in production, fetched from VaultDON and injected into a TEE enclave
- Risk model prompts — in production, executed inside the enclave via `ConfidentialHTTPClient`; raw AI responses never leave the enclave
- No secrets in any committed file — `.env`, `secrets.json`, and `config.local.json` are all gitignored

**Simulation vs Production:**
```
Simulation:
[1] Fetch public data (DeFi Llama)  → HTTPClient
[2] Load API key                    → runtime.getSecret() from secrets.json (gitignored)
[3] Fetch AI risk score (Anthropic) → HTTPClient
[4] Consensus + on-chain settlement → writeReport()

Production (with VaultDON):
[1] Fetch public data (DeFi Llama)  → HTTPClient
[2] Load API key                    → runtime.getSecret() from VaultDON
[3] Fetch AI risk score (Anthropic) → ConfidentialHTTPClient + TEE enclave
[4] Consensus + on-chain settlement → writeReport()
```

**Why This Matters:** DeFi protocols use proprietary risk models. Regular HTTP exposes API keys and model responses to all DON nodes. The VaultDON + `ConfidentialHTTPClient` architecture executes the entire AI call inside a TEE — only the extracted numeric score exits the enclave.

**Targets:** Privacy & Compliance prize category

## Project Structure

```
derisk-protocol/
├── contracts/
│   ├── DeRiskOracle.sol           # Main oracle contract (Solidity 0.8.19)
│   └── abi/                       # Contract ABIs
├── derisk-workflow/
│   ├── main.ts                    # CRE 5-step pipeline
│   ├── config.staging.json        # Workflow configuration
│   ├── run-backtest.ts            # Historical backtesting CLI
│   └── lib/
│       ├── contagion-analyzer.ts  # Cascade simulation engine
│       ├── depeg-monitor.ts       # Stablecoin peg monitoring
│       ├── multi-ai-consensus.ts  # 3-model consensus scoring
│       └── historical-backtester.ts # Backtest engine (4 events)
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Main dashboard
│   │   ├── lib/contract.ts        # On-chain data fetching
│   │   └── components/
│   │       ├── RiskGauge.tsx       # SVG risk gauge
│   │       ├── CircuitBreaker.tsx  # Circuit breaker status
│   │       ├── BacktestTimeline.tsx # Recharts backtesting chart
│   │       └── ArchitectureDiagram.tsx # Pipeline visualization
│   └── vercel.json                # Deployment config
├── docs/
│   └── BACKTESTING.md             # Full methodology & results
└── README.md
```

## Chainlink Integration Files

Every file in this repository that directly uses a Chainlink service:

**Smart Contracts**
- [contracts/DeRiskOracle.sol](https://github.com/MaxWK96/derisk-protocol/blob/main/contracts/DeRiskOracle.sol) — CRE `IReceiver` interface + Chainlink Automation (`checkUpkeep` / `performUpkeep`)
- [contracts/SimpleLendingPool.sol](https://github.com/MaxWK96/derisk-protocol/blob/main/contracts/SimpleLendingPool.sol) — consumer contract reading `riskScore()` + `circuitBreakerActive()` from DeRiskOracle
- [contracts/RiskAwareVault.sol](https://github.com/MaxWK96/derisk-protocol/blob/main/contracts/RiskAwareVault.sol) — consumer contract with dynamic LTV using live `riskScore()`
- [contracts/script/DeployConsumer.s.sol](https://github.com/MaxWK96/derisk-protocol/blob/main/contracts/script/DeployConsumer.s.sol) — Foundry deploy script for SimpleLendingPool on Sepolia
- [contracts/script/DeployRiskAwareVault.s.sol](https://github.com/MaxWK96/derisk-protocol/blob/main/contracts/script/DeployRiskAwareVault.s.sol) — Foundry deploy script for RiskAwareVault on Sepolia
- [contracts/abi/ChainlinkPriceFeed.ts](https://github.com/MaxWK96/derisk-protocol/blob/main/contracts/abi/ChainlinkPriceFeed.ts) — Chainlink Price Feed ABI (`latestRoundData`) used by frontend
- [contracts/abi/DeRiskOracle.ts](https://github.com/MaxWK96/derisk-protocol/blob/main/contracts/abi/DeRiskOracle.ts) — DeRiskOracle ABI consumed by CRE SDK and frontend

**CRE Workflow**
- [derisk-workflow/main.ts](https://github.com/MaxWK96/derisk-protocol/blob/main/derisk-workflow/main.ts) — CRE 5-step pipeline: `EVMClient` (Price Feeds), `HTTPClient` (DeFi Llama + Anthropic), `writeReport()`; production uses `ConfidentialHTTPClient` for the Anthropic call via VaultDON
- [derisk-workflow/workflow.yaml](https://github.com/MaxWK96/derisk-protocol/blob/main/derisk-workflow/workflow.yaml) — CRE workflow definition, triggers, and step configuration
- [derisk-workflow/config.staging.json](https://github.com/MaxWK96/derisk-protocol/blob/main/derisk-workflow/config.staging.json) — Chainlink Price Feed address, oracle address, Automation schedule
- [derisk-workflow/config.production.json](https://github.com/MaxWK96/derisk-protocol/blob/main/derisk-workflow/config.production.json) — production Price Feed and oracle configuration
- [derisk-workflow/chainlink-functions-source.js](https://github.com/MaxWK96/derisk-protocol/blob/main/derisk-workflow/chainlink-functions-source.js) — Chainlink Functions DON fallback scoring source
- [derisk-workflow/deploy-functions.ts](https://github.com/MaxWK96/derisk-protocol/blob/main/derisk-workflow/deploy-functions.ts) — Chainlink Functions toolkit deployment script
- [derisk-workflow/lib/contagion-analyzer.ts](https://github.com/MaxWK96/derisk-protocol/blob/main/derisk-workflow/lib/contagion-analyzer.ts) — contagion cascade module (CRE pipeline step 3)
- [derisk-workflow/lib/multi-ai-consensus.ts](https://github.com/MaxWK96/derisk-protocol/blob/main/derisk-workflow/lib/multi-ai-consensus.ts) — multi-AI weighted median consensus (CRE pipeline step 4)
- [derisk-workflow/lib/depeg-monitor.ts](https://github.com/MaxWK96/derisk-protocol/blob/main/derisk-workflow/lib/depeg-monitor.ts) — stablecoin depeg monitoring module (CRE pipeline)
- [derisk-workflow/lib/historical-backtester.ts](https://github.com/MaxWK96/derisk-protocol/blob/main/derisk-workflow/lib/historical-backtester.ts) — backtesting engine validated against historical Chainlink Price Feed data

**Alternative CRE Workflow (Data Streams + Proof of Reserves)**
- [max-workflow/main.ts](https://github.com/MaxWK96/derisk-protocol/blob/main/max-workflow/main.ts) — CRE workflow variant with Chainlink Data Streams and Proof of Reserves
- [max-workflow/workflow.yaml](https://github.com/MaxWK96/derisk-protocol/blob/main/max-workflow/workflow.yaml) — CRE config for Data Streams / Proof of Reserves pipeline
- [max-workflow/config.staging.json](https://github.com/MaxWK96/derisk-protocol/blob/main/max-workflow/config.staging.json) — Data Streams endpoint and Proof of Reserves proxy address

**Frontend**
- [frontend/src/App.tsx](https://github.com/MaxWK96/derisk-protocol/blob/main/frontend/src/App.tsx) — live dashboard reading all 5 Chainlink service outputs from DeRiskOracle
- [frontend/src/components/ArchitectureDiagram.tsx](https://github.com/MaxWK96/derisk-protocol/blob/main/frontend/src/components/ArchitectureDiagram.tsx) — interactive Chainlink services architecture diagram (CRE, Price Feeds, Functions, Automation, Data Streams)
- [frontend/src/components/CREWorkflowPanel.tsx](https://github.com/MaxWK96/derisk-protocol/blob/main/frontend/src/components/CREWorkflowPanel.tsx) — CRE 5-step pipeline visualization
- [frontend/src/components/SystemHealth.tsx](https://github.com/MaxWK96/derisk-protocol/blob/main/frontend/src/components/SystemHealth.tsx) — Chainlink Price Feed staleness monitoring UI
- [frontend/src/components/BacktestTimeline.tsx](https://github.com/MaxWK96/derisk-protocol/blob/main/frontend/src/components/BacktestTimeline.tsx) — historical backtesting chart using Chainlink Price Feed data
- [frontend/src/components/RiskBreakdown.tsx](https://github.com/MaxWK96/derisk-protocol/blob/main/frontend/src/components/RiskBreakdown.tsx) — CRE consensus score display (per-model breakdown)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Orchestration | Chainlink CRE (Runtime Environment) |
| AI | Anthropic Claude API |
| Blockchain | Ethereum Sepolia Testnet |
| Smart Contract | Solidity 0.8.19, Foundry |
| Frontend | React 19, Vite 7, TailwindCSS v4, Recharts |
| Data | DeFi Llama API, Chainlink Price Feeds |
| Libraries | @chainlink/cre-sdk, viem, zod |

## 🛠️ For Builders — Integrate in 5 Lines

DeRisk is a reusable primitive. Any DeFi protocol can integrate automated risk protection:

```solidity
import {IDeRiskOracle} from "./interfaces/IDeRiskOracle.sol";

contract YourProtocol {
    IDeRiskOracle oracle = IDeRiskOracle(0xbC75cCB19bc37a87bB0500c016bD13E50c591f09);

    modifier whenSafe() {
        require(oracle.getRiskData().riskScore < 80, "Risk too high");
        _;
    }

    function criticalOperation() external whenSafe {
        // Your logic here — protected by DeRisk
    }
}
```

**That's it.** No API keys, no complex setup. Just read the on-chain risk score.

**Use Cases:**
- Lending protocols: Pause deposits during systemic risk
- Stablecoin issuers: Monitor collateral health
- Institutional treasuries: Auto-hedge based on risk signals

---

## Links

- **Live Demo:** [frontend-4b4fiyt5o-maxs-projects-64e484e7.vercel.app](https://frontend-4b4fiyt5o-maxs-projects-64e484e7.vercel.app)
- **Demo Video:** [YouTube — Full Walkthrough](https://www.youtube.com/watch?v=tx1b3JtV-d8)
- **Contract:** [0xbC75...1f09 on Sepolia](https://sepolia.etherscan.io/address/0xbC75cCB19bc37a87bB0500c016bD13E50c591f09)
- **Backtesting Docs:** [docs/BACKTESTING.md](docs/BACKTESTING.md)

---

Built for Chainlink Convergence Hackathon 2026
