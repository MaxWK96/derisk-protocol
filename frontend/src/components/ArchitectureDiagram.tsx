import { useState } from 'react'

interface Step {
  num: number
  title: string
  desc: string
  detail: string
  type: string
  service: string
}

const steps: Step[] = [
  {
    num: 1,
    title: 'Fetch TVL',
    desc: 'DeFi Llama API',
    detail: 'HTTP GET to DeFi Llama for real-time TVL of Aave V3, Compound V3, and MakerDAO. Monitors $33B+ across 3 protocols.',
    type: 'HTTP GET',
    service: 'Data Streams',
  },
  {
    num: 2,
    title: 'Price Feed',
    desc: 'Chainlink Oracle',
    detail: 'Reads live ETH/USD from Chainlink Price Feed on Sepolia via EVM Read. Heartbeat-driven updates.',
    type: 'EVM READ',
    service: 'Price Feeds',
  },
  {
    num: 3,
    title: 'Risk Analysis',
    desc: 'Contagion + Depeg',
    detail: 'Cross-protocol contagion cascade simulation (correlation matrix). Stablecoin depeg monitoring for USDT/USDC/DAI.',
    type: 'COMPUTE',
    service: 'CRE',
  },
  {
    num: 4,
    title: 'AI Scoring',
    desc: 'Multi-Model Consensus',
    detail: '3 independent models: Claude AI (50%), Rule-Based (30%), Contagion-Adjusted (20%). Weighted median consensus.',
    type: 'HTTP POST',
    service: 'Functions',
  },
  {
    num: 5,
    title: 'Write Chain',
    desc: 'DeRisk Oracle',
    detail: 'Writes consensus risk score + contagion data on-chain. Circuit breaker auto-triggers above score 80.',
    type: 'EVM WRITE',
    service: 'Automation',
  },
]

export function ArchitectureDiagram() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-mono text-[#9ca3af] uppercase tracking-widest">
          System Architecture
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[10px] font-mono text-[#6b7280]">LIVE ON SEPOLIA</span>
        </div>
      </div>
      <h2 className="text-xl font-bold text-[#f4f5f7] mb-5">CRE Workflow Pipeline</h2>

      {/* Pipeline */}
      <div className="flex items-stretch gap-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={`flex-1 rounded border p-4 transition-all cursor-default ${
                hovered === i
                  ? 'border-[#00b894]/50 bg-[#00b894]/5'
                  : 'border-[#1f2937] bg-[#080a0d] hover:border-[#374151]'
              }`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="text-[10px] font-mono text-[#00b894] uppercase tracking-wider mb-1.5">
                Step {step.num}
              </div>
              <div className="text-sm font-semibold text-[#f4f5f7] mb-0.5">{step.title}</div>
              <div className="text-[11px] text-[#6b7280] mb-2">{step.desc}</div>

              {/* Expand on hover */}
              <div className={`overflow-hidden transition-all duration-200 ${hovered === i ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="text-[11px] text-[#9ca3af] leading-relaxed border-t border-[#1f2937] pt-2 mt-1">
                  {step.detail}
                </div>
              </div>

              {/* Tags */}
              <div className="flex gap-1.5 mt-2">
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#1f2937] text-[#6b7280] uppercase tracking-wider">
                  {step.type}
                </span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#00b894]/10 text-[#00b894] uppercase tracking-wider">
                  {step.service}
                </span>
              </div>
            </div>

            {/* Arrow */}
            {i < steps.length - 1 && (
              <div className="text-[#374151] font-mono text-sm shrink-0">&rarr;</div>
            )}
          </div>
        ))}
      </div>

      {/* Services row */}
      <div className="grid grid-cols-5 gap-2 mt-5">
        {[
          { name: 'CRE', desc: 'Workflow Engine' },
          { name: 'Price Feeds', desc: 'ETH/USD Oracle' },
          { name: 'Data Streams', desc: 'DeFi Metrics' },
          { name: 'Automation', desc: 'Staleness Guard' },
          { name: 'Functions', desc: 'Fallback DON' },
        ].map((svc) => (
          <div key={svc.name} className="border border-[#1f2937] bg-[#080a0d] rounded p-2.5 text-center">
            <div className="text-[10px] font-mono font-bold text-[#00b894]">{svc.name}</div>
            <div className="text-[9px] font-mono text-[#6b7280]">{svc.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
