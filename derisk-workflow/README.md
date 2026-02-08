# DeRisk Protocol - CRE Workflow

AI-Powered Multi-Protocol DeFi Risk Oracle workflow for Chainlink CRE.

## Pipeline

```
[Cron: Every 5 min]
       |
[1/5]  Fetch DeFi Llama ───── Aave V3 + Compound V3 + MakerDAO TVLs
       |
[2/5]  Read Chainlink ─────── ETH/USD Price Feed (Sepolia)
       |
[3/5]  Cross-Protocol Analysis
       ├── Contagion Analysis ── Cascade simulation + correlation matrix
       └── Depeg Monitoring ─── USDT / USDC / DAI peg deviation
       |
[4/5]  Multi-AI Consensus ──── Claude AI + Rule-Based + Contagion-Adjusted
       |
[5/5]  Write On-Chain ──────── Risk score + Contagion score to DeRiskOracle
```

## Modules

| Module | File | Description |
|--------|------|-------------|
| Contagion Analyzer | `lib/contagion-analyzer.ts` | Cross-protocol cascade simulation |
| Depeg Monitor | `lib/depeg-monitor.ts` | Stablecoin peg deviation tracking |
| Multi-AI Consensus | `lib/multi-ai-consensus.ts` | 3-model weighted median scoring |
| Historical Backtester | `lib/historical-backtester.ts` | Backtest against real DeFi events |

## Run Simulation

```bash
cd Max-Project
../cre.exe workflow simulate ./derisk-workflow --non-interactive --trigger-index 0
```

## Run Backtests

```bash
cd derisk-workflow
npx tsx run-backtest.ts all          # All 4 events
npx tsx run-backtest.ts terra-luna    # Single event
```

## Configuration

`config.staging.json`:
- `schedule` - Cron schedule (default: every 5 minutes)
- `anthropicApiKey` - Anthropic API key for Claude
- `defiLlamaUrl` - Base URL for DeFi Llama (used as reference)
- `evms[0].oracleAddress` - Deployed DeRiskOracle contract
- `evms[0].priceFeedAddress` - Chainlink ETH/USD feed on Sepolia
- `evms[0].chainSelectorName` - CRE chain identifier
- `evms[0].gasLimit` - Gas limit for on-chain write

## Contract Address

Sepolia: `0xbC75cCB19bc37a87bB0500c016bD13E50c591f09`

## Fallback Scoring

If the Anthropic API is unavailable, the workflow uses rule-based scoring matching `chainlink-functions-source.js`:

- Per-protocol TVL thresholds determine base risk
- ETH price adjustments applied uniformly
- Weighted aggregate: Aave 50%, Compound 25%, Maker 25%

Upkeepid:110227368496147713332896183033633990077543695951669016161246053892785695736264
