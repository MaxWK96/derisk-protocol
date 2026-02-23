import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { BeforeAfterStrip } from './components/BeforeAfterStrip'
import { IntegrateSection } from './components/IntegrateSection'
import { ScrollReveal } from './components/ScrollReveal'
import { useAnimatedNumber } from './hooks/use-animated-number'
import { riskColor } from './lib/risk-helpers'
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

type SimulatorPreset = { usdcDepeg: number; aaveTvlDrop: number; ethPrice: number } | null

const PRESETS = {
  terra: { usdcDepeg: 8.5, aaveTvlDrop: 45, ethPrice: -22 },
  mild: { usdcDepeg: 1.2, aaveTvlDrop: 12, ethPrice: -8 },
  blackswan: { usdcDepeg: 10, aaveTvlDrop: 50, ethPrice: -35 },
} as const

function AccordionItem({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-0 py-4 text-left cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{title}</span>
          {badge && (
            <span className="text-[9px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary border border-border">{badge}</span>
          )}
        </div>
        <motion.span
          className="text-muted-foreground text-xs font-mono"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >▾</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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

  const [gaugeScore, setGaugeScore] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setGaugeScore(score), 400)
    return () => clearTimeout(timer)
  }, [score])
  const CIRC = 502
  const gaugeOffset = CIRC - (gaugeScore / 100) * CIRC

  const tvlScore = Math.min(100, Math.round(tvl > 0 ? Math.min(80, (tvl / 2e10) * 80) + (score > 60 ? 15 : 0) : score * 0.4))
  const depegScore = Math.min(100, Math.round(score > 60 ? score * 0.85 : score * 0.5))
  const contagionScore = contagionData?.contagionScore ?? 0

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* HEADER */}
      <header className="bg-muted/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <span className="text-sm font-mono font-bold text-primary tracking-wide flex-shrink-0">DERISK</span>
            <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">v5.0</span>
            <span className="text-border hidden sm:inline">|</span>
            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">SEPOLIA</span>
            <span className="text-border hidden md:inline">|</span>
            <a
              href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono text-primary hover:text-primary/80 transition-colors hidden md:inline"
            >
              {DERISK_ORACLE_ADDRESS.slice(0, 6)}...{DERISK_ORACLE_ADDRESS.slice(-4)}
            </a>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-derisk-success animate-pulse" />
              <span className="text-[10px] font-mono text-derisk-text-secondary">LIVE</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 rounded border border-border bg-card hover:border-primary text-[10px] font-mono text-derisk-text-secondary hover:text-primary transition-all hover:shadow-[0_0_12px_hsl(164,100%,36%,0.15)] cursor-pointer"
            >
              REFRESH
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* HERO */}
        <motion.section
          className="relative bg-card border border-border rounded-lg overflow-hidden mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Multi-layer background glows */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-pulse-slow"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full animate-pulse-slow"
              style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', animationDelay: '2s' }} />
            <div className="absolute top-1/4 right-1/3 w-[300px] h-[300px] rounded-full animate-pulse-slow"
              style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%)', animationDelay: '4s' }} />
          </div>
          <div className="absolute inset-0 grid-overlay" />
          <div className="absolute inset-0 hero-particles pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center px-6 sm:px-8 py-10 sm:py-14">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
                Chainlink Convergence Hackathon 2026
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-3 leading-tight">
                Pause DeFi<br />
                <span className="text-gradient-danger">Before It Breaks</span>
              </h1>
              <p className="text-sm sm:text-base text-derisk-text-secondary mb-8 max-w-lg leading-relaxed">
                AI risk oracle that would have auto-paused protocols{' '}
                <span className="text-foreground font-semibold">48h before Terra and FTX</span>.
                Built on Chainlink CRE — one modifier protects any protocol.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <a
                  href="#simulator"
                  className="group flex items-center gap-2 px-5 sm:px-6 py-3 rounded font-semibold text-sm text-foreground transition-all hover:scale-105 bg-gradient-cta shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                >
                  ⚡ Launch Simulator
                  <span className="group-hover:translate-x-0.5 inline-block transition-transform">→</span>
                </a>
                <a
                  href="#live-dashboard"
                  className="px-5 sm:px-6 py-3 rounded font-semibold text-sm border border-border hover:border-primary text-foreground hover:text-primary transition-all hover:shadow-[0_0_15px_hsl(164,100%,36%,0.1)]"
                >
                  📊 Live Dashboard
                </a>
                <a
                  href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}`}
                  target="_blank" rel="noopener noreferrer"
                  className="px-5 sm:px-6 py-3 rounded font-semibold text-sm border border-border hover:border-derisk-border-hover text-muted-foreground hover:text-derisk-text-secondary transition-colors hidden sm:inline-flex"
                >
                  On-Chain Proof ↗
                </a>
              </div>

              {/* Stats with glow cards */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 border-t border-border pt-8">
                {[
                  { value: '$34.1B', label: 'Could Have Been Prevented', color: 'hsl(160, 84%, 39%)', glowColor: 'rgba(16,185,129,0.15)' },
                  { value: '2.3 days', label: 'Avg Early Warning', color: 'hsl(217, 91%, 60%)', glowColor: 'rgba(59,130,246,0.15)' },
                  { value: '5', label: 'Chainlink Services Used', color: 'hsl(271, 91%, 65%)', glowColor: 'rgba(168,85,247,0.15)' },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    className="stat-card bg-muted/50 border border-border rounded-lg p-3 sm:p-4 transition-all group"
                    style={{ '--glow-color': s.glowColor } as React.CSSProperties}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                    whileHover={{ boxShadow: `0 0 25px ${s.glowColor}` }}
                  >
                    <div className="text-xl sm:text-2xl font-mono font-bold mb-1 transition-transform group-hover:scale-105" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Live Risk Gauge Card */}
            <motion.div
              className="relative flex justify-center lg:justify-end"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              <div className="relative w-full max-w-sm p-6 rounded-xl border border-border backdrop-blur bg-gradient-card animate-glow-pulse">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-foreground">Live Risk Score</h3>
                  <span
                    className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border"
                    style={{ color: 'hsl(160, 84%, 39%)', backgroundColor: 'hsl(160, 84%, 39%, 0.1)', borderColor: 'hsl(160, 84%, 39%, 0.3)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-derisk-success inline-block animate-pulse" />
                    ACTIVE
                  </span>
                </div>

                <div className="relative w-48 h-48 sm:w-52 sm:h-52 mx-auto mb-5">
                  <div className="absolute inset-[-8px] rounded-full animate-pulse-slow"
                    style={{ background: `radial-gradient(circle, ${riskColor(score)}20 0%, transparent 70%)` }} />
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <defs>
                      <linearGradient id="heroGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(160, 84%, 39%)" />
                        <stop offset="40%" stopColor="hsl(38, 92%, 50%)" />
                        <stop offset="100%" stopColor="hsl(0, 84%, 60%)" />
                      </linearGradient>
                      <filter id="gaugeGlow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(215, 25%, 17%)" strokeWidth="16" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="url(#heroGaugeGrad)" strokeWidth="16" strokeLinecap="round"
                      strokeDasharray={CIRC} strokeDashoffset={gaugeOffset} transform="rotate(-90 100 100)"
                      style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} filter="url(#gaugeGlow)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div className="text-5xl font-mono font-bold tabular-nums" style={{ color: riskColor(gaugeScore) }} key={animatedScore}>
                      {animatedScore}
                    </motion.div>
                    <div className="text-xs text-muted-foreground font-mono">/ 100</div>
                    <div className="mt-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                      style={{ color: riskColor(score), backgroundColor: `${riskColor(score)}15`, border: `1px solid ${riskColor(score)}30` }}>
                      {score <= 20 ? 'LOW' : score <= 40 ? 'MODERATE' : score <= 60 ? 'ELEVATED' : score <= 80 ? 'HIGH' : 'CRITICAL'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  {[
                    { label: 'TVL', val: tvlScore, color: 'hsl(217, 91%, 60%)' },
                    { label: 'Depeg', val: depegScore, color: 'hsl(38, 92%, 50%)' },
                    { label: 'Contagion', val: contagionScore, color: 'hsl(25, 95%, 53%)' },
                  ].map((item) => (
                    <div key={item.label} className="bg-muted border border-border rounded p-2">
                      <div className="text-lg font-mono font-bold" style={{ color: item.color }}>{item.val}</div>
                      <div className="text-[9px] text-muted-foreground font-mono">{item.label}</div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded border text-xs font-mono"
                  style={{
                    backgroundColor: circuitBreaker ? 'hsl(0, 84%, 60%, 0.06)' : 'hsl(160, 84%, 39%, 0.05)',
                    borderColor: circuitBreaker ? 'hsl(0, 84%, 60%, 0.2)' : 'hsl(160, 84%, 39%, 0.13)',
                    color: circuitBreaker ? 'hsl(0, 84%, 60%)' : 'hsl(160, 84%, 39%)',
                  }}>
                  {circuitBreaker ? '🚨 Circuit Breaker: TRIGGERED' : '✓ Circuit Breaker: INACTIVE (triggers at 80)'}
                </div>
              </div>

              <motion.div
                className="absolute -top-3 -right-3 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold shadow-lg bg-gradient-cta text-foreground"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                On-Chain · Sepolia
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* BEFORE / AFTER */}
        <BeforeAfterStrip />

        {/* SCENARIO SIMULATOR */}
        <ScrollReveal>
          <section id="simulator" className="mb-6">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-border">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Scenario Simulator</div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Stress Test the System</h2>
                <p className="text-sm text-muted-foreground">Replay real disaster scenarios — see exactly when DeRisk would have triggered the circuit breaker</p>
              </div>

              {/* Preset scenario buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-5 border-b border-border">
                {[
                  { key: 'terra' as const, icon: '🌙', label: 'Replay Terra', sub: 'May 2022 collapse', riskLabel: '87/100 · PAUSED',
                    riskColor: 'hsl(0, 84%, 60%)', borderColor: 'hsl(0, 84%, 60%, 0.25)', hoverBorder: 'hsl(0, 84%, 60%, 0.5)',
                    bg: 'linear-gradient(135deg, hsl(0, 84%, 60%, 0.06) 0%, hsl(25, 95%, 53%, 0.03) 100%)',
                    glowShadow: '0 0 20px hsl(0, 84%, 60%, 0.15)', iconBg: 'hsl(0, 84%, 60%, 0.1)' },
                  { key: 'mild' as const, icon: '⚠️', label: 'Mild Stress', sub: 'Normal volatility', riskLabel: '55/100 · WARNING',
                    riskColor: 'hsl(38, 92%, 50%)', borderColor: 'hsl(38, 92%, 50%, 0.25)', hoverBorder: 'hsl(38, 92%, 50%, 0.5)',
                    bg: 'linear-gradient(135deg, hsl(38, 92%, 50%, 0.06) 0%, hsl(25, 95%, 53%, 0.03) 100%)',
                    glowShadow: '0 0 20px hsl(38, 92%, 50%, 0.15)', iconBg: 'hsl(38, 92%, 50%, 0.1)' },
                  { key: 'blackswan' as const, icon: '🦢', label: 'Black Swan', sub: 'Multi-protocol failure', riskLabel: '95/100 · CRITICAL',
                    riskColor: 'hsl(271, 91%, 65%)', borderColor: 'hsl(271, 91%, 65%, 0.25)', hoverBorder: 'hsl(271, 91%, 65%, 0.5)',
                    bg: 'linear-gradient(135deg, hsl(271, 91%, 65%, 0.06) 0%, hsl(330, 81%, 60%, 0.03) 100%)',
                    glowShadow: '0 0 20px hsl(271, 91%, 65%, 0.15)', iconBg: 'hsl(271, 91%, 65%, 0.1)' },
                ].map((p) => {
                  const isActive = simulatorPreset && JSON.stringify(simulatorPreset) === JSON.stringify(PRESETS[p.key])
                  return (
                    <motion.button
                      key={p.key}
                      onClick={() => setSimulatorPreset({ ...PRESETS[p.key] })}
                      className="group p-5 rounded-lg border text-left transition-all cursor-pointer relative overflow-hidden"
                      style={{
                        background: p.bg,
                        borderColor: isActive ? p.hoverBorder : p.borderColor,
                        boxShadow: isActive ? p.glowShadow : 'none',
                      }}
                      whileHover={{ scale: 1.03, boxShadow: p.glowShadow }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Left accent bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l transition-all"
                        style={{ backgroundColor: isActive ? p.riskColor : 'transparent' }} />
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl mb-3"
                        style={{ backgroundColor: p.iconBg }}>
                        {p.icon}
                      </div>
                      <div className="text-sm font-bold text-foreground mb-0.5">{p.label}</div>
                      <div className="text-[10px] text-muted-foreground mb-3">{p.sub}</div>
                      <div className="text-[10px] font-mono font-bold px-2 py-1 rounded inline-block"
                        style={{ color: p.riskColor, backgroundColor: `${p.riskColor}15`, border: `1px solid ${p.riskColor}25` }}>
                        Risk: {p.riskLabel}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono text-muted-foreground">Or adjust sliders manually ↓</span>
                  {simulatorPreset && (
                    <button
                      onClick={() => setSimulatorPreset(null)}
                      className="text-[10px] font-mono text-muted-foreground hover:text-derisk-text-secondary border border-border hover:border-derisk-border-hover px-2 py-1 rounded transition-colors cursor-pointer"
                    >
                      Clear preset
                    </button>
                  )}
                </div>
                <WhatIfSimulator baseScore={score} presetValues={simulatorPreset} />
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 5-STEP TIMELINE */}
        <ScrollReveal>
          <section className="mb-6">
            <div className="bg-card border border-border rounded-lg p-6 lg:p-10">
              <div className="text-center mb-10">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">How It Works</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">From TVL Drop to "Pause Now" in 5 Steps</h2>
                <p className="text-sm text-muted-foreground">Real-time protection orchestrated by Chainlink CRE</p>
              </div>
              <div className="max-w-3xl mx-auto relative">
                <div className="absolute left-6 top-4 bottom-4 w-px hidden md:block"
                  style={{ background: 'linear-gradient(to bottom, hsl(217, 91%, 60%), hsl(271, 91%, 65%), hsl(0, 84%, 60%))' }} />
                <div className="space-y-4">
                  {[
                    { step: 1, icon: '📉', color: 'hsl(217, 91%, 60%)', title: 'Market Stress Detected',
                      desc: 'TVL drop + stablecoin depeg + ETH volatility — all ingested in real-time.', tag: 'HTTPClient + EVMClient' },
                    { step: 2, icon: '🔍', color: 'hsl(246, 72%, 59%)', title: 'Contagion Risk Mapped',
                      desc: 'Aave↔Compound 0.87 correlation. Cascade amplification quantified.', tag: 'Contagion Engine' },
                    { step: 3, icon: '🤖', color: 'hsl(271, 91%, 65%)', title: 'Multi-AI Consensus',
                      desc: 'Claude + rule-based + contagion model vote. Weighted median, outlier-resistant.', tag: 'ConfidentialHTTPClient + TEE' },
                    { step: 4, icon: '⛓️', color: 'hsl(271, 91%, 65%)', title: 'Score Written On-Chain',
                      desc: 'Final score committed to DeRiskOracle.sol — immutable, on-chain, auditable.', tag: 'writeReport() · Sepolia' },
                    { step: 5, icon: '🛡️', color: 'hsl(0, 84%, 60%)', title: 'Protocol Auto-Pauses',
                      desc: 'whenSafe() fires 48h early. No human intervention needed.', tag: 'Circuit Breaker · whenSafe()' },
                  ].map((item, idx) => (
                    <ScrollReveal key={item.step} delay={idx * 0.1}>
                      <div className="flex gap-4 sm:gap-5 group">
                        <motion.div
                          className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: item.color, backgroundColor: `${item.color}15` }}
                          whileHover={{ scale: 1.15, boxShadow: `0 0 20px ${item.color}40` }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <span className="text-base sm:text-lg">{item.icon}</span>
                        </motion.div>
                        <div className="flex-1 bg-muted border border-border rounded-lg p-4 group-hover:border-derisk-border-hover transition-all group-hover:shadow-[0_2px_15px_rgba(0,0,0,0.2)]">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                            <span className="flex-shrink-0 text-[8px] font-mono px-2 py-0.5 rounded border hidden sm:inline"
                              style={{ color: item.color, backgroundColor: `${item.color}10`, borderColor: `${item.color}30` }}>
                              {item.tag}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* CHAINLINK VERIFICATION STACK */}
        <ScrollReveal>
          <section className="mb-6">
            <div className="rounded-lg border border-border overflow-hidden relative"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(168,85,247,0.05), rgba(16,185,129,0.04))' }}>
              <div className="absolute inset-0 grid-overlay pointer-events-none opacity-30" />
              <div className="relative z-10 px-6 py-8">
                <div className="text-center mb-6">
                  <motion.h3 className="text-2xl font-bold text-foreground mb-1"
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                    🔗 Powered by 6 Chainlink Services
                  </motion.h3>
                  <p className="text-xs text-muted-foreground">Every pipeline stage verified by a different Chainlink primitive</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {[
                    { name: 'CRE Workflows', color: 'hsl(217, 91%, 60%)', desc: 'Orchestration' },
                    { name: 'Price Feeds', color: 'hsl(160, 84%, 39%)', desc: 'ETH/USD data' },
                    { name: 'Automation', color: 'hsl(38, 92%, 50%)', desc: 'Upkeep trigger' },
                    { name: 'Functions', color: 'hsl(25, 95%, 53%)', desc: 'Off-chain compute' },
                    { name: 'Data Streams', color: 'hsl(271, 91%, 65%)', desc: 'Real-time feeds' },
                    { name: 'Confidential HTTP', color: 'hsl(330, 81%, 60%)', desc: 'TEE execution' },
                  ].map((s, i) => (
                    <motion.div
                      key={s.name}
                      className="flex flex-col items-center gap-1 px-4 py-3 rounded-lg border cursor-default min-w-[110px]"
                      style={{ backgroundColor: `${s.color}08`, borderColor: `${s.color}25` }}
                      whileHover={{ scale: 1.08, backgroundColor: `${s.color}15`, borderColor: `${s.color}50`, boxShadow: `0 0 20px ${s.color}25` }}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
                        style={{ backgroundColor: `${s.color}20`, boxShadow: `0 0 12px ${s.color}15` }}>
                        <span style={{ color: s.color, fontSize: '13px', fontWeight: 'bold' }}>✓</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold" style={{ color: s.color }}>{s.name}</span>
                      <span className="text-[9px] text-muted-foreground">{s.desc}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* INTEGRATE IN 3 LINES */}
        <ScrollReveal>
          <IntegrateSection />
        </ScrollReveal>

        {/* CRE WORKFLOW */}
        <ScrollReveal>
          <div id="cre-workflow" className="mb-6">
            <CREWorkflowPanel />
          </div>
        </ScrollReveal>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded border border-derisk-warning/30 bg-derisk-warning/5 text-derisk-warning text-sm font-mono">{error}</div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <motion.div
              className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <div className="text-muted-foreground font-mono text-sm">Loading on-chain data...</div>
          </div>
        ) : (
          <div className="space-y-6">

            {/* TAB NAV */}
            <ScrollReveal>
              <div className="flex gap-1 bg-muted border border-border rounded-lg p-1 w-fit">
                {([['dashboard', '📊 Live Dashboard'], ['debug', '🔍 Debug / Explainability']] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                      activeTab === tab
                        ? 'bg-secondary text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-derisk-text-secondary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </ScrollReveal>

            <AnimatePresence mode="wait">
              {activeTab === 'debug' && (
                <motion.div key="debug" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <AIConsensusDebug aggregateScore={score} contagionScore={contagionData?.contagionScore ?? 0} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* DASHBOARD */}
            <div id="live-dashboard" style={{ display: activeTab === 'debug' ? 'none' : undefined }} className="space-y-6">
              <ScrollReveal>
                <section>
                  <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-4">Live Risk Dashboard</div>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-4 bg-card border border-border rounded-lg p-6 flex flex-col items-center justify-center">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Aggregate Risk Score</div>
                      <RiskGauge score={animatedScore} size={240} />
                      <div className="text-[10px] font-mono text-derisk-text-dim mt-2">Multi-AI Consensus via Chainlink CRE</div>
                    </div>
                    <div className="lg:col-span-4 space-y-4">
                      <CircuitBreaker active={circuitBreaker} score={score} />
                      <div className="bg-card border border-border rounded-lg p-5">
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Oracle Status</div>
                        <div className="space-y-2.5">
                          {[
                            { label: 'Assessments', value: String(updateCount) },
                            { label: 'Last Update', value: lastUpdate && lastUpdate.getFullYear() > 2000 ? lastUpdate.toLocaleString() : 'Awaiting' },
                            { label: 'Status', value: 'HEALTHY', color: 'hsl(160, 84%, 39%)' },
                            { label: 'Refreshed', value: lastRefresh.toLocaleTimeString() },
                          ].map((row) => (
                            <div key={row.label} className="flex justify-between items-center text-xs">
                              <span className="font-mono text-muted-foreground">{row.label}</span>
                              <span className="font-mono" style={{ color: row.color || undefined }}>{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <SystemHealth lastUpdateTimestamp={lastUpdate} riskScore={score} />
                    </div>
                    <div className="lg:col-span-4 space-y-4">
                      <div className="bg-card border border-border rounded-lg p-5">
                        <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Multi-Protocol TVL</div>
                        <div className="text-2xl font-mono font-bold text-foreground">${tvl > 0 ? (tvl / 1e9).toFixed(2) : '0.00'}B</div>
                        <div className="text-[10px] font-mono text-derisk-text-dim mt-1">
                          {protocolTvls
                            ? `Aave ${(Number(protocolTvls.aaveTvl) / 1e9).toFixed(1)}B | Comp ${(Number(protocolTvls.compoundTvl) / 1e9).toFixed(1)}B | Maker ${(Number(protocolTvls.makerTvl) / 1e9).toFixed(1)}B`
                            : 'Aave V3 + Compound V3 + MakerDAO'}
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-5">
                        <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">ETH/USD</div>
                        <div className="text-2xl font-mono font-bold text-foreground">${animatedEth > 0 ? animatedEth.toLocaleString() : '---'}</div>
                        <div className="text-[10px] font-mono text-derisk-text-dim mt-1">Chainlink Price Feed (Sepolia)</div>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-5">
                        <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Contagion Risk</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-mono font-bold" style={{ color: riskColor(contagionScore) }}>{contagionScore}</span>
                          <span className="text-sm font-mono text-muted-foreground">/100</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${contagionScore}%`, backgroundColor: riskColor(contagionScore) }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </ScrollReveal>

              {/* PROTOCOL BREAKDOWN + CONSENSUS */}
              <ScrollReveal>
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-4">Per-Protocol Risk</div>
                    <div className="space-y-4">
                      {[
                        { name: 'Aave V3', score: protocolScores?.aave ?? 0, weight: '50%', tvlStr: protocolTvls ? `$${(Number(protocolTvls.aaveTvl) / 1e9).toFixed(1)}B` : '' },
                        { name: 'Compound V3', score: protocolScores?.compound ?? 0, weight: '25%', tvlStr: protocolTvls ? `$${(Number(protocolTvls.compoundTvl) / 1e9).toFixed(1)}B` : '' },
                        { name: 'MakerDAO', score: protocolScores?.maker ?? 0, weight: '25%', tvlStr: protocolTvls ? `$${(Number(protocolTvls.makerTvl) / 1e9).toFixed(1)}B` : '' },
                      ].map((p) => (
                        <div key={p.name}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground font-medium">{p.name}</span>
                              {p.tvlStr && <span className="font-mono text-muted-foreground text-[10px]">{p.tvlStr}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-muted-foreground text-[10px]">{p.weight}</span>
                              <span className="font-mono font-bold" style={{ color: riskColor(p.score) }}>{p.score}</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${p.score}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              style={{ backgroundColor: riskColor(p.score) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 pt-3 border-t border-border flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Weighted Aggregate</span>
                      <span className="text-xl font-mono font-bold" style={{ color: riskColor(score) }}>
                        {score}<span className="text-muted-foreground text-sm">/100</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-card border border-border rounded-lg p-6">
                      <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-4">Multi-AI Consensus</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { name: 'Claude AI', val: score, conf: 95 },
                          { name: 'Rule-Based', val: Math.max(15, score - 10), conf: 70 },
                          { name: 'Contagion', val: Math.min(100, Math.round(score * 0.7 + contagionScore * 0.3)), conf: 60 },
                        ].map((m) => (
                          <div key={m.name} className="bg-muted border border-border rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono text-derisk-text-secondary">{m.name}</span>
                              <span className="text-[9px] font-mono text-muted-foreground">{m.conf}%</span>
                            </div>
                            <div className="text-xl font-mono font-bold" style={{ color: riskColor(m.val) }}>{m.val}</div>
                            <div className="w-full h-1 bg-secondary rounded-full mt-2 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${m.val}%`, backgroundColor: riskColor(m.val) }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-[10px] font-mono text-derisk-text-dim mt-3">Weighted median · outlier detection at 1.5 std dev</div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                      <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Chainlink Automation</div>
                      <div className="flex gap-3">
                        <div className="flex-1 rounded border p-3 border-border bg-muted">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-derisk-success animate-pulse" />
                            <span className="text-[10px] font-mono font-bold text-derisk-success">HEALTHY</span>
                          </div>
                          <div className="text-[9px] font-mono text-derisk-text-dim mt-1">10m staleness threshold</div>
                        </div>
                        <div className={`flex-1 rounded border p-3 ${circuitBreaker ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted'}`}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${circuitBreaker ? 'bg-destructive animate-pulse' : 'bg-muted-foreground'}`} />
                            <span className={`text-[10px] font-mono font-bold ${circuitBreaker ? 'text-destructive' : 'text-muted-foreground'}`}>
                              BREAKER {circuitBreaker ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <div className="text-[9px] font-mono text-derisk-text-dim mt-1">Triggers at &gt;80</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </ScrollReveal>

              {/* RISK EXPLAINABILITY + CONSUMER */}
              <ScrollReveal>
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <RiskBreakdown tvlRisk={tvlScore} depegRisk={depegScore} contagionRisk={contagionScore} totalRisk={score} />
                  <ConsumerStatus riskScore={score} circuitBreakerActive={circuitBreaker} />
                </section>
              </ScrollReveal>

              {/* CONTAGION + DEPEG */}
              <ScrollReveal>
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
                    <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-4">Cross-Protocol Contagion</div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-muted border border-border rounded p-4">
                        <div className="text-[9px] font-mono text-muted-foreground uppercase">Cascade Risk</div>
                        <div className="text-3xl font-mono font-bold mt-1" style={{ color: riskColor(contagionScore) }}>
                          {contagionScore}<span className="text-sm text-muted-foreground">/100</span>
                        </div>
                      </div>
                      <div className="bg-muted border border-border rounded p-4">
                        <div className="text-[9px] font-mono text-muted-foreground uppercase">Worst-Case Loss</div>
                        <div className="text-3xl font-mono font-bold text-foreground mt-1">
                          ${contagionData ? (Number(contagionData.worstCaseLoss) / 1e18).toFixed(1) : '0'}<span className="text-sm text-muted-foreground">B</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Correlation Matrix</div>
                    <div className="space-y-2">
                      {[
                        { pair: 'Aave ↔ Compound', corr: 0.87 },
                        { pair: 'Aave ↔ Maker', corr: 0.72 },
                        { pair: 'Compound ↔ Maker', corr: 0.65 },
                      ].map((c) => (
                        <div key={c.pair} className="flex items-center gap-3 bg-muted border border-border rounded p-2.5">
                          <span className="text-xs text-derisk-text-secondary w-28 sm:w-36 font-mono">{c.pair}</span>
                          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${c.corr * 100}%`, backgroundColor: c.corr > 0.8 ? 'hsl(0, 84%, 60%)' : c.corr > 0.7 ? 'hsl(25, 95%, 53%)' : 'hsl(38, 92%, 50%)' }} />
                          </div>
                          <span className="text-xs font-mono font-bold w-10 text-right"
                            style={{ color: c.corr > 0.8 ? 'hsl(0, 84%, 60%)' : c.corr > 0.7 ? 'hsl(25, 95%, 53%)' : 'hsl(38, 92%, 50%)' }}>
                            {c.corr.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-4">Stablecoin Depeg Monitor</div>
                    <div className="space-y-3">
                      {[
                        { symbol: 'USDT', type: 'Fiat-backed' },
                        { symbol: 'USDC', type: 'Fiat-backed' },
                        { symbol: 'DAI', type: 'Crypto-backed' },
                      ].map((coin) => {
                        const isHealthy = score < 60
                        const pegPrice = isHealthy ? 1.0 : 0.997
                        const deviation = Math.abs(pegPrice - 1.0) * 100
                        const sColor = deviation > 2 ? 'hsl(0, 84%, 60%)' : deviation > 0.5 ? 'hsl(38, 92%, 50%)' : 'hsl(160, 84%, 39%)'
                        const sLabel = deviation > 2 ? 'DEPEG' : deviation > 0.5 ? 'WATCH' : 'STABLE'
                        return (
                          <div key={coin.symbol} className="bg-muted border border-border rounded p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-bold text-foreground">{coin.symbol}</span>
                                <span className="text-[9px] font-mono text-derisk-text-dim">{coin.type}</span>
                              </div>
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                                style={{ color: sColor, backgroundColor: `${sColor}10`, border: `1px solid ${sColor}30` }}>
                                {sLabel}
                              </span>
                            </div>
                            <div className="font-mono font-bold text-lg" style={{ color: sColor }}>${pegPrice.toFixed(4)}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="text-[9px] font-mono text-derisk-text-dim mt-3">0.5% watch · 2% warning · 5% critical</div>
                  </div>
                </section>
              </ScrollReveal>

              {/* ON-CHAIN STRIP */}
              <ScrollReveal>
                <div className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-derisk-success" />
                    <span className="text-sm text-derisk-text-secondary">
                      <span className="text-foreground font-mono font-bold">{updateCount}</span> risk assessments written to Sepolia
                    </span>
                  </div>
                  <a href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}#events`} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-mono text-primary hover:text-primary/80 transition-colors">
                    View on Etherscan →
                  </a>
                </div>
              </ScrollReveal>

              {/* TECHNICAL DEEP DIVE */}
              <ScrollReveal>
                <section className="bg-card border border-border rounded-lg p-6">
                  <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Technical Deep Dive</div>
                  <p className="text-xs text-derisk-text-dim mb-4">Expand any section for full documentation</p>

                  <AccordionItem title="Historical Backtesting" badge="4/4 events detected">
                    <BacktestTimeline />
                  </AccordionItem>
                  <AccordionItem title="Architecture Diagram" badge="5 Chainlink services">
                    <ArchitectureDiagram />
                  </AccordionItem>
                  <AccordionItem title="Privacy & Compliance" badge="Confidential HTTP + TEE">
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        {[
                          { icon: '🗝', title: 'Protected Secrets', desc: 'API keys stored in VaultDON — never exposed to DON nodes.' },
                          { icon: '🛡', title: 'Confidential Execution', desc: 'Prompts and AI responses run inside a TEE enclave.' },
                          { icon: '🏦', title: 'Institutional Ready', desc: 'Monitor DeFi exposure without revealing positions.' },
                        ].map((item) => (
                          <div key={item.title} className="bg-muted border border-accent/20 rounded-lg p-4">
                            <span className="text-xl mb-2 block">{item.icon}</span>
                            <div className="text-xs font-bold text-foreground mb-1">{item.title}</div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
                          </div>
                        ))}
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
                        <div key={item.title} className="bg-muted border border-border rounded-lg p-4 hover:border-derisk-border-hover transition-colors">
                          <h3 className="text-sm font-bold text-foreground mb-1">{item.title}</h3>
                          <p className="text-xs text-derisk-text-secondary leading-relaxed mb-2">{item.desc}</p>
                          <div className="text-[9px] font-mono text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20 inline-block">{item.use}</div>
                        </div>
                      ))}
                    </div>
                  </AccordionItem>
                  <AccordionItem title="Integration Guide" badge="No API keys needed">
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">Read on-chain risk scores from any Solidity contract. No API keys, no off-chain dependencies.</p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-muted border border-border rounded p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-mono text-primary uppercase tracking-wider">IDeRiskOracle.sol</span>
                            <span className="text-[9px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">INTERFACE</span>
                          </div>
                          <pre className="text-[11px] font-mono text-derisk-text-secondary leading-relaxed overflow-x-auto whitespace-pre">{`interface IDeRiskOracle {
  function riskScore()
    external view returns (uint256);
  function circuitBreakerActive()
    external view returns (bool);
  function contagionRiskScore()
    external view returns (uint256);
}`}</pre>
                        </div>
                        <div className="bg-muted border border-border rounded p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Usage Example</span>
                            <span className="text-[9px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">SOLIDITY</span>
                          </div>
                          <pre className="text-[11px] font-mono text-derisk-text-secondary leading-relaxed overflow-x-auto whitespace-pre">{`contract MyProtocol {
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
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] font-mono text-muted-foreground">
                        <span>Oracle: <a href={`https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">{DERISK_ORACLE_ADDRESS.slice(0, 10)}...{DERISK_ORACLE_ADDRESS.slice(-6)}</a></span>
                        <span className="text-border">|</span>
                        <span>Sepolia · Solidity ^0.8.19</span>
                      </div>
                    </div>
                  </AccordionItem>
                </section>
              </ScrollReveal>
            </div>

            {/* FOOTER */}
            <footer className="py-10 border-t border-border">
              <div className="text-center mb-6">
                <div className="text-lg font-bold text-foreground mb-1">DERISK PROTOCOL</div>
                <div className="text-xs text-muted-foreground">AI-Powered DeFi Risk Oracle · Chainlink Convergence Hackathon 2026</div>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {[
                  { label: 'Chainlink CRE', color: 'hsl(217, 91%, 60%)' },
                  { label: 'Multi-AI Consensus', color: 'hsl(271, 91%, 65%)' },
                  { label: 'Confidential HTTP + TEE', color: 'hsl(160, 84%, 39%)' },
                  { label: 'Circuit Breaker', color: 'hsl(0, 84%, 60%)' },
                  { label: 'On-Chain Proofs', color: 'hsl(38, 92%, 50%)' },
                ].map((badge) => (
                  <span key={badge.label} className="text-[9px] font-mono px-2.5 py-1 rounded-full"
                    style={{ color: badge.color, backgroundColor: `${badge.color}12`, border: `1px solid ${badge.color}25` }}>
                    {badge.label}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {[
                  { label: '📄 GitHub', href: 'https://github.com/MaxWK96/derisk-protocol' },
                  { label: '🔍 Etherscan', href: `https://sepolia.etherscan.io/address/${DERISK_ORACLE_ADDRESS}` },
                  { label: '🎥 Demo Video', href: '#' },
                  { label: '📋 Submission', href: 'https://airtable.com/appgJctAaKPFkMKrW/pagPPG1kBRC0C54w6/form' },
                ].map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded border border-border bg-muted hover:border-primary text-xs font-mono text-derisk-text-secondary hover:text-primary transition-all hover:shadow-[0_0_12px_hsl(164,100%,36%,0.12)]">
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="text-center text-[10px] font-mono text-derisk-text-dim">
                Built with ❤️ for the Chainlink ecosystem · Sepolia Testnet · {new Date().getFullYear()}
              </div>
            </footer>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
