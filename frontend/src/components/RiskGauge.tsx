import { riskColor, riskLabel } from '../lib/risk-helpers'

interface RiskGaugeProps {
  score: number
  size?: number
}

export function RiskGauge({ score, size = 240 }: RiskGaugeProps) {
  const CIRC = 502
  const offset = CIRC - (score / 100) * CIRC

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <linearGradient id="gaugeGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(160, 84%, 39%)" />
            <stop offset="40%" stopColor="hsl(38, 92%, 50%)" />
            <stop offset="100%" stopColor="hsl(0, 84%, 60%)" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="80" fill="none" stroke="#1f2937" strokeWidth="16" />
        <circle
          cx="100" cy="100" r="80" fill="none"
          stroke="url(#gaugeGradMain)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-mono font-bold tabular-nums" style={{ color: riskColor(score) }}>
          {score}
        </div>
        <div className="text-xs text-muted-foreground font-mono">/ 100</div>
        <div
          className="mt-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded"
          style={{
            color: riskColor(score),
            backgroundColor: `${riskColor(score)}15`,
            border: `1px solid ${riskColor(score)}30`,
          }}
        >
          {riskLabel(score)}
        </div>
      </div>
    </div>
  )
}
