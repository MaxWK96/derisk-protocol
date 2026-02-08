interface RiskGaugeProps {
  score: number
  size?: number
}

export function RiskGauge({ score, size = 240 }: RiskGaugeProps) {
  const radius = (size - 24) / 2
  const circumference = Math.PI * radius
  const progress = (score / 100) * circumference

  const getColor = (s: number) => {
    if (s <= 20) return '#10b981'
    if (s <= 40) return '#f59e0b'
    if (s <= 60) return '#f97316'
    if (s <= 80) return '#ef4444'
    return '#dc2626'
  }

  const getLabel = (s: number) => {
    if (s <= 20) return 'LOW'
    if (s <= 40) return 'MODERATE'
    if (s <= 60) return 'ELEVATED'
    if (s <= 80) return 'HIGH'
    return 'CRITICAL'
  }

  const color = getColor(score)
  const center = size / 2

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 36} viewBox={`0 0 ${size} ${size / 2 + 36}`}>
        {/* Background arc */}
        <path
          d={`M 12 ${center} A ${radius} ${radius} 0 0 1 ${size - 12} ${center}`}
          fill="none"
          stroke="#1f2937"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M 12 ${center} A ${radius} ${radius} 0 0 1 ${size - 12} ${center}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease' }}
        />
        {/* Score number - monospaced */}
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          fill="#f4f5f7"
          fontSize="52"
          fontWeight="700"
          fontFamily="'IBM Plex Mono', monospace"
        >
          {score}
        </text>
        {/* Label */}
        <text
          x={center}
          y={center + 26}
          textAnchor="middle"
          fill={color}
          fontSize="12"
          fontWeight="600"
          letterSpacing="3"
          fontFamily="'IBM Plex Mono', monospace"
        >
          {getLabel(score)}
        </text>
      </svg>
    </div>
  )
}
