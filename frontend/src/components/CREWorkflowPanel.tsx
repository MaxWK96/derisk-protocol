import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Step {
  num: number
  icon: string
  title: string
  service: string
  source: string
  color: string
  detail: string
}

const STEPS: Step[] = [
  {
    num: 1, icon: '⬇', title: 'Fetch TVL', service: 'HTTPClient', source: 'DeFi Llama API',
    color: 'hsl(217, 91%, 60%)',
    detail: 'Parallel HTTP GET to DeFi Llama for Aave V3, Compound V3, and MakerDAO TVL data. Returns USD-denominated totals updated every 15 minutes.',
  },
  {
    num: 2, icon: '⛓', title: 'Read ETH/USD', service: 'EVMClient', source: 'Chainlink Price Feed',
    color: 'hsl(160, 84%, 39%)',
    detail: 'EVM read call to Chainlink ETH/USD Price Feed on Sepolia (0x694AA1769357215DE4FAC081bf1f309aDC325306). Returns 8-decimal answer from latest round.',
  },
  {
    num: 3, icon: '⚡', title: 'Contagion Sim', service: 'CRE Internal', source: 'Correlation Matrix',
    color: 'hsl(25, 95%, 53%)',
    detail: 'Cascade simulation using empirical correlation matrix: Aave↔Compound 0.87, Aave↔Maker 0.72, Compound↔Maker 0.65. Computes worst-case TVL loss scenario.',
  },
  {
    num: 4, icon: '🤖', title: 'AI Consensus', service: 'ConfidentialHTTPClient', source: 'Anthropic Claude API (TEE)',
    color: 'hsl(271, 91%, 65%)',
    detail: 'Confidential HTTP request to Anthropic Claude API inside a TEE. API key stored in VaultDON — never exposed to DON nodes. 3-model weighted median (Claude 50%, Rule 30%, Contagion 20%).',
  },
  {
    num: 5, icon: '📝', title: 'Write On-Chain', service: 'writeReport()', source: 'DeRiskOracle.sol',
    color: 'hsl(0, 84%, 60%)',
    detail: 'CRE calls writeReport() on DeRiskOracle. Emits RiskAssessmentUpdated event. Chainlink Automation monitors staleness — auto-escalates if no update after 10 minutes.',
  },
]

export function CREWorkflowPanel() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % (STEPS.length + 1))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">CRE Workflow Orchestration</div>
        <span className="text-[9px] font-mono text-derisk-purple px-2 py-0.5 rounded bg-derisk-purple/10 border border-derisk-purple/20">
          Chainlink Runtime Environment
        </span>
      </div>
      <p className="text-xs text-derisk-text-dim mb-6">5-step automated pipeline — click any step to expand details</p>

      <div className="flex flex-col lg:flex-row gap-0 items-stretch">
        {STEPS.map((step, idx) => (
          <div key={step.num} className="flex flex-col lg:flex-row items-center flex-1">
            <motion.button
              className="w-full lg:flex-1 text-left rounded-lg border p-4 transition-all duration-200 cursor-pointer relative overflow-hidden"
              style={{
                borderColor: expanded === step.num ? step.color : activeStep > idx ? `${step.color}60` : 'hsl(215, 25%, 17%)',
                backgroundColor: expanded === step.num ? `${step.color}10` : 'hsl(215, 24%, 4%)',
              }}
              onClick={() => setExpanded(expanded === step.num ? null : step.num)}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Animated progress indicator */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ backgroundColor: step.color }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: activeStep > idx ? 1 : 0 }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
              />
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                  style={{ backgroundColor: `${step.color}20`, color: step.color, border: `1px solid ${step.color}40` }}
                >
                  {step.num}
                </span>
                <span className="text-lg">{step.icon}</span>
              </div>
              <div className="text-xs font-mono font-bold text-foreground mb-1">{step.title}</div>
              <div className="text-[9px] font-mono font-semibold mb-0.5" style={{ color: step.color }}>{step.service}</div>
              <div className="text-[9px] font-mono text-muted-foreground">{step.source}</div>
            </motion.button>

            {idx < STEPS.length - 1 && (
              <div className="flex items-center justify-center px-1 py-1 lg:py-0 flex-shrink-0">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: `${STEPS[idx].color}10` }}
                    animate={{
                      scale: activeStep > idx ? [1, 1.3, 1] : 1,
                      opacity: activeStep > idx ? [0.5, 1, 0.5] : 0.2,
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <motion.span
                    className="font-mono text-sm rotate-90 lg:rotate-0 relative z-10"
                    animate={{
                      color: activeStep > idx ? STEPS[idx].color : 'hsl(215, 14%, 27%)',
                      x: activeStep === idx + 1 ? [0, 3, 0] : 0,
                    }}
                    transition={{ duration: 0.8, repeat: activeStep === idx + 1 ? Infinity : 0 }}
                  >
                    →
                  </motion.span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {expanded !== null && (
        <motion.div
          className="mt-4 rounded-lg p-4 border text-xs text-derisk-text-secondary leading-relaxed"
          style={{ borderColor: `${STEPS[expanded - 1].color}40`, backgroundColor: `${STEPS[expanded - 1].color}08` }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <span className="font-mono font-bold" style={{ color: STEPS[expanded - 1].color }}>
            Step {expanded} — {STEPS[expanded - 1].title}:{' '}
          </span>
          {STEPS[expanded - 1].detail}
        </motion.div>
      )}

      <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-3">
        {[
          { label: 'Public HTTP', color: 'hsl(217, 91%, 60%)' },
          { label: 'On-chain Read', color: 'hsl(160, 84%, 39%)' },
          { label: 'Compute', color: 'hsl(25, 95%, 53%)' },
          { label: 'Confidential AI', color: 'hsl(271, 91%, 65%)' },
          { label: 'On-chain Write', color: 'hsl(0, 84%, 60%)' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
            <span className="text-[9px] font-mono text-muted-foreground">{l.label}</span>
          </div>
        ))}
        <div className="ml-auto text-[9px] font-mono text-derisk-text-dim">
          Evidence: <a href="docs/cre-workflow-log.txt" className="text-derisk-purple hover:text-derisk-purple/80" target="_blank" rel="noopener noreferrer">cre-workflow-log.txt</a>
        </div>
      </div>
    </section>
  )
}
