import { useState, useMemo, useEffect } from 'react'
import { riskColor, riskLabel } from '../lib/risk-helpers'

interface WhatIfSimulatorProps {
  baseScore: number
  presetValues?: { usdcDepeg: number; aaveTvlDrop: number; ethPrice: number } | null
}

interface SliderConfig {
  id: string
  label: string
  min: number
  max: number
  step: number
  defaultVal: number
  riskImpact: (val: number) => number
  formatVal: (val: number) => string
}

const SLIDERS: SliderConfig[] = [
  {
    id: 'usdcDepeg', label: 'USDC Depeg', min: 0, max: 10, step: 0.1,
    defaultVal: 0, riskImpact: (v) => Math.round(v * 6), formatVal: (v) => `${v.toFixed(1)}%`,
  },
  {
    id: 'aaveTvlDrop', label: 'Aave TVL Drop', min: 0, max: 50, step: 1,
    defaultVal: 0, riskImpact: (v) => Math.round(v * 0.6), formatVal: (v) => `${v.toFixed(0)}%`,
  },
  {
    id: 'ethPrice', label: 'ETH Price Change', min: -60, max: 60, step: 1,
    defaultVal: 0, riskImpact: (v) => Math.round(Math.max(0, -v) * 0.5), formatVal: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`,
  },
]

export function WhatIfSimulator({ baseScore, presetValues }: WhatIfSimulatorProps) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(SLIDERS.map((s) => [s.id, s.defaultVal]))
  )
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (presetValues) {
      setValues({
        usdcDepeg: Math.min(10, Math.max(0, presetValues.usdcDepeg)),
        aaveTvlDrop: Math.min(50, Math.max(0, presetValues.aaveTvlDrop)),
        ethPrice: Math.min(60, Math.max(-60, presetValues.ethPrice)),
      })
      setApplied(true)
    }
  }, [presetValues])

  const simulatedScore = useMemo(() => {
    const delta = SLIDERS.reduce((acc, s) => acc + s.riskImpact(values[s.id]), 0)
    return Math.min(100, Math.max(0, baseScore + delta))
  }, [values, baseScore])

  const circuitBreakerTriggered = simulatedScore >= 80
  const consumerPaused = simulatedScore >= 70

  function reset() {
    setValues(Object.fromEntries(SLIDERS.map((s) => [s.id, s.defaultVal])))
    setApplied(false)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">Scenario Simulator</div>
        <span className="text-[9px] font-mono text-derisk-orange px-2 py-0.5 rounded bg-derisk-orange/10 border border-derisk-orange/20">
          What If?
        </span>
      </div>
      <p className="text-[10px] text-derisk-text-dim mb-6">
        Adjust market conditions to see how the risk oracle would respond — live circuit breaker and consumer contract status updates
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders */}
        <div className="space-y-5">
          {SLIDERS.map((slider) => {
            const impact = slider.riskImpact(values[slider.id])
            const sliderColor = impact > 20 ? 'hsl(0, 84%, 60%)' : impact > 10 ? 'hsl(25, 95%, 53%)' : impact > 0 ? 'hsl(38, 92%, 50%)' : 'hsl(164, 100%, 36%)'
            const pct = ((values[slider.id] - slider.min) / (slider.max - slider.min)) * 100
            return (
              <div key={slider.id}>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-mono text-derisk-text-secondary">{slider.label}</label>
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{
                      color: values[slider.id] !== slider.defaultVal ? riskColor(Math.min(100, impact * 3 + 20)) : 'hsl(215, 8%, 46%)',
                      backgroundColor: values[slider.id] !== slider.defaultVal ? `${riskColor(Math.min(100, impact * 3 + 20))}15` : 'transparent',
                    }}
                  >
                    {slider.formatVal(values[slider.id])}
                  </span>
                </div>
                <input
                  type="range" min={slider.min} max={slider.max} step={slider.step}
                  value={values[slider.id]}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, [slider.id]: parseFloat(e.target.value) }))
                    setApplied(true)
                  }}
                  className="w-full h-1.5 rounded-full cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${sliderColor} ${pct}%, hsl(215, 25%, 17%) ${pct}%)` }}
                />
                <div className="flex justify-between text-[9px] font-mono text-derisk-text-dim mt-1">
                  <span>{slider.formatVal(slider.min)}</span>
                  <span>{slider.formatVal(slider.max)}</span>
                </div>
              </div>
            )
          })}
          <div className="flex gap-2 pt-2">
            <button
              onClick={reset}
              className="px-4 py-1.5 rounded border border-border text-[10px] font-mono text-muted-foreground hover:border-derisk-border-hover hover:text-derisk-text-secondary transition-colors cursor-pointer"
            >
              Reset
            </button>
            {applied && <span className="text-[10px] font-mono text-derisk-warning flex items-center">● Simulation active</span>}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-muted border rounded-lg p-5 text-center" style={{ borderColor: `${riskColor(simulatedScore)}30` }}>
            <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Simulated Risk Score</div>
            <div className="text-5xl font-mono font-bold mb-1" style={{ color: riskColor(simulatedScore) }}>{simulatedScore}</div>
            <div className="text-xs font-mono text-muted-foreground">/ 100</div>
            <div
              className="mt-2 text-[10px] font-mono font-bold px-3 py-1 rounded inline-block"
              style={{ color: riskColor(simulatedScore), backgroundColor: `${riskColor(simulatedScore)}15`, border: `1px solid ${riskColor(simulatedScore)}30` }}
            >
              {riskLabel(simulatedScore)}
            </div>
            {applied && (
              <div className="text-[9px] font-mono text-derisk-text-dim mt-2">
                Δ {simulatedScore > baseScore ? '+' : ''}{simulatedScore - baseScore} from baseline ({baseScore})
              </div>
            )}
          </div>

          <div className={`rounded-lg border p-4 transition-all duration-300 ${circuitBreakerTriggered ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-muted'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono font-bold text-derisk-text-secondary mb-0.5">Circuit Breaker</div>
                <div className="text-[9px] font-mono text-derisk-text-dim">Triggers at risk ≥ 80</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${circuitBreakerTriggered ? 'bg-destructive animate-pulse' : 'bg-muted-foreground'}`} />
                <span className="text-xs font-mono font-bold" style={{ color: circuitBreakerTriggered ? 'hsl(0, 84%, 60%)' : 'hsl(215, 8%, 46%)' }}>
                  {circuitBreakerTriggered ? '🚨 TRIGGERED' : '✓ INACTIVE'}
                </span>
              </div>
            </div>
          </div>

          <div className={`rounded-lg border p-4 transition-all duration-300 ${consumerPaused ? 'border-derisk-warning/40 bg-derisk-warning/5' : 'border-border bg-muted'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono font-bold text-derisk-text-secondary mb-0.5">SimpleLendingPool</div>
                <div className="text-[9px] font-mono text-derisk-text-dim">Pauses deposits/borrows at risk ≥ 70</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${consumerPaused ? 'bg-derisk-warning animate-pulse' : 'bg-derisk-success'}`} />
                <span className="text-xs font-mono font-bold" style={{ color: consumerPaused ? 'hsl(38, 92%, 50%)' : 'hsl(160, 84%, 39%)' }}>
                  {consumerPaused ? '⏸ PAUSED' : '🟢 ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-muted border border-border rounded-lg p-4">
            <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Risk Gauge</div>
            <div className="relative h-3 bg-secondary rounded-full overflow-hidden mb-1">
              <div className="absolute top-0 bottom-0 w-px bg-derisk-warning/40" style={{ left: '70%' }} />
              <div className="absolute top-0 bottom-0 w-px bg-destructive/40" style={{ left: '80%' }} />
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${simulatedScore}%`, backgroundColor: riskColor(simulatedScore) }} />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-derisk-text-dim">
              <span>0</span>
              <span className="text-derisk-warning">70 pause</span>
              <span className="text-destructive">80 breaker</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
