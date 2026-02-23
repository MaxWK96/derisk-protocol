import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  { label: 'T+0h', date: 'May 7, 2022', score: 40, color: 'hsl(160, 84%, 39%)', desc: 'TVL declining' },
  { label: 'T+24h', date: 'May 8, 2022', score: 65, color: 'hsl(38, 92%, 50%)', desc: 'Depeg risk rising' },
  { label: 'T+48h', date: 'May 9, 2022', score: 87, color: 'hsl(0, 84%, 60%)', desc: 'Cascade imminent' },
]

// Phase: 0=blank, 1=T0, 2=T24, 3=T48, 4=breaker, 5=outcome
const TIMINGS = [0, 400, 2200, 4000, 5800, 7000]
const CYCLE_MS = 8000

export function HeroRiskAnimation() {
  const [phase, setPhase] = useState(1)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    let cycleTimer: ReturnType<typeof setTimeout>

    const startCycle = () => {
      TIMINGS.forEach((ms, i) => {
        timers.push(setTimeout(() => setPhase(i), ms))
      })
      cycleTimer = setTimeout(() => {
        timers.splice(0).forEach(clearTimeout)
        setPhase(0)
        startCycle()
      }, CYCLE_MS)
    }

    startCycle()
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(cycleTimer)
    }
  }, [])

  const visibleCount = Math.min(3, Math.max(0, phase))
  const activeIdx = Math.max(0, visibleCount - 1)
  const currentScore = visibleCount > 0 ? STEPS[activeIdx].score : 0
  const breakerOn = phase >= 4
  const showOutcome = phase >= 5

  return (
    <div className="relative bg-card border border-border rounded-lg overflow-hidden">
      {/* Red pulse overlay when circuit breaker fires */}
      <AnimatePresence>
        {breakerOn && (
          <motion.div
            key="redpulse"
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{ zIndex: 5, backgroundColor: 'hsl(0, 84%, 60%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.18, 0.05, 0.16, 0.05] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          />
        )}
      </AnimatePresence>

      <div className="relative p-5 sm:p-6" style={{ zIndex: 10 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Terra Collapse · 48h Replay
            </div>
            <div className="text-xs font-mono text-derisk-text-secondary mt-0.5">
              DeRisk detects risk{' '}
              <span className="text-foreground font-bold">48h before catastrophe</span>
            </div>
          </div>
          <motion.div
            className="flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded border border-border"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ color: 'hsl(160, 84%, 39%)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
            LIVE SIM
          </motion.div>
        </div>

        {/* Timeline */}
        <div className="flex items-start mb-6">
          {STEPS.map((step, idx) => {
            const active = idx < visibleCount
            return (
              <div key={idx} className={`flex items-start ${idx < STEPS.length - 1 ? 'flex-1' : ''}`}>
                {/* Node */}
                <div className="flex flex-col items-center text-center" style={{ minWidth: '72px' }}>
                  <motion.div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-mono font-bold text-sm"
                    style={{
                      borderColor: active ? step.color : 'hsl(215, 25%, 22%)',
                      backgroundColor: active ? `${step.color}15` : 'transparent',
                      color: active ? step.color : 'hsl(215, 25%, 30%)',
                    }}
                    animate={
                      active
                        ? {
                            boxShadow: [
                              `0 0 0px transparent`,
                              `0 0 16px ${step.color}60`,
                              `0 0 6px ${step.color}30`,
                            ],
                          }
                        : { boxShadow: '0 0 0px transparent' }
                    }
                    transition={{ duration: 0.5 }}
                  >
                    {step.score}
                  </motion.div>
                  <div
                    className="text-[9px] font-mono font-bold mt-1"
                    style={{ color: active ? step.color : 'hsl(215, 25%, 30%)' }}
                  >
                    {step.label}
                  </div>
                  <div className="text-[8px] font-mono text-muted-foreground">{step.date}</div>
                  <AnimatePresence>
                    {active && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-[8px] font-mono mt-0.5 overflow-hidden"
                        style={{ color: step.color }}
                      >
                        {step.desc}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Connector line (after node, except last) */}
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 flex items-center" style={{ paddingTop: '20px' }}>
                    <div className="relative w-full h-px bg-border overflow-hidden rounded-full">
                      <motion.div
                        className="absolute inset-0 origin-left rounded-full"
                        style={{ backgroundColor: STEPS[idx + 1].color }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: visibleCount > idx + 1 ? 1 : 0 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Score + status row */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <div className="text-[9px] font-mono text-muted-foreground uppercase mb-0.5">Risk Score</div>
            <motion.div
              className="text-4xl font-mono font-bold tabular-nums leading-none"
              key={currentScore}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ color: visibleCount > 0 ? STEPS[activeIdx].color : 'hsl(215, 25%, 35%)' }}
            >
              {currentScore}
              <span className="text-base font-normal text-muted-foreground ml-1">/100</span>
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            {showOutcome ? (
              <motion.div
                key="outcome"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-right"
              >
                <div className="text-[9px] font-mono text-muted-foreground">Real world outcome:</div>
                <div className="text-2xl font-mono font-bold" style={{ color: 'hsl(0, 84%, 60%)' }}>
                  $40B lost
                </div>
              </motion.div>
            ) : breakerOn ? (
              <motion.div
                key="breaker"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: [0.8, 1.12, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="px-3 py-2 rounded border text-right"
                style={{
                  borderColor: 'hsl(0, 84%, 60%, 0.4)',
                  backgroundColor: 'hsl(0, 84%, 60%, 0.08)',
                }}
              >
                <div
                  className="text-[11px] font-mono font-bold leading-tight"
                  style={{ color: 'hsl(0, 84%, 60%)' }}
                >
                  🚨 CIRCUIT BREAKER
                </div>
                <div className="text-[11px] font-mono font-bold" style={{ color: 'hsl(0, 84%, 60%)' }}>
                  TRIGGERED
                </div>
              </motion.div>
            ) : visibleCount > 0 ? (
              <motion.div
                key="status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-right"
              >
                <div className="text-[9px] font-mono text-muted-foreground">Status</div>
                <div
                  className="text-sm font-mono font-bold"
                  style={{ color: STEPS[activeIdx].color }}
                >
                  {currentScore <= 40 ? 'LOW RISK' : currentScore <= 65 ? 'HIGH RISK' : 'CRITICAL'}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
