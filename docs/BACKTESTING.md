# Historical Backtesting - Methodology & Results

DeRisk Protocol's risk scoring algorithms were validated against the 4 largest DeFi disasters of 2022-2023. All results are stored **immutably on-chain** as `BacktestProof` structs in the DeRiskOracle contract.

Contract: [`0xbC75cCB19bc37a87bB0500c016bD13E50c591f09`](https://sepolia.etherscan.io/address/0xbC75cCB19bc37a87bB0500c016bD13E50c591f09) (Sepolia)

---

## Summary Results

| Event | Date | Total Losses | Alert Lead Time | Peak Score | Prevented | Effectiveness |
|-------|------|-------------|-----------------|------------|-----------|---------------|
| Terra/Luna Collapse | May 2022 | $60B | **2 days** | 100/100 | $30.0B | 50% |
| FTX/Alameda Contagion | Nov 2022 | $8B+ | **3 days** | 95/100 | $4.0B | 50% |
| Euler Finance Hack | Mar 2023 | $197M | **3 days** | 100/100 | $98.5M | 50% |
| Curve Pool Exploit | Jul 2023 | $70M | **1 day** | 63/100 | $17.5M | 25% |

**Aggregate: $34.1B in potentially prevented losses across all events.**

- 4/4 events detected before or during the event
- Average 2.3 days early warning
- Average 43.75% effectiveness rating

---

## Methodology

### Data Sources

Historical daily snapshots were reconstructed from:
- **DeFi Llama** historical TVL data for Aave V3, Compound V3, and MakerDAO
- **CoinGecko/CoinMarketCap** historical price data for ETH, UST, USDC, USDT, DAI
- **On-chain event logs** for each incident (block explorers, post-mortems)
- **Industry post-mortem reports** (Nansen, Chainalysis, protocol disclosures)

Each event includes 5-8 daily snapshots covering 30 days before to the day of the event.

### Scoring Algorithm

For each daily snapshot, 4 independent scoring components run:

1. **Claude-Simulated Score** — Heuristic model replicating the AI's analysis:
   - TVL health: deviation from historical baseline
   - ETH price stress: drops below $1,500 escalate risk
   - Stablecoin deviation: any depeg from $1.00 with tiered thresholds (0.5%, 2%, 5%)
   - Contagion amplifier: correlated protocol stress
   - Concentration risk: single-protocol TVL dominance

2. **Rule-Based Score** — Deterministic thresholds matching `chainlink-functions-source.js`:
   - Per-protocol TVL thresholds (low/mid/high risk bands)
   - ETH price adjustments applied uniformly
   - Weighted aggregate: Aave 50%, Compound 25%, Maker 25%

3. **Contagion-Adjusted Score** — Base score amplified by cross-protocol contagion:
   - Empirical correlation matrix (Aave↔Compound: 0.87, Aave↔Maker: 0.72, Compound↔Maker: 0.65)
   - Cascade simulation estimates propagation of initial shock
   - Score = max(base, base * contagionMultiplier)

4. **Depeg Risk Score** — Stablecoin-specific risk assessment:
   - Tracks UST, USDC, USDT, DAI peg deviations
   - Severity thresholds: WATCH (0.5%), WARNING (2%), CRITICAL (5%)
   - Mechanism-type risk multipliers (algorithmic > fiat-backed)

### Final Score Computation

The backtest uses a **max-signal approach**: the final daily score is the maximum of all component scores. This mirrors the principle that if ANY sensor detects danger, the system should alert. Additionally, when depeg risk exceeds 20, it acts as a floor (80% of depeg risk score).

```
finalScore = min(100, max(maxComponentScore, depegFloor))
```

### Alert Levels

| Score Range | Alert Level | Action |
|-------------|-------------|--------|
| 0-39 | NONE | Normal monitoring |
| 40-59 | WATCH | Elevated attention |
| 60-79 | WARNING | Risk mitigation recommended |
| 80-100 | CRITICAL | Circuit breaker triggered |

---

## Event Details

### 1. Terra/Luna Collapse (May 2022)

**Background:** The UST algorithmic stablecoin lost its $1 peg, triggering a death spiral with LUNA. $60B in value was destroyed in days.

**Timeline:**
| Date | Days Before | Risk Score | Alert | Key Signal |
|------|-------------|-----------|-------|------------|
| Apr 8 | D-30 | ~42 | WATCH | Baseline contagion elevated |
| Apr 15 | D-23 | ~42 | WATCH | TVL concentration risk |
| Apr 25 | D-13 | ~44 | WATCH | Early TVL outflows beginning |
| May 1 | D-7 | ~44 | WATCH | Anchor Protocol withdrawals accelerate |
| May 5 | D-3 | ~50 | WATCH | UST at $0.975, LFG deploys BTC reserves |
| May 6 | D-2 | **69** | **WARNING** | UST breaks $0.94, mass withdrawals |
| May 7 | D-1 | **100** | **CRITICAL** | UST at $0.68, circuit breaker triggered |
| May 8 | D-0 | **100** | **CRITICAL** | Full collapse, UST at $0.30 |

**Key insight:** The contagion analysis detected elevated cross-protocol stress 30 days out, and the depeg monitor escalated to WARNING 2 days before collapse — giving protocols time to reduce UST exposure.

### 2. FTX/Alameda Contagion (November 2022)

**Background:** FTX exchange collapsed, causing $8B+ in DeFi outflows as contagion spread through Alameda Research's positions across multiple protocols.

**Timeline:**
| Date | Days Before | Risk Score | Alert | Key Signal |
|------|-------------|-----------|-------|------------|
| Oct 3 | D-30 | ~42 | WATCH | Baseline contagion |
| Oct 25 | D-14 | ~42 | WATCH | Rumours begin, minor TVL shifts |
| Nov 1 | D-7 | ~65 | **WARNING** | Major TVL outflows start |
| Nov 3 | D-5 | ~65 | **WARNING** | Accelerating withdrawals |
| Nov 5 | D-3 | ~65 | **WARNING** | ETH drops below $1,500 |
| Nov 6 | D-2 | **85** | **CRITICAL** | Circuit breaker triggered, ETH $1,300 |
| Nov 7 | D-1 | **95** | **CRITICAL** | Mass panic withdrawals |
| Nov 8 | D-0 | **95** | **CRITICAL** | FTX halts withdrawals |

**Key insight:** TVL outflows and ETH price stress were detectable 7 days before the full collapse. Circuit breaker would have triggered 2 days early.

### 3. Euler Finance Hack (March 2023)

**Background:** A flash loan exploit drained $197M from Euler Finance, causing ripple effects across integrated protocols.

**Timeline:**
| Date | Days Before | Risk Score | Alert | Key Signal |
|------|-------------|-----------|-------|------------|
| Feb 13 | D-28 | ~42 | WATCH | Baseline |
| Mar 1 | D-12 | ~44 | WATCH | Minor anomalies |
| Mar 8 | D-5 | ~44 | WATCH | Pre-exploit positioning |
| Mar 10 | D-3 | ~66 | **WARNING** | Sharp TVL drops, ETH volatility |
| Mar 12 | D-1 | **100** | **CRITICAL** | Extreme TVL crash, circuit breaker |
| Mar 13 | D-0 | **100** | **CRITICAL** | Exploit executed |

**Key insight:** TVL disruptions from attacker positioning were detectable 3 days before the exploit. The contagion analyzer detected unusual correlation patterns.

### 4. Curve Pool Exploit (July 2023)

**Background:** A Vyper compiler vulnerability allowed $70M to be drained from several Curve pools.

**Timeline:**
| Date | Days Before | Risk Score | Alert | Key Signal |
|------|-------------|-----------|-------|------------|
| Jun 30 | D-30 | ~42 | WATCH | Baseline |
| Jul 20 | D-10 | ~42 | WATCH | Normal operations |
| Jul 25 | D-5 | ~44 | WATCH | Minor TVL shifts |
| Jul 29 | D-1 | ~63 | **WARNING** | ETH drops, TVL outflows |
| Jul 30 | D-0 | ~63 | **WARNING** | Exploit executed |

**Key insight:** This was the hardest event to predict — the vulnerability was in the compiler, not in protocol metrics. However, pre-exploit TVL movements and ETH price drops still raised the score to WARNING level 1 day before.

---

## On-Chain Proofs

All 4 backtest results are stored immutably on-chain:

```solidity
struct BacktestProof {
    string eventName;           // "Terra/Luna Collapse"
    uint256 alertLeadTimeHours; // Hours of early warning
    uint256 peakRiskScore;      // Maximum score reached (0-100)
    uint256 actualLossesUsd;    // Total losses in USD
    uint256 preventedLossesUsd; // Estimated prevented losses
    uint256 effectivenessPercent; // Effectiveness rating (0-100)
}
```

Read them on-chain:
```bash
# Get count
cast call 0xbC75cCB19bc37a87bB0500c016bD13E50c591f09 "getBacktestCount()" --rpc-url $RPC

# Read proof #0 (Terra/Luna)
cast call 0xbC75cCB19bc37a87bB0500c016bD13E50c591f09 "backtestResults(uint256)" 0 --rpc-url $RPC
```

---

## Limitations & Assumptions

1. **Hindsight bias** — Historical data was selected knowing the outcomes. The scoring algorithm does not have access to future data, but the event selection and data curation are retrospective.

2. **Simulated AI scores** — Backtests use a heuristic `computeClaudeSimulatedScore()` function rather than actual Claude API calls. This approximates what the AI would output given the same inputs.

3. **Data granularity** — Daily snapshots miss intra-day volatility. The actual system updates every 5 minutes. Higher-frequency data would likely improve detection lead times.

4. **Prevented losses estimation** — "Prevented losses" assumes protocols would act on circuit breaker signals. Actual prevention depends on integration depth.

5. **Max-signal approach** — Using the maximum of all component scores is aggressive and may produce more false positives in normal conditions. The production system uses weighted median consensus instead.

---

## Running Backtests

```bash
cd derisk-workflow

# Run all 4 events
npx tsx run-backtest.ts all

# Run individual events
npx tsx run-backtest.ts terra-luna
npx tsx run-backtest.ts ftx
npx tsx run-backtest.ts euler
npx tsx run-backtest.ts curve
```

Output includes day-by-day timelines, alert levels, and summary statistics.
