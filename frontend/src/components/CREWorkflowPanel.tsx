import { useState } from 'react'

// ============================================================================
// CRE Workflow Panel — visual 5-step pipeline orchestration diagram
// ============================================================================

interface Step {
  num: number
  icon: string
  title: string
  service: string
  source: string
  color: string
  borderColor: string
  detail: string
}

const STEPS: Step[] = [
  {
    num: 1,
    icon: '⬇',
    title: 'Fetch TVL',
    service: 'HTTPClient',
    source: 'DeFi Llama API',
    color: '#3b82f6',
    borderColor: '#1d4ed8',
    detail: 'Parallel HTTP GET to DeFi Llama for Aave V3, Compound V3, and MakerDAO TVL data. Returns USD-denominated totals updated every 15 minutes.',
  },
  {
    num: 2,
    icon: '⛓',
    title: 'Read ETH/USD',
    service: 'EVMClient',
    source: 'Chainlink Price Feed',
    color: '#10b981',
    borderColor: '#047857',
    detail: 'EVM read call to Chainlink ETH/USD Price Feed on Sepolia (0x694AA1769357215DE4FAC081bf1f309aDC325306). Returns 8-decimal answer from latest round.',
  },
  {
    num: 3,
    icon: '⚡',
    title: 'Contagion Sim',
    service: 'CRE Internal',
    source: 'Correlation Matrix',
    color: '#f97316',
    borderColor: '#c2410c',
    detail: 'Cascade simulation using empirical correlation matrix: Aave↔Compound 0.87, Aave↔Maker 0.72, Compound↔Maker 0.65. Computes worst-case TVL loss scenario.',
  },
  {
    num: 4,
    icon: '🤖',
    title: 'AI Consensus',
    service: 'ConfidentialHTTPClient',
    source: 'Anthropic Claude API (TEE)',
    color: '#a855f7',
    borderColor: '#7e22ce',
    detail: 'Confidential HTTP request to Anthropic Claude API inside a Trusted Execution Environment. API key stored in VaultDON — never exposed to DON nodes. 3-model weighted median (Claude 50%, Rule 30%, Contagion 20%).',
  },
  {
    num: 5,
    icon: '📝',
    title: 'Write On-Chain',
    service: 'writeReport()',
    source: 'DeRiskOracle.sol',
    color: '#ef4444',
    borderColor: '#b91c1c',
    detail: 'CRE calls writeReport() on DeRiskOracle (0xbC75...1f09). Emits RiskAssessmentUpdated event. Chainlink Automation monitors staleness — auto-escalates if no update after 10 minutes.',
  },
]

export function CREWorkflowPanel() {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <section className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest">
          CRE Workflow Orchestration
        </div>
        <span className="text-[9px] font-mono text-[#a855f7] px-2 py-0.5 rounded bg-[#a855f7]/10 border border-[#a855f7]/20">
          Chainlink Runtime Environment
        </span>
      </div>
      <p className="text-xs text-[#4b5563] mb-6">
        5-step automated pipeline — click any step to expand details
      </p>

      {/* Steps row */}
      <div className="flex flex-col lg:flex-row gap-0">
        {STEPS.map((step, idx) => (
          <div key={step.num} className="flex flex-col lg:flex-row items-center flex-1">
            {/* Step card */}
            <button
              className="w-full lg:flex-1 text-left rounded-lg border p-4 transition-all duration-200 cursor-pointer"
              style={{
                borderColor: expanded === step.num ? step.borderColor : '#1f2937',
                backgroundColor: expanded === step.num ? `${step.color}10` : '#080a0d',
              }}
              onClick={() => setExpanded(expanded === step.num ? null : step.num)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
                  style={{ backgroundColor: `${step.color}20`, color: step.color, border: `1px solid ${step.color}40` }}
                >
                  {step.num}
                </span>
                <span className="text-lg">{step.icon}</span>
              </div>
              <div className="text-xs font-mono font-bold text-[#f4f5f7] mb-1">{step.title}</div>
              <div
                className="text-[9px] font-mono font-semibold mb-0.5"
                style={{ color: step.color }}
              >
                {step.service}
              </div>
              <div className="text-[9px] font-mono text-[#6b7280]">{step.source}</div>
            </button>

            {/* Arrow connector (not after last) */}
            {idx < STEPS.length - 1 && (
              <div className="flex items-center justify-center px-2 py-1 lg:py-0 flex-shrink-0">
                <span className="text-[#374151] font-mono text-base rotate-90 lg:rotate-0">→</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Expanded detail */}
      {expanded !== null && (
        <div
          className="mt-4 rounded-lg p-4 border text-xs text-[#9ca3af] leading-relaxed transition-all"
          style={{
            borderColor: `${STEPS[expanded - 1].borderColor}40`,
            backgroundColor: `${STEPS[expanded - 1].color}08`,
          }}
        >
          <span
            className="font-mono font-bold"
            style={{ color: STEPS[expanded - 1].color }}
          >
            Step {expanded} — {STEPS[expanded - 1].title}:{' '}
          </span>
          {STEPS[expanded - 1].detail}
        </div>
      )}

      {/* Footer legend */}
      <div className="mt-5 pt-4 border-t border-[#1f2937] flex flex-wrap gap-3">
        {[
          { label: 'Public HTTP', color: '#3b82f6' },
          { label: 'On-chain Read', color: '#10b981' },
          { label: 'Compute', color: '#f97316' },
          { label: 'Confidential AI', color: '#a855f7' },
          { label: 'On-chain Write', color: '#ef4444' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: l.color }}
            />
            <span className="text-[9px] font-mono text-[#6b7280]">{l.label}</span>
          </div>
        ))}
        <div className="ml-auto text-[9px] font-mono text-[#4b5563]">
          Evidence: <a href="docs/cre-workflow-log.txt" className="text-[#a855f7] hover:text-[#c084fc]" target="_blank" rel="noopener noreferrer">cre-workflow-log.txt</a>
        </div>
      </div>
    </section>
  )
}
