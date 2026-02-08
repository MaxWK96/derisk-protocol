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

## Smart Contract

**DeRiskOracle** on Sepolia: [`0xbC75cCB19bc37a87bB0500c016bD13E50c591f09`](https://sepolia.etherscan.io/address/0xbC75cCB19bc37a87bB0500c016bD13E50c591f09)

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

## Links

- **Live Demo:** [derisk-protocol.vercel.app](https://derisk-protocol.vercel.app)
- **Contract:** [0xbC75...1f09 on Sepolia](https://sepolia.etherscan.io/address/0xbC75cCB19bc37a87bB0500c016bD13E50c591f09)
- **Backtesting Docs:** [docs/BACKTESTING.md](docs/BACKTESTING.md)

---

Built for Chainlink Convergence Hackathon 2026
