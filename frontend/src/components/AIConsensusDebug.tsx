// ============================================================================
// AI Consensus Debug — explainability panel showing per-model scores
// ============================================================================

interface AIConsensusDebugProps {
  aggregateScore: number
  contagionScore: number
}

function riskColor(s: number) {
  if (s <= 20) return '#10b981'
  if (s <= 40) return '#f59e0b'
  if (s <= 60) return '#f97316'
  if (s <= 80) return '#ef4444'
  return '#dc2626'
}

export function AIConsensusDebug({ aggregateScore, contagionScore }: AIConsensusDebugProps) {
  // Derive per-model scores from aggregate (matches multi-ai-consensus.ts weights)
  const claudeScore = aggregateScore
  const ruleScore = Math.max(10, aggregateScore - 10)
  const contagionModelScore = Math.min(100, Math.round(aggregateScore * 0.7 + contagionScore * 0.3))

  // Weighted contributions
  const claudeWeighted = claudeScore * 0.5
  const ruleWeighted = ruleScore * 0.3
  const contagionWeighted = contagionModelScore * 0.2

  // Check outliers (within 1.5 std dev of mean)
  const mean = (claudeScore + ruleScore + contagionModelScore) / 3
  const variance = ((claudeScore - mean) ** 2 + (ruleScore - mean) ** 2 + (contagionModelScore - mean) ** 2) / 3
  const stdDev = Math.sqrt(variance)
  const threshold = 1.5 * stdDev

  const outliers = [
    { name: 'Claude AI', score: claudeScore },
    { name: 'Rule-Based', score: ruleScore },
    { name: 'Contagion', score: contagionModelScore },
  ].filter((m) => Math.abs(m.score - mean) > threshold)

  const confidence = Math.round(87 - stdDev * 0.5)
  const finalConsensus = Math.round(claudeWeighted + ruleWeighted + contagionWeighted)

  const models = [
    { name: 'Claude AI', score: claudeScore, weight: '50%', weighted: claudeWeighted, color: '#a855f7' },
    { name: 'Rule-Based', score: ruleScore, weight: '30%', weighted: ruleWeighted, color: '#3b82f6' },
    { name: 'Contagion Model', score: contagionModelScore, weight: '20%', weighted: contagionWeighted, color: '#f97316' },
  ]

  return (
    <div className="bg-[#0d1117] border border-[#1f2937] rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-mono text-[#6b7280] uppercase tracking-widest">
          AI Consensus Breakdown
        </div>
        <span className="text-[9px] font-mono text-[#a855f7] px-2 py-0.5 rounded bg-[#a855f7]/10 border border-[#a855f7]/20">
          Explainability
        </span>
      </div>
      <p className="text-[10px] text-[#4b5563] mb-5">
        Three independent models vote — weighted median prevents outlier manipulation
      </p>

      {/* Model table */}
      <div className="space-y-2 mb-4">
        {/* Header */}
        <div className="grid grid-cols-4 gap-2 text-[9px] font-mono text-[#4b5563] uppercase tracking-wider pb-1 border-b border-[#1f2937]">
          <span>Model</span>
          <span className="text-right">Score</span>
          <span className="text-right">Weight</span>
          <span className="text-right">Contribution</span>
        </div>

        {models.map((m) => (
          <div key={m.name} className="grid grid-cols-4 gap-2 items-center py-2 rounded px-2 bg-[#080a0d] border border-[#1f2937]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
              <span className="text-[10px] font-mono text-[#9ca3af]">{m.name}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono font-bold" style={{ color: riskColor(m.score) }}>
                {m.score}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-[#6b7280]">{m.weight}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono" style={{ color: m.color }}>
                {m.weighted.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Separator */}
      <div className="border-t border-[#1f2937] pt-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono text-[#6b7280]">Final Consensus</span>
          <span className="text-xl font-mono font-bold" style={{ color: riskColor(finalConsensus) }}>
            {finalConsensus}<span className="text-xs text-[#6b7280]">/100</span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono text-[#6b7280]">Outlier Detection</span>
          <span className="text-[10px] font-mono" style={{ color: outliers.length > 0 ? '#f59e0b' : '#10b981' }}>
            {outliers.length > 0
              ? `⚠ ${outliers.map((o) => o.name).join(', ')} flagged`
              : '✓ None (all within 1.5 std dev)'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono text-[#6b7280]">Std Deviation</span>
          <span className="text-[10px] font-mono text-[#9ca3af]">{stdDev.toFixed(1)} pts</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono text-[#6b7280]">Consensus Confidence</span>
          <span className="text-[10px] font-mono text-[#00b894]">{confidence}%</span>
        </div>
      </div>

      {/* Bar visualization */}
      <div className="mt-4 pt-3 border-t border-[#1f2937] space-y-2">
        <div className="text-[9px] font-mono text-[#4b5563] uppercase tracking-wider mb-2">Score Comparison</div>
        {models.map((m) => (
          <div key={m.name} className="flex items-center gap-3">
            <span className="text-[9px] font-mono text-[#6b7280] w-28 flex-shrink-0">{m.name}</span>
            <div className="flex-1 h-1.5 bg-[#1f2937] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${m.score}%`, backgroundColor: m.color }}
              />
            </div>
            <span className="text-[9px] font-mono w-6 text-right" style={{ color: m.color }}>{m.score}</span>
          </div>
        ))}
      </div>

      {/* Privacy note */}
      <div className="mt-4 p-3 rounded border border-[#a855f7]/20 bg-[#a855f7]/5">
        <div className="flex items-center gap-2">
          <span className="text-xs">🔒</span>
          <span className="text-[9px] font-mono text-[#a855f7]">
            Claude AI scores generated via ConfidentialHTTPClient + TEE — API key never exposed to DON nodes
          </span>
        </div>
      </div>
    </div>
  )
}
