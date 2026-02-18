# DeRisk Protocol

**AI-Powered DeFi Risk Oracle | Chainlink Convergence Hackathon 2026**

> Institutional-grade early warning system providing 24-72 hour advance notice before major DeFi collapses. Powered by 5 Chainlink services with multi-AI consensus scoring.

[![Live Demo](https://img.shields.io/badge/Live-Demo-00b894?style=for-the-badge)](https://derisk-protocol.vercel.app)
[![Sepolia Contract](https://img.shields.io/badge/Sepolia-Contract-blue?style=for-the-badge)](https://sepolia.etherscan.io/address/0xbC75cCB19bc37a87bB0500c016bD13E50c591f09)

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

## 🏗️ Consumer Contract Example

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
| 4 | Multi-AI consensus scoring | ConfidentialHTTPClient | Anthropic Claude API (protected via TEE) |
| 5 | Write risk data on-chain | writeReport() | DeRiskOracle.sol |

### Reproduce Locally
```bash
cd derisk-workflow
cre workflow simulate . --trigger-index 0
```

**Evidence:** [View simulation log](docs/cre-workflow-log.txt)

### Key CRE Features Used

- **HTTPClient** — Public data from DeFi Llama
- **ConfidentialHTTPClient** — Protected AI API calls in TEE
- **EVMClient** — Read Chainlink Price Feeds
- **writeReport()** — On-chain risk score updates
- **ConsensusAggregation** — Multi-model weighted median

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
- **Confidential HTTP:** All Anthropic API calls use ConfidentialHTTPClient + TEE
- **Protected Secrets:** API keys stored in VaultDON, never exposed to DON nodes
- **Private Prompts:** Risk model prompts executed in Trusted Execution Environment
- **Institutional Use Case:** Enables regulated entities (RWA issuers, centralized venues) to monitor DeFi exposure without revealing positions

**Why This Matters:** Traditional HTTP exposes proprietary risk models. Confidential HTTP isolates sensitive data in a TEE enclave.

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
cd derisk-workflow
cre workflow simulate . --non-interactive --trigger-index 0
```

### Launch Dashboard

```bash
cd frontend
npm run dev
# Open http://localhost:3001
```

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

## Target Markets

- **For stablecoin issuers** like Circle, Tether, and Paxos monitoring $150B+ in DeFi reserves
- **For protocol governance** like safety modules in Aave and Compound integrating auto-pause
- **For institutional risk desks** at firms like BlackRock and Fidelity monitoring DeFi exposure

- ## 🔒 Privacy-Preserving Risk Analysis (NEW - Feb 16, 2026)

DeRisk now uses **Chainlink Confidential HTTP** to protect proprietary risk data:

**What's Protected:**
- Anthropic API keys (stored in VaultDON, never exposed to DON nodes)
- Risk model prompts (executed in TEE enclave)
- AI responses (processed confidentially before consensus)

**Why This Matters:**
DeFi protocols use proprietary risk models from credit agencies, institutional data providers, and internal metrics. Regular HTTP exposes API keys and responses to all DON nodes. Confidential HTTP isolates this in a Trusted Execution Environment (TEE).

```
[1] Fetch public data (DeFi Llama) → HTTPClient
[2] Fetch proprietary risk scores (Anthropic) → ConfidentialHTTPClient + TEE
[3] Consensus on final risk score → on-chain settlement
```

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

- **Live Demo:** [derisk-protocol.vercel.app](https://derisk-protocol.vercel.app)
- **Contract:** [0xbC75...1f09 on Sepolia](https://sepolia.etherscan.io/address/0xbC75cCB19bc37a87bB0500c016bD13E50c591f09)
- **Backtesting Docs:** [docs/BACKTESTING.md](docs/BACKTESTING.md)

---

Built for Chainlink Convergence Hackathon 2026
