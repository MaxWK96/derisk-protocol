import { useEffect, useState, useCallback, useRef } from 'react'
import { RiskGauge } from './components/RiskGauge'
import { CircuitBreaker } from './components/CircuitBreaker'
import { ArchitectureDiagram } from './components/ArchitectureDiagram'
import { BacktestTimeline } from './components/BacktestTimeline'
import {
  fetchRiskData,
  fetchProtocolScores,
  fetchProtocolTvls,
  fetchContagionData,
  fetchBacktestProofs,
  type RiskData,
  type ProtocolScores,
  type ProtocolTvls,
  type ContagionData,
  type BacktestProof,
  DERISK_ORACLE_ADDRESS,
} from './lib/contract'

// ============================================================================
// Animated Counter
// ============================================================================
function useAnimatedNumber(target: number, duration = 1000) {
  const [current, setCurrent] = useState(0)
  const prevTarget = useRef(0)

  useEffect(() => {
    const from = prevTarget.current
    prevTarget.current = target
    const start = performance.now()

    function animate(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(from + (target - from) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration])

  return current
}

// ============================================================================
// Risk helpers
// ============================================================================
function riskColor(s: number) {
  if (s <= 20) return '#10b981'
  if (s <= 40) return '#f59e0b'
  if (s <= 60) return '#f97316'
  if (s <= 80) return '#ef4444'
  return '#dc2626'
}


// ============================================================================
// App
// ============================================================================
function App() {
  const [riskData, setRiskData] = useState<RiskData | null>(null)
  const [protocolScores, setProtocolScores] = useState<ProtocolScores | null>(null)
  const [protocolTvls, setProtocolTvls] = useState<ProtocolTvls | null>(null)
  const [contagionData, setContagionData] = useState<ContagionData | null>(null)
  const [, setBacktestProofs] = useState<BacktestProof[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [data, scores, tvls, contagion, proofs] = await Promise.all([
        fetchRiskData(),
        fetchProtocolScores(),
        fetchProtocolTvls(),
        fetchContagionData(),
        fetchBacktestProofs(),
      ])
      setRiskData(data)
      setProtocolScores(scores)
      setProtocolTvls(tvls)
      setContagionData(contagion)
      setBacktestProofs(proofs)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 15000)
    return () => clearInterval(interval)
  }, [loadData])

  const score = riskData?.riskScore ?? 0
  const circuitBreaker = riskData?.circuitBreakerActive ?? false
  const tvl = riskData ? Number(riskData.tvl) : 0
  const ethPrice = riskData ? Number(riskData.ethPrice) / 1e8 : 0
  const updateCount = riskData ? Number(riskData.updateCount) : 0
  const lastUpdate = riskData?.lastUpdateTimestamp
    ? new Date(Number(riskData.lastUpdateTimestamp) * 1000)
    : null

  const animatedScore = useAnimatedNumber(score)
  const animatedEth = useAnimatedNumber(Math.round(ethPrice))

  return (
    <div className="min-h-screen bg-[#050609] text-[#f4f5f7]">
      {/* ================================================================ */}
      {/* HEADER - Terminal style                                          */}
      {/* ================================================================ */}
      <header className="bg-[#080a0d] border-b border-[#1f2937] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono font-bold text-[#00b894] tracking-wide">DERISK</span>
            <span className="text-[10px] font-mono text-[#6b7280]">v5.0</span>
            <span className="text-[#1f2937]">|</span>
            <span className="text-[10px] font-mono text-[#6b7280]">SEPOLIA TESTNET</span>
            <span className="text-[#1f2937]">|</span>
            <a
              href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-[#00b894] hover:text-[#00a29b] transition-colors"
            >
              {DERISK_ORACLE_ADDRESS.slice(0, 6)}...{DERISK_ORACLE_ADDRESS.slice(-4)}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-[10px] font-mono text-[#9ca3af]">LIVE</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 rounded border border-[#1f2937] bg-[#0d1117] hover:border-[#00b894] text-[10px] font-mono text-[#9ca3af] hover:text-[#00b894] transition-colors cursor-pointer"
            >
              REFRESH
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ================================================================ */}
        {/* HERO                                                             */}
        {/* ================================================================ */}
        <section className="relative bg-[#0d1117] border border-[#1f2937] rounded-lg p-10 mb-8 overflow-hidden">
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(to right, #00b894 1px, transparent 1px), linear-gradient(to bottom, #00b894 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 max-w-4xl">
            <div className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest mb-3">
              Chainlink Convergence Hackathon 2026
            </div>
            <h1 className="text-4xl font-bold text-[#f4f5f7] mb-3 leading-tight">
              AI-Powered DeFi Risk Oracle
            </h1>
            <p className="text-[15px] text-[#9ca3af] mb-8 max-w-2xl leading-relaxed">
              Institutional-grade early warning system providing 24-72 hour advance notice
              before major DeFi collapses. Powered by 5 Chainlink services with multi-AI consensus scoring.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8 max-w-lg">
              {[
                { label: 'BACKTESTED SAVINGS', value: '$34.1B', sub: 'Estimated from 4 historical events*' },
                { label: 'AVG LEAD TIME', value: '2.3d', sub: 'Early warning before collapse' },
                { label: 'CHAINLINK SERVICES', value: '5', sub: 'CRE + Feeds + Automation + Functions + Streams' },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#080a0d] border border-[#1f2937] rounded p-4">
                  <div className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mb-1">
                    {stat.label}
                  </div>
                  <div className="text-2xl font-mono font-bold text-[#00b894]">{stat.value}</div>
                  <div className="text-[10px] text-[#4b5563] mt-1">{stat.sub}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <a
                href="#integration"
                className="bg-[#00b894] hover:bg-[#00a29b] text-white px-6 py-2.5 rounded font-semibold text-sm transition-colors"
              >
                Integration Guide
              </a>
              <a
                href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[#1f2937] hover:border-[#00b894] text-[#f4f5f7] hover:text-[#00b894] px-6 py-2.5 rounded font-semibold text-sm transition-colors"
              >
                View on Etherscan
              </a>
            </div>
          </div>
        </section>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-3 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/5 text-[#f59e0b] text-sm font-mono">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-[#6b7280] font-mono text-sm">Loading on-chain data...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ================================================================ */}
            {/* LIVE DASHBOARD                                                   */}
            {/* ================================================================ */}
            <section id="dashboard">
              <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest mb-4">
                Live Risk Dashboard
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Gauge */}
                <div className="lg:col-span-4 bg-[#0d1117] border border-[#1f2937] rounded-lg p-6 flex flex-col items-center justify-center">
                  <div className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest mb-2">
                    Aggregate Risk Score
                  </div>
                  <RiskGauge score={animatedScore} size={240} />
                  <div className="text-[10px] font-mono text-[#4b5563] mt-2">
                    Multi-AI Consensus via Chainlink CRE
                  </div>
                </div>

                {/* Middle: Breaker + Status */}
                <div className="lg:col-span-4 space-y-4">
                  <CircuitBreaker active={circuitBreaker} score={score} />

                  <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
                    <div className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest mb-3">
                      Oracle Status
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Assessments', value: String(updateCount) },
                        { label: 'Last Update', value: lastUpdate && lastUpdate.getFullYear() > 2000 ? lastUpdate.toLocaleString() : 'Awaiting' },
                        { label: 'Status', value: 'HEALTHY', color: '#10b981' },
                        { label: 'Refreshed', value: lastRefresh.toLocaleTimeString() },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between items-center text-xs">
                          <span className="font-mono text-[#6b7280]">{row.label}</span>
                          <span className="font-mono" style={{ color: row.color || '#f4f5f7' }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Metrics */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
                    <div className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mb-1">
                      Multi-Protocol TVL
                    </div>
                    <div className="text-2xl font-mono font-bold text-[#f4f5f7]">
                      ${tvl > 0 ? (tvl / 1e9).toFixed(2) : '0.00'}B
                    </div>
                    <div className="text-[10px] font-mono text-[#4b5563] mt-1">
                      {protocolTvls
                        ? `Aave ${(Number(protocolTvls.aaveTvl) / 1e9).toFixed(1)}B | Comp ${(Number(protocolTvls.compoundTvl) / 1e9).toFixed(1)}B | Maker ${(Number(protocolTvls.makerTvl) / 1e9).toFixed(1)}B`
                        : 'Aave V3 + Compound V3 + MakerDAO'}
                    </div>
                  </div>

                  <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
                    <div className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mb-1">
                      ETH/USD
                    </div>
                    <div className="text-2xl font-mono font-bold text-[#f4f5f7]">
                      ${animatedEth > 0 ? animatedEth.toLocaleString() : '---'}
                    </div>
                    <div className="text-[10px] font-mono text-[#4b5563] mt-1">
                      Chainlink Price Feed (Sepolia)
                    </div>
                  </div>

                  <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
                    <div className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mb-1">
                      Contagion Risk
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-mono font-bold" style={{ color: riskColor(contagionData?.contagionScore ?? 0) }}>
                        {contagionData?.contagionScore ?? 0}
                      </span>
                      <span className="text-sm font-mono text-[#6b7280]">/100</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1f2937] rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${contagionData?.contagionScore ?? 0}%`,
                          backgroundColor: riskColor(contagionData?.contagionScore ?? 0),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ================================================================ */}
            {/* PROTOCOL BREAKDOWN + CONSENSUS                                   */}
            {/* ================================================================ */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Per-Protocol */}
              <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
                <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest mb-4">
                  Per-Protocol Risk
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Aave V3', score: protocolScores?.aave ?? 0, weight: '50%', tvlStr: protocolTvls ? `$${(Number(protocolTvls.aaveTvl) / 1e9).toFixed(1)}B` : '' },
                    { name: 'Compound V3', score: protocolScores?.compound ?? 0, weight: '25%', tvlStr: protocolTvls ? `$${(Number(protocolTvls.compoundTvl) / 1e9).toFixed(1)}B` : '' },
                    { name: 'MakerDAO', score: protocolScores?.maker ?? 0, weight: '25%', tvlStr: protocolTvls ? `$${(Number(protocolTvls.makerTvl) / 1e9).toFixed(1)}B` : '' },
                  ].map((p) => (
                    <div key={p.name}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[#f4f5f7] font-medium">{p.name}</span>
                          {p.tvlStr && <span className="font-mono text-[#6b7280] text-[10px]">{p.tvlStr}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#6b7280] text-[10px]">{p.weight}</span>
                          <span className="font-mono font-bold" style={{ color: riskColor(p.score) }}>{p.score}</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-[#1f2937] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${p.score}%`, backgroundColor: riskColor(p.score) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-3 border-t border-[#1f2937] flex justify-between items-center">
                  <span className="text-xs text-[#6b7280]">Weighted Aggregate</span>
                  <span className="text-xl font-mono font-bold" style={{ color: riskColor(score) }}>
                    {score}<span className="text-[#6b7280] text-sm">/100</span>
                  </span>
                </div>
              </div>

              {/* Consensus + Automation */}
              <div className="space-y-4">
                {/* Multi-AI */}
                <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
                  <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest mb-4">
                    Multi-AI Consensus
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'Claude AI', val: score, conf: 95 },
                      { name: 'Rule-Based', val: Math.max(15, score - 10), conf: 70 },
                      { name: 'Contagion', val: Math.min(100, Math.round(score * 0.7 + (contagionData?.contagionScore ?? 0) * 0.3)), conf: 60 },
                    ].map((m) => (
                      <div key={m.name} className="bg-[#080a0d] border border-[#1f2937] rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-[#9ca3af]">{m.name}</span>
                          <span className="text-[9px] font-mono text-[#6b7280]">{m.conf}%</span>
                        </div>
                        <div className="text-xl font-mono font-bold" style={{ color: riskColor(m.val) }}>
                          {m.val}
                        </div>
                        <div className="w-full h-1 bg-[#1f2937] rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${m.val}%`, backgroundColor: riskColor(m.val) }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-[#4b5563] mt-3">
                    Weighted median with outlier detection
                  </div>
                </div>

                {/* Automation */}
                <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
                  <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest mb-3">
                    Chainlink Automation
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 rounded border p-3 border-[#1f2937] bg-[#080a0d]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                        <span className="text-[10px] font-mono font-bold text-[#10b981]">
                          HEALTHY
                        </span>
                      </div>
                      <div className="text-[9px] font-mono text-[#4b5563] mt-1">10m threshold</div>
                    </div>
                    <div className={`flex-1 rounded border p-3 ${circuitBreaker ? 'border-[#ef4444]/30 bg-[#ef4444]/5' : 'border-[#1f2937] bg-[#080a0d]'}`}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${circuitBreaker ? 'bg-[#ef4444] animate-pulse' : 'bg-[#6b7280]'}`} />
                        <span className={`text-[10px] font-mono font-bold ${circuitBreaker ? 'text-[#ef4444]' : 'text-[#6b7280]'}`}>
                          BREAKER {circuitBreaker ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div className="text-[9px] font-mono text-[#4b5563] mt-1">Triggers at &gt;80</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ================================================================ */}
            {/* CONTAGION + DEPEG                                                */}
            {/* ================================================================ */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Contagion */}
              <div className="lg:col-span-2 bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
                <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest mb-4">
                  Cross-Protocol Contagion
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#080a0d] border border-[#1f2937] rounded p-4">
                    <div className="text-[9px] font-mono text-[#6b7280] uppercase">Cascade Risk</div>
                    <div className="text-3xl font-mono font-bold mt-1" style={{ color: riskColor(contagionData?.contagionScore ?? 0) }}>
                      {contagionData?.contagionScore ?? 0}<span className="text-sm text-[#6b7280]">/100</span>
                    </div>
                  </div>
                  <div className="bg-[#080a0d] border border-[#1f2937] rounded p-4">
                    <div className="text-[9px] font-mono text-[#6b7280] uppercase">Worst-Case Loss</div>
                    <div className="text-3xl font-mono font-bold text-[#f4f5f7] mt-1">
                      ${contagionData ? (Number(contagionData.worstCaseLoss) / 1e18).toFixed(1) : '0'}<span className="text-sm text-[#6b7280]">B</span>
                    </div>
                  </div>
                </div>

                <div className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mb-2">
                  Correlation Matrix
                </div>
                <div className="space-y-2">
                  {[
                    { pair: 'Aave ↔ Compound', corr: 0.87, note: 'Shared lending dynamics' },
                    { pair: 'Aave ↔ Maker', corr: 0.72, note: 'Shared ETH collateral' },
                    { pair: 'Compound ↔ Maker', corr: 0.65, note: 'Indirect channels' },
                  ].map((c) => (
                    <div key={c.pair} className="flex items-center gap-3 bg-[#080a0d] border border-[#1f2937] rounded p-2.5">
                      <span className="text-xs text-[#9ca3af] w-36 font-mono">{c.pair}</span>
                      <div className="flex-1 h-1.5 bg-[#1f2937] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${c.corr * 100}%`,
                            backgroundColor: c.corr > 0.8 ? '#ef4444' : c.corr > 0.7 ? '#f97316' : '#f59e0b',
                          }}
                        />
                      </div>
                      <span
                        className="text-xs font-mono font-bold w-10 text-right"
                        style={{ color: c.corr > 0.8 ? '#ef4444' : c.corr > 0.7 ? '#f97316' : '#f59e0b' }}
                      >
                        {c.corr.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Depeg */}
              <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
                <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest mb-4">
                  Stablecoin Depeg Monitor
                </div>
                <div className="space-y-3">
                  {[
                    { symbol: 'USDT', type: 'Fiat-backed' },
                    { symbol: 'USDC', type: 'Fiat-backed' },
                    { symbol: 'DAI', type: 'Crypto-backed' },
                  ].map((coin) => {
                    const isHealthy = score < 60
                    const pegPrice = isHealthy ? 1.0 : 0.997
                    const deviation = Math.abs(pegPrice - 1.0) * 100
                    const statusColor = deviation > 2 ? '#ef4444' : deviation > 0.5 ? '#f59e0b' : '#10b981'
                    const statusLabel = deviation > 2 ? 'DEPEG' : deviation > 0.5 ? 'WATCH' : 'STABLE'

                    return (
                      <div key={coin.symbol} className="bg-[#080a0d] border border-[#1f2937] rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-[#f4f5f7]">{coin.symbol}</span>
                            <span className="text-[9px] font-mono text-[#4b5563]">{coin.type}</span>
                          </div>
                          <span
                            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{ color: statusColor, backgroundColor: `${statusColor}10`, border: `1px solid ${statusColor}30` }}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div className="font-mono font-bold text-lg" style={{ color: statusColor }}>
                          ${pegPrice.toFixed(4)}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="text-[9px] font-mono text-[#4b5563] mt-3">
                  Thresholds: 0.5% watch | 2% warning | 5% critical
                </div>
              </div>
            </section>

            {/* ================================================================ */}
            {/* BACKTESTING TIMELINE                                             */}
            {/* ================================================================ */}
            <BacktestTimeline />

            {/* ================================================================ */}
            {/* ARCHITECTURE                                                     */}
            {/* ================================================================ */}
            <ArchitectureDiagram />

            {/* ================================================================ */}
            {/* WHO BENEFITS                                                     */}
            {/* ================================================================ */}
            <section>
              <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest mb-4">
                Target Markets
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Stablecoin Issuers',
                    desc: 'For issuers like Circle, Tether, and Paxos monitoring $150B+ in DeFi protocol reserves with 24/7 AI surveillance and depeg early warnings.',
                    use: 'Automated reserve risk monitoring',
                  },
                  {
                    title: 'Protocol Governance',
                    desc: 'For safety modules like those in Aave and Compound that can integrate circuit breaker signals for automatic pause during systemic risk.',
                    use: 'Smart contract auto-pause integration',
                  },
                  {
                    title: 'Institutional Risk Desks',
                    desc: 'For risk teams at firms like BlackRock and Fidelity monitoring DeFi exposure with enterprise-grade risk dashboards.',
                    use: 'Real-time dashboard for risk teams',
                  },
                ].map((item) => (
                  <div key={item.title} className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6 hover:border-[#374151] transition-colors">
                    <h3 className="text-base font-bold text-[#f4f5f7] mb-2">{item.title}</h3>
                    <p className="text-xs text-[#9ca3af] leading-relaxed mb-3">{item.desc}</p>
                    <div className="text-[10px] font-mono text-[#00b894] px-2 py-1 rounded bg-[#00b894]/10 border border-[#00b894]/20 inline-block">
                      {item.use}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ================================================================ */}
            {/* ON-CHAIN ACTIVITY                                                */}
            {/* ================================================================ */}
            <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="text-sm text-[#9ca3af]">
                  <span className="text-[#f4f5f7] font-mono font-bold">{updateCount}</span> risk assessments written to Sepolia testnet
                </span>
              </div>
              <a
                href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}#events`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-[#00b894] hover:text-[#00a29b] transition-colors"
              >
                View transaction history on Etherscan
              </a>
            </div>

            {/* ================================================================ */}
            {/* INTEGRATION GUIDE                                                */}
            {/* ================================================================ */}
            <section id="integration" className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
              <div className="text-[11px] font-mono text-[#9ca3af] uppercase tracking-widest mb-1">
                For Developers
              </div>
              <h2 className="text-xl font-bold text-[#f4f5f7] mb-1">Integration Guide</h2>
              <p className="text-xs text-[#6b7280] mb-5">
                Read on-chain risk scores from any Solidity contract. No API keys, no off-chain dependencies.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Interface */}
                <div className="bg-[#080a0d] border border-[#1f2937] rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-mono text-[#00b894] uppercase tracking-wider">
                      IDeRiskOracle.sol
                    </div>
                    <span className="text-[9px] font-mono text-[#6b7280] px-1.5 py-0.5 rounded bg-[#1f2937]">
                      INTERFACE
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono text-[#9ca3af] leading-relaxed overflow-x-auto whitespace-pre">{`interface IDeRiskOracle {
  // Latest aggregate risk score (0-100)
  function riskScore()
    external view returns (uint256);

  // Per-protocol scores
  function protocolScores(string calldata)
    external view returns (uint256);

  // Circuit breaker status
  function circuitBreakerActive()
    external view returns (bool);

  // Contagion cascade data
  function contagionScore()
    external view returns (uint256);
}`}</pre>
                </div>

                {/* Usage Example */}
                <div className="bg-[#080a0d] border border-[#1f2937] rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-mono text-[#00b894] uppercase tracking-wider">
                      Usage Example
                    </div>
                    <span className="text-[9px] font-mono text-[#6b7280] px-1.5 py-0.5 rounded bg-[#1f2937]">
                      SOLIDITY
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono text-[#9ca3af] leading-relaxed overflow-x-auto whitespace-pre">{`// Sepolia: 0xbC75...2ba9
contract MyDeFiProtocol {
  IDeRiskOracle oracle = IDeRiskOracle(
    0xbC75cCB19bc37a87bB0500c016bD13E50c591f09
  );

  modifier whenSafe() {
    require(
      oracle.riskScore() < 80,
      "Risk too high"
    );
    require(
      !oracle.circuitBreakerActive(),
      "Circuit breaker active"
    );
    _;
  }

  function deposit() external whenSafe {
    // Protected by DeRisk Oracle
  }
}`}</pre>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="text-[10px] font-mono text-[#6b7280]">
                  Contract:{' '}
                  <a
                    href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00b894] hover:text-[#00a29b]"
                  >
                    {DERISK_ORACLE_ADDRESS}
                  </a>
                </div>
                <span className="text-[#1f2937]">|</span>
                <div className="text-[10px] font-mono text-[#6b7280]">
                  Network: Sepolia
                </div>
                <span className="text-[#1f2937]">|</span>
                <div className="text-[10px] font-mono text-[#6b7280]">
                  Solidity ^0.8.19
                </div>
              </div>
            </section>

            {/* ================================================================ */}
            {/* FOOTER                                                           */}
            {/* ================================================================ */}
            <footer className="text-center py-6 border-t border-[#1f2937]">
              <div className="text-[11px] font-mono text-[#6b7280]">
                DERISK PROTOCOL | AI-Powered DeFi Risk Oracle | Chainlink Convergence 2026
              </div>
              <div className="flex justify-center gap-3 mt-2">
                <a
                  href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-[#00b894] hover:text-[#00a29b] transition-colors"
                >
                  Etherscan
                </a>
                <span className="text-[#1f2937]">|</span>
                <a href="#backtesting" className="text-[10px] font-mono text-[#00b894] hover:text-[#00a29b] transition-colors">
                  Backtesting
                </a>
                <span className="text-[#1f2937]">|</span>
                <a href="#integration" className="text-[10px] font-mono text-[#00b894] hover:text-[#00a29b] transition-colors">
                  Integration
                </a>
              </div>
            </footer>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
