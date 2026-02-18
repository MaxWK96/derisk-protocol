import { useState, useMemo, useEffect } from 'react'

// ============================================================================
// "What If?" Scenario Simulator — interactive sliders for risk modeling
// ============================================================================

interface WhatIfSimulatorProps {
  baseScore: number
  presetValues?: { usdcDepeg: number; aaveTvlDrop: number; ethPrice: number } | null
}

function riskColor(s: number) {
  if (s <= 20) return '#10b981'
  if (s <= 40) return '#f59e0b'
  if (s <= 60) return '#f97316'
  if (s <= 80) return '#ef4444'
  return '#dc2626'
}

function riskLabel(s: number) {
  if (s <= 20) return 'LOW'
  if (s <= 40) return 'MODERATE'
  if (s <= 60) return 'ELEVATED'
  if (s <= 80) return 'HIGH'
  return 'CRITICAL'
}

interface SliderConfig {
  id: string
  label: string
  min: number
  max: number
  step: number
  unit: string
  defaultVal: number
  riskImpact: (val: number) => number
  formatVal: (val: number) => string
}

const SLIDERS: SliderConfig[] = [
  {
    id: 'usdcDepeg',
    label: 'USDC Depeg',
    min: 0,
    max: 10,
    step: 0.1,
    unit: '%',
    defaultVal: 0,
    // 0% → 0 pts, 5% → +35 pts, 10% → +60 pts
    riskImpact: (v) => Math.round(v * 6),
    formatVal: (v) => `${v.toFixed(1)}%`,
  },
  {
    id: 'aaveTvlDrop',
    label: 'Aave TVL Drop',
    min: 0,
    max: 50,
    step: 1,
    unit: '%',
    defaultVal: 0,
    // 0% → 0, 25% → +15, 50% → +30
    riskImpact: (v) => Math.round(v * 0.6),
    formatVal: (v) => `${v.toFixed(0)}%`,
  },
  {
    id: 'ethPrice',
    label: 'ETH Price Change',
    min: -60,
    max: 60,
    step: 1,
    unit: '%',
    defaultVal: 0,
    // negative → risk up, positive → risk down (but floored at 0)
    riskImpact: (v) => Math.round(Math.max(0, -v) * 0.5),
    formatVal: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`,
  },
]

export function WhatIfSimulator({ baseScore, presetValues }: WhatIfSimulatorProps) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(SLIDERS.map((s) => [s.id, s.defaultVal]))
  )
  const [applied, setApplied] = useState(false)

  // Apply preset values when they change
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
    <section className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest">
          Scenario Simulator
        </div>
        <span className="text-[9px] font-mono text-[#f97316] px-2 py-0.5 rounded bg-[#f97316]/10 border border-[#f97316]/20">
          What If?
        </span>
      </div>
      <p className="text-[10px] text-[#4b5563] mb-6">
        Adjust market conditions to see how the risk oracle would respond — live circuit breaker and consumer contract status updates
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders */}
        <div className="space-y-5">
          {SLIDERS.map((slider) => (
            <div key={slider.id}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-mono text-[#9ca3af]">{slider.label}</label>
                <span
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                  style={{
                    color: values[slider.id] !== slider.defaultVal ? riskColor(Math.min(100, slider.riskImpact(values[slider.id]) * 3 + 20)) : '#6b7280',
                    backgroundColor: values[slider.id] !== slider.defaultVal ? `${riskColor(Math.min(100, slider.riskImpact(values[slider.id]) * 3 + 20))}15` : 'transparent',
                  }}
                >
                  {slider.formatVal(values[slider.id])}
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={values[slider.id]}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, [slider.id]: parseFloat(e.target.value) }))
                    setApplied(true)
                  }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: (() => {
                      const pct = ((values[slider.id] - slider.min) / (slider.max - slider.min)) * 100
                      const impact = slider.riskImpact(values[slider.id])
                      const c = impact > 20 ? '#ef4444' : impact > 10 ? '#f97316' : impact > 0 ? '#f59e0b' : '#00b894'
                      return `linear-gradient(to right, ${c} ${pct}%, #1f2937 ${pct}%)`
                    })(),
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-[#374151] mt-1">
                <span>{slider.formatVal(slider.min)}</span>
                <span>{slider.formatVal(slider.max)}</span>
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button
              onClick={reset}
              className="px-4 py-1.5 rounded border border-[#1f2937] text-[10px] font-mono text-[#6b7280] hover:border-[#374151] hover:text-[#9ca3af] transition-colors cursor-pointer"
            >
              Reset
            </button>
            {applied && (
              <span className="text-[10px] font-mono text-[#f59e0b] flex items-center">
                ● Simulation active
              </span>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Simulated score */}
          <div className="bg-[#080a0d] border rounded-lg p-5 text-center" style={{ borderColor: `${riskColor(simulatedScore)}30` }}>
            <div className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mb-2">
              Simulated Risk Score
            </div>
            <div className="text-5xl font-mono font-bold mb-1" style={{ color: riskColor(simulatedScore) }}>
              {simulatedScore}
            </div>
            <div className="text-xs font-mono text-[#6b7280]">/ 100</div>
            <div
              className="mt-2 text-[10px] font-mono font-bold px-3 py-1 rounded inline-block"
              style={{
                color: riskColor(simulatedScore),
                backgroundColor: `${riskColor(simulatedScore)}15`,
                border: `1px solid ${riskColor(simulatedScore)}30`,
              }}
            >
              {riskLabel(simulatedScore)}
            </div>
            {applied && (
              <div className="text-[9px] font-mono text-[#4b5563] mt-2">
                Δ {simulatedScore > baseScore ? '+' : ''}{simulatedScore - baseScore} from baseline ({baseScore})
              </div>
            )}
          </div>

          {/* Circuit breaker */}
          <div className={`rounded-lg border p-4 transition-all duration-300 ${circuitBreakerTriggered ? 'border-[#ef4444]/40 bg-[#ef4444]/5' : 'border-[#1f2937] bg-[#080a0d]'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono font-bold text-[#9ca3af] mb-0.5">
                  Circuit Breaker
                </div>
                <div className="text-[9px] font-mono text-[#4b5563]">Triggers at risk ≥ 80</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${circuitBreakerTriggered ? 'bg-[#ef4444] animate-pulse' : 'bg-[#6b7280]'}`} />
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: circuitBreakerTriggered ? '#ef4444' : '#6b7280' }}
                >
                  {circuitBreakerTriggered ? '🚨 TRIGGERED' : '✓ INACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* Consumer contract */}
          <div className={`rounded-lg border p-4 transition-all duration-300 ${consumerPaused ? 'border-[#f59e0b]/40 bg-[#f59e0b]/5' : 'border-[#1f2937] bg-[#080a0d]'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono font-bold text-[#9ca3af] mb-0.5">
                  SimpleLendingPool
                </div>
                <div className="text-[9px] font-mono text-[#4b5563]">Pauses deposits/borrows at risk ≥ 70</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${consumerPaused ? 'bg-[#f59e0b] animate-pulse' : 'bg-[#10b981]'}`} />
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: consumerPaused ? '#f59e0b' : '#10b981' }}
                >
                  {consumerPaused ? '⏸ PAUSED' : '🟢 ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* Risk bar */}
          <div className="bg-[#080a0d] border border-[#1f2937] rounded-lg p-4">
            <div className="text-[9px] font-mono text-[#6b7280] uppercase tracking-wider mb-2">Risk Gauge</div>
            <div className="relative h-3 bg-[#1f2937] rounded-full overflow-hidden mb-1">
              {/* Threshold markers */}
              <div className="absolute top-0 bottom-0 w-px bg-[#f59e0b]/40" style={{ left: '70%' }} />
              <div className="absolute top-0 bottom-0 w-px bg-[#ef4444]/40" style={{ left: '80%' }} />
              {/* Fill */}
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${simulatedScore}%`,
                  backgroundColor: riskColor(simulatedScore),
                }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-[#374151]">
              <span>0</span>
              <span className="text-[#f59e0b]">70 pause</span>
              <span className="text-[#ef4444]">80 breaker</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
