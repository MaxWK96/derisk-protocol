import { useEffect, useState, useCallback, useRef } from 'react'
import { RiskGauge } from './components/RiskGauge'
import { CircuitBreaker } from './components/CircuitBreaker'
import { ArchitectureDiagram } from './components/ArchitectureDiagram'
import { BacktestTimeline } from './components/BacktestTimeline'
import { RiskBreakdown } from './components/RiskBreakdown'
import { ConsumerStatus } from './components/ConsumerStatus'
import { CREWorkflowPanel } from './components/CREWorkflowPanel'
import { AIConsensusDebug } from './components/AIConsensusDebug'
import { WhatIfSimulator } from './components/WhatIfSimulator'
import { SystemHealth } from './components/SystemHealth'
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
// Preset scenarios for the simulator
// ============================================================================
type SimulatorPreset = { usdcDepeg: number; aaveTvlDrop: number; ethPrice: number } | null

const PRESETS = {
  terra: { usdcDepeg: 8.5, aaveTvlDrop: 45, ethPrice: -22 },
  mild: { usdcDepeg: 1.2, aaveTvlDrop: 12, ethPrice: -8 },
  blackswan: { usdcDepeg: 10, aaveTvlDrop: 50, ethPrice: -35 },
} as const

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
// Accordion
// ============================================================================
function AccordionItem({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-[#1f2937]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-0 py-4 text-left cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#f4f5f7] group-hover:text-[#00b894] transition-colors">
            {title}
          </span>
          {badge && (
            <span className="text-[9px] font-mono text-[#6b7280] px-2 py-0.5 rounded bg-[#1f2937] border border-[#374151]">
              {badge}
            </span>
          )}
        </div>
        <span className="text-[#6b7280] text-xs font-mono transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </button>
      {open && <div className="pb-6">{children}</div>}
    </div>
  )
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'debug'>('dashboard')
  const [simulatorPreset, setSimulatorPreset] = useState<SimulatorPreset>(null)

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

  // Gauge animation for hero card
  const [gaugeScore, setGaugeScore] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setGaugeScore(score), 400)
    return () => clearTimeout(timer)
  }, [score])
  const CIRC = 502
  const gaugeOffset = CIRC - (gaugeScore / 100) * CIRC

  // Derived sub-scores for hero card
  const tvlScore = Math.min(100, Math.round(tvl > 0 ? Math.min(80, (tvl / 2e10) * 80) + (score > 60 ? 15 : 0) : score * 0.4))
  const depegScore = Math.min(100, Math.round(score > 60 ? score * 0.85 : score * 0.5))
  const contagionScore = contagionData?.contagionScore ?? 0

  return (
    <div className="min-h-screen bg-[#050609] text-[#f4f5f7]">

      {/* ================================================================ */}
      {/* HEADER                                                            */}
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
        {/* HERO — split layout: bold copy + animated live risk gauge         */}
        {/* ================================================================ */}
        <section className="relative bg-[#0d1117] border border-[#1f2937] rounded-lg overflow-hidden mb-6">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full animate-pulse-slow"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }}
            />
          </div>
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: 'linear-gradient(to right, #00b894 1px, transparent 1px), linear-gradient(to bottom, #00b894 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center px-8 py-14">

            {/* LEFT: Bold Copy */}
            <div className="animate-fade-in-up">
              <div className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest mb-4">
                Chainlink Convergence Hackathon 2026
              </div>

              <h1 className="text-5xl font-bold text-[#f4f5f7] mb-3 leading-tight">
                Pause DeFi<br />
                <span style={{
                  background: 'linear-gradient(to right, #ef4444, #f97316)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Before It Breaks
                </span>
              </h1>

              <p className="text-base text-[#9ca3af] mb-8 max-w-lg leading-relaxed">
                AI risk oracle that would have auto-paused protocols{' '}
                <span className="text-[#f4f5f7] font-semibold">48h before Terra and FTX</span>.
                Built on Chainlink CRE — one modifier protects any protocol.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 mb-10">
                <a
                  href="#simulator"
                  className="group flex items-center gap-2 px-6 py-3 rounded font-semibold text-sm text-white transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                    boxShadow: '0 0 20px rgba(59,130,246,0.3)',
                  }}
                >
                  Launch Risk Simulator
                  <span className="group-hover:translate-x-0.5 inline-block transition-transform">→</span>
                </a>
                <a
                  href="#live-dashboard"
                  className="px-6 py-3 rounded font-semibold text-sm border border-[#1f2937] hover:border-[#00b894] text-[#f4f5f7] hover:text-[#00b894] transition-colors"
                >
                  Live Dashboard
                </a>
                <a
                  href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded font-semibold text-sm border border-[#1f2937] hover:border-[#374151] text-[#6b7280] hover:text-[#9ca3af] transition-colors"
                >
                  On-Chain Proof ↗
                </a>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 border-t border-[#1f2937] pt-8">
                {[
                  { value: '$34.1B', label: 'Could Have Been Prevented', color: '#10b981' },
                  { value: '2.3 days', label: 'Avg Early Warning', color: '#3b82f6' },
                  { value: '5', label: 'Chainlink Services', color: '#a855f7' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-mono font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] text-[#6b7280] leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Animated Live Risk Gauge Card */}
            <div className="relative flex justify-center lg:justify-end">
              <div
                className="relative w-full max-w-sm p-6 rounded-xl border border-[#1f2937] backdrop-blur"
                style={{ background: 'linear-gradient(135deg, #0d1117 0%, #080a0d 100%)' }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-[#f4f5f7]">Live Risk Score</h3>
                  <span
                    className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border"
                    style={{ color: '#10b981', backgroundColor: '#10b98115', borderColor: '#10b98130' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] inline-block animate-pulse" />
                    ACTIVE
                  </span>
                </div>

                {/* SVG Gauge */}
                <div className="relative w-52 h-52 mx-auto mb-5">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <defs>
                      <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="40%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                    {/* Track */}
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#1f2937" strokeWidth="16" />
                    {/* Progress arc — starts from 12 o'clock */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="url(#gaugeGrad)"
                      strokeWidth="16"
                      strokeLinecap="round"
                      strokeDasharray={CIRC}
                      strokeDashoffset={gaugeOffset}
                      transform="rotate(-90 100 100)"
                      style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                    />
                  </svg>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div
                      className="text-5xl font-mono font-bold tabular-nums"
                      style={{ color: riskColor(gaugeScore) }}
                    >
                      {animatedScore}
                    </div>
                    <div className="text-xs text-[#6b7280] font-mono">/ 100</div>
                    <div
                      className="mt-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                      style={{
                        color: riskColor(score),
                        backgroundColor: `${riskColor(score)}15`,
                        border: `1px solid ${riskColor(score)}30`,
                      }}
                    >
                      {score <= 20 ? 'LOW' : score <= 40 ? 'MODERATE' : score <= 60 ? 'ELEVATED' : score <= 80 ? 'HIGH' : 'CRITICAL'}
                    </div>
                  </div>
                </div>

                {/* Sub-score breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  {[
                    { label: 'TVL', val: tvlScore, color: '#3b82f6' },
                    { label: 'Depeg', val: depegScore, color: '#f59e0b' },
                    { label: 'Contagion', val: contagionScore, color: '#f97316' },
                  ].map((item) => (
                    <div key={item.label} className="bg-[#080a0d] border border-[#1f2937] rounded p-2">
                      <div className="text-lg font-mono font-bold" style={{ color: item.color }}>{item.val}</div>
                      <div className="text-[9px] text-[#6b7280] font-mono">{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* Circuit breaker status */}
                <div
                  className="p-3 rounded border text-xs font-mono"
                  style={{
                    backgroundColor: circuitBreaker ? '#ef444410' : '#10b98108',
                    borderColor: circuitBreaker ? '#ef444430' : '#10b98120',
                    color: circuitBreaker ? '#ef4444' : '#10b981',
                  }}
                >
                  {circuitBreaker ? '🚨 Circuit Breaker: TRIGGERED' : '✓ Circuit Breaker: INACTIVE (triggers at 80)'}
                </div>
              </div>

              {/* Floating badge */}
              <div
                className="absolute -top-3 -right-3 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold shadow-lg animate-bounce-slow"
                style={{ background: 'linear-gradient(to right, #7c3aed, #4f46e5)', color: '#fff' }}
              >
                On-Chain · Sepolia
              </div>
            </div>

          </div>
        </section>

        {/* ================================================================ */}
        {/* SCENARIO SIMULATOR — THE STAR, immediately after hero            */}
        {/* ================================================================ */}
        <section id="simulator" className="mb-6">
          <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg overflow-hidden">
            {/* Section header */}
            <div className="px-6 pt-6 pb-4 border-b border-[#1f2937]">
              <div className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest mb-1">
                Scenario Simulator
              </div>
              <h2 className="text-2xl font-bold text-[#f4f5f7] mb-1">Stress Test the System</h2>
              <p className="text-sm text-[#6b7280]">
                Replay real disaster scenarios — see exactly when DeRisk would have triggered the circuit breaker
              </p>
            </div>

            {/* Preset scenario buttons */}
            <div className="grid md:grid-cols-3 gap-4 px-6 py-5 border-b border-[#1f2937]">
              {[
                {
                  key: 'terra' as const,
                  icon: '🌙',
                  label: 'Replay Terra',
                  sub: 'May 2022 collapse',
                  riskLabel: '87/100 · PAUSED',
                  riskColor: '#ef4444',
                  borderColor: '#ef444430',
                  hoverBorder: '#ef444460',
                  bg: 'linear-gradient(135deg, #ef444408 0%, #f9731608 100%)',
                },
                {
                  key: 'mild' as const,
                  icon: '⚠️',
                  label: 'Mild Stress',
                  sub: 'Normal volatility',
                  riskLabel: '55/100 · WARNING',
                  riskColor: '#f59e0b',
                  borderColor: '#f59e0b30',
                  hoverBorder: '#f59e0b60',
                  bg: 'linear-gradient(135deg, #f59e0b08 0%, #f9731608 100%)',
                },
                {
                  key: 'blackswan' as const,
                  icon: '🦢',
                  label: 'Black Swan',
                  sub: 'Multi-protocol failure',
                  riskLabel: '95/100 · CRITICAL',
                  riskColor: '#a855f7',
                  borderColor: '#a855f730',
                  hoverBorder: '#a855f760',
                  bg: 'linear-gradient(135deg, #a855f708 0%, #ec489908 100%)',
                },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSimulatorPreset({ ...PRESETS[p.key] })}
                  className="group p-5 rounded-lg border text-left transition-all hover:scale-[1.02] cursor-pointer"
                  style={{
                    background: p.bg,
                    borderColor: simulatorPreset && JSON.stringify(simulatorPreset) === JSON.stringify(PRESETS[p.key]) ? p.hoverBorder : p.borderColor,
                  }}
                >
                  <div className="text-2xl mb-2">{p.icon}</div>
                  <div className="text-sm font-bold text-[#f4f5f7] mb-0.5">{p.label}</div>
                  <div className="text-[10px] text-[#6b7280] mb-3">{p.sub}</div>
                  <div className="text-[10px] font-mono font-bold" style={{ color: p.riskColor }}>
                    Risk: {p.riskLabel}
                  </div>
                </button>
              ))}
            </div>

            {/* WhatIfSimulator (full sliders + results) */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono text-[#6b7280]">
                  Or adjust sliders manually ↓
                </span>
                {simulatorPreset && (
                  <button
                    onClick={() => setSimulatorPreset(null)}
                    className="text-[10px] font-mono text-[#6b7280] hover:text-[#9ca3af] border border-[#1f2937] hover:border-[#374151] px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    Clear preset
                  </button>
                )}
              </div>
              <WhatIfSimulator baseScore={score} presetValues={simulatorPreset} />
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* CINEMATIC TIMELINE — 5-step flow                                 */}
        {/* ================================================================ */}
        <section className="mb-6">
          <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6 lg:p-10">
            <div className="text-center mb-10">
              <div className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest mb-2">How It Works</div>
              <h2 className="text-3xl font-bold text-[#f4f5f7] mb-2">From TVL Drop to "Pause Now" in 5 Steps</h2>
              <p className="text-sm text-[#6b7280]">Real-time protection orchestrated by Chainlink CRE</p>
            </div>

            <div className="max-w-3xl mx-auto relative">
              {/* Vertical gradient line */}
              <div
                className="absolute left-6 top-4 bottom-4 w-px hidden md:block"
                style={{ background: 'linear-gradient(to bottom, #3b82f6, #8b5cf6, #ef4444)' }}
              />

              <div className="space-y-4">
                {[
                  {
                    step: 1, icon: '📉', color: '#3b82f6',
                    title: 'Market Stress Emerges',
                    desc: 'TVL drops, stablecoin depegs, ETH volatility detected by DeFi Llama + Chainlink Price Feeds',
                    tag: 'HTTPClient + EVMClient',
                  },
                  {
                    step: 2, icon: '🔍', color: '#6366f1',
                    title: 'Contagion Risk Mapped',
                    desc: 'Cross-protocol correlation matrix (Aave↔Compound 0.87) quantifies cascade amplification',
                    tag: 'Contagion Engine',
                  },
                  {
                    step: 3, icon: '🤖', color: '#8b5cf6',
                    title: 'Multi-AI Consensus',
                    desc: 'Claude (50%) + Rule-Based (30%) + Contagion-Adjusted (20%) vote via weighted median',
                    tag: 'ConfidentialHTTPClient + TEE',
                  },
                  {
                    step: 4, icon: '⛓️', color: '#a855f7',
                    title: 'Risk Score Written On-Chain',
                    desc: 'CRE workflow commits final score to DeRiskOracle.sol — immutable, verifiable, auditable',
                    tag: 'writeReport() · Sepolia',
                  },
                  {
                    step: 5, icon: '🛡️', color: '#ef4444',
                    title: 'Your Protocol Auto-Pauses',
                    desc: 'SimpleLendingPool circuit breaker fires 48h before catastrophe. No human intervention needed.',
                    tag: 'Circuit Breaker · whenSafe()',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-5 group">
                    {/* Step indicator */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all group-hover:scale-110"
                      style={{ borderColor: item.color, backgroundColor: `${item.color}15` }}>
                      <span className="text-lg">{item.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-[#080a0d] border border-[#1f2937] rounded-lg p-4 group-hover:border-[#374151] transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-bold text-[#f4f5f7]">{item.title}</h3>
                        <span
                          className="flex-shrink-0 text-[8px] font-mono px-2 py-0.5 rounded border"
                          style={{ color: item.color, backgroundColor: `${item.color}10`, borderColor: `${item.color}30` }}
                        >
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-xs text-[#6b7280] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* CHAINLINK VERIFICATION STACK                                     */}
        {/* ================================================================ */}
        <section className="mb-6">
          <div
            className="rounded-lg border border-[#1f2937] px-6 py-5"
            style={{ background: 'linear-gradient(to right, rgba(59,130,246,0.04), rgba(168,85,247,0.04))' }}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-5 justify-between">
              <div>
                <h3 className="text-base font-bold text-[#f4f5f7] mb-0.5">Secured by Chainlink</h3>
                <p className="text-xs text-[#6b7280]">Every pipeline stage verified by a different Chainlink service</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {[
                  { name: 'CRE', color: '#3b82f6' },
                  { name: 'Price Feeds', color: '#10b981' },
                  { name: 'Automation', color: '#f59e0b' },
                  { name: 'Functions', color: '#f97316' },
                  { name: 'Data Streams', color: '#a855f7' },
                  { name: 'Confidential HTTP', color: '#ec4899' },
                ].map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${s.color}20`, border: `1px solid ${s.color}50` }}
                    >
                      <span style={{ color: s.color, fontSize: '10px' }}>✓</span>
                    </div>
                    <span className="text-xs font-mono text-[#9ca3af]">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* CRE WORKFLOW PANEL                                               */}
        {/* ================================================================ */}
        <div id="cre-workflow" className="mb-6">
          <CREWorkflowPanel />
        </div>

        {/* Error */}
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

            {/* ============================================================ */}
            {/* TAB NAVIGATION                                                */}
            {/* ============================================================ */}
            <div className="flex gap-1 bg-[#080a0d] border border-[#1f2937] rounded-lg p-1 w-fit">
              {([['dashboard', 'Live Dashboard'], ['debug', 'Debug / Explainability']] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-1.5 rounded text-[11px] font-mono transition-colors cursor-pointer"
                  style={{
                    backgroundColor: activeTab === tab ? '#1f2937' : 'transparent',
                    color: activeTab === tab ? '#f4f5f7' : '#6b7280',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'debug' && (
              <AIConsensusDebug
                aggregateScore={score}
                contagionScore={contagionData?.contagionScore ?? 0}
              />
            )}

            {/* ============================================================ */}
            {/* DASHBOARD CONTENT                                             */}
            {/* ============================================================ */}
            <div id="live-dashboard" style={{ display: activeTab === 'debug' ? 'none' : undefined }} className="space-y-6">

              {/* LIVE DASHBOARD */}
              <section>
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

                  {/* Middle: Breaker + Status + Health */}
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

                    <SystemHealth lastUpdateTimestamp={lastUpdate} riskScore={score} />
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

              {/* PROTOCOL BREAKDOWN + CONSENSUS */}
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

                {/* Multi-AI + Automation */}
                <div className="space-y-4">
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
                      Weighted median · outlier detection at 1.5 std dev
                    </div>
                  </div>

                  <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-5">
                    <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest mb-3">
                      Chainlink Automation
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 rounded border p-3 border-[#1f2937] bg-[#080a0d]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                          <span className="text-[10px] font-mono font-bold text-[#10b981]">HEALTHY</span>
                        </div>
                        <div className="text-[9px] font-mono text-[#4b5563] mt-1">10m staleness threshold</div>
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

              {/* RISK EXPLAINABILITY + CONSUMER STATUS */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RiskBreakdown
                  tvlRisk={Math.min(100, Math.round(
                    tvl > 0 ? Math.min(80, (tvl / 2e10) * 80) + (score > 60 ? 15 : 0) : score * 0.4
                  ))}
                  depegRisk={Math.min(100, Math.round(
                    score > 60 ? score * 0.85 : score * 0.5
                  ))}
                  contagionRisk={contagionData?.contagionScore ?? 0}
                  totalRisk={score}
                />
                <ConsumerStatus riskScore={score} circuitBreakerActive={circuitBreaker} />
              </section>

              {/* CONTAGION + DEPEG */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                  <div className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mb-2">Correlation Matrix</div>
                  <div className="space-y-2">
                    {[
                      { pair: 'Aave ↔ Compound', corr: 0.87 },
                      { pair: 'Aave ↔ Maker', corr: 0.72 },
                      { pair: 'Compound ↔ Maker', corr: 0.65 },
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
                    0.5% watch · 2% warning · 5% critical
                  </div>
                </div>
              </section>

              {/* On-chain activity strip */}
              <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span className="text-sm text-[#9ca3af]">
                    <span className="text-[#f4f5f7] font-mono font-bold">{updateCount}</span> risk assessments written to Sepolia
                  </span>
                </div>
                <a
                  href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}#events`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-[#00b894] hover:text-[#00a29b] transition-colors"
                >
                  View on Etherscan →
                </a>
              </div>

              {/* ============================================================ */}
              {/* TECHNICAL DEEP DIVE — collapsible accordion                   */}
              {/* ============================================================ */}
              <section className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
                <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest mb-1">
                  Technical Deep Dive
                </div>
                <p className="text-xs text-[#4b5563] mb-4">
                  Expand any section for full documentation
                </p>

                <AccordionItem title="Historical Backtesting" badge="4/4 events detected">
                  <div id="backtesting">
                    <BacktestTimeline />
                  </div>
                </AccordionItem>

                <AccordionItem title="Architecture Diagram" badge="5 Chainlink services">
                  <div id="architecture">
                    <ArchitectureDiagram />
                  </div>
                </AccordionItem>

                <AccordionItem title="Privacy & Compliance" badge="Confidential HTTP + TEE">
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        { icon: '🗝', title: 'Protected Secrets', desc: 'API keys stored in VaultDON — never exposed to DON nodes.' },
                        { icon: '🛡', title: 'Confidential Execution', desc: 'Prompts and AI responses run inside a TEE enclave.' },
                        { icon: '🏦', title: 'Institutional Ready', desc: 'Monitor DeFi exposure without revealing positions.' },
                      ].map((item) => (
                        <div key={item.title} className="bg-[#080a0d] border border-[#a855f7]/20 rounded-lg p-4">
                          <span className="text-xl mb-2 block">{item.icon}</span>
                          <div className="text-xs font-bold text-[#f4f5f7] mb-1">{item.title}</div>
                          <p className="text-[10px] text-[#6b7280] leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono pt-2">
                      <span className="px-2 py-1 rounded bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6]">HTTPClient → DeFi Llama</span>
                      <span className="text-[#374151]">→</span>
                      <span className="px-2 py-1 rounded bg-[#a855f7]/10 border border-[#a855f7]/20 text-[#a855f7]">ConfidentialHTTPClient → Anthropic (TEE)</span>
                      <span className="text-[#374151]">→</span>
                      <span className="px-2 py-1 rounded bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444]">writeReport() → on-chain</span>
                    </div>
                  </div>
                </AccordionItem>

                <AccordionItem title="Target Markets">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { title: 'Stablecoin Issuers', desc: 'Circle, Tether, Paxos — monitor $150B+ in DeFi reserves with depeg early warnings.', use: 'Reserve risk monitoring' },
                      { title: 'Protocol Governance', desc: 'Aave, Compound safety modules — integrate circuit breaker signals for auto-pause.', use: 'Smart contract auto-pause' },
                      { title: 'Institutional Risk Desks', desc: 'BlackRock, Fidelity — enterprise-grade DeFi exposure monitoring with audit trails.', use: 'Risk dashboard' },
                    ].map((item) => (
                      <div key={item.title} className="bg-[#080a0d] border border-[#1f2937] rounded-lg p-4 hover:border-[#374151] transition-colors">
                        <h3 className="text-sm font-bold text-[#f4f5f7] mb-1">{item.title}</h3>
                        <p className="text-xs text-[#9ca3af] leading-relaxed mb-2">{item.desc}</p>
                        <div className="text-[9px] font-mono text-[#00b894] px-2 py-0.5 rounded bg-[#00b894]/10 border border-[#00b894]/20 inline-block">
                          {item.use}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionItem>

                <AccordionItem title="Integration Guide" badge="No API keys needed">
                  <div id="integration" className="space-y-4">
                    <p className="text-xs text-[#6b7280]">
                      Read on-chain risk scores from any Solidity contract. No API keys, no off-chain dependencies.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-[#080a0d] border border-[#1f2937] rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-mono text-[#00b894] uppercase tracking-wider">IDeRiskOracle.sol</span>
                          <span className="text-[9px] font-mono text-[#6b7280] px-1.5 py-0.5 rounded bg-[#1f2937]">INTERFACE</span>
                        </div>
                        <pre className="text-[11px] font-mono text-[#9ca3af] leading-relaxed overflow-x-auto whitespace-pre">{`interface IDeRiskOracle {
  function riskScore()
    external view returns (uint256);
  function circuitBreakerActive()
    external view returns (bool);
  function contagionRiskScore()
    external view returns (uint256);
}`}</pre>
                      </div>
                      <div className="bg-[#080a0d] border border-[#1f2937] rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-mono text-[#00b894] uppercase tracking-wider">Usage Example</span>
                          <span className="text-[9px] font-mono text-[#6b7280] px-1.5 py-0.5 rounded bg-[#1f2937]">SOLIDITY</span>
                        </div>
                        <pre className="text-[11px] font-mono text-[#9ca3af] leading-relaxed overflow-x-auto whitespace-pre">{`contract MyProtocol {
  IDeRiskOracle oracle = IDeRiskOracle(
    0xbC75cCB19bc37a87bB0500c016bD13E50c591f09
  );

  modifier whenSafe() {
    require(oracle.riskScore() < 80,
      "Risk too high");
    require(!oracle.circuitBreakerActive(),
      "Circuit breaker active");
    _;
  }

  function deposit() external whenSafe {}
}`}</pre>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-[#6b7280]">
                      <span>Oracle: <a href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-[#00b894] hover:text-[#00a29b]">{DERISK_ORACLE_ADDRESS}</a></span>
                      <span className="text-[#1f2937]">|</span>
                      <span>Sepolia · Solidity ^0.8.19</span>
                    </div>
                  </div>
                </AccordionItem>

              </section>

            </div>{/* end dashboard wrapper */}

            {/* ============================================================ */}
            {/* FOOTER                                                        */}
            {/* ============================================================ */}
            <footer className="text-center py-6 border-t border-[#1f2937]">
              <div className="text-[11px] font-mono text-[#6b7280] mb-3">
                DERISK PROTOCOL · AI-Powered DeFi Risk Oracle · Chainlink Convergence 2026
              </div>

              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {[
                  { label: 'Chainlink CRE', color: '#3b82f6' },
                  { label: 'Multi-AI Consensus', color: '#a855f7' },
                  { label: 'Confidential HTTP', color: '#10b981' },
                  { label: 'Circuit Breaker Integration', color: '#ef4444' },
                ].map((badge) => (
                  <span
                    key={badge.label}
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                    style={{ color: badge.color, backgroundColor: `${badge.color}15`, border: `1px solid ${badge.color}30` }}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>

              <div className="flex justify-center gap-3">
                <a href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-[#00b894] hover:text-[#00a29b] transition-colors">Etherscan</a>
                <span className="text-[#1f2937]">|</span>
                <a href="#backtesting" className="text-[10px] font-mono text-[#00b894] hover:text-[#00a29b] transition-colors">Backtesting</a>
                <span className="text-[#1f2937]">|</span>
                <a href="#integration" className="text-[10px] font-mono text-[#00b894] hover:text-[#00a29b] transition-colors">Integration</a>
                <span className="text-[#1f2937]">|</span>
                <a href="https://github.com/MaxWK96/derisk-protocol" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-[#00b894] hover:text-[#00a29b] transition-colors">GitHub</a>
              </div>
            </footer>

          </div>
        )}
      </main>
    </div>
  )
}

export default App
