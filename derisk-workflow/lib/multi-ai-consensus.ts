/**
 * DeRisk Protocol - Multi-AI Consensus Scoring Engine
 *
 * Aggregates risk scores from multiple AI models to produce
 * a consensus score with confidence intervals. If one model
 * disagrees significantly, the system flags uncertainty.
 *
 * Models:
 * - Claude (Anthropic) - Primary, via API
 * - Rule-based fallback - Secondary, local computation
 * - Weighted ensemble - Tertiary, combines both with confidence
 *
 * Consensus Algorithm:
 * 1. Collect scores from all available sources
 * 2. Detect outliers (> 2 standard deviations)
 * 3. Compute weighted median (higher confidence = higher weight)
 * 4. Calculate agreement level and confidence interval
 */

// ============================================================================
// Types
// ============================================================================

export interface AIModelScore {
	model: string
	score: number      // 0-100
	confidence: number // 0-1 (how confident in this score)
	latencyMs: number
	available: boolean
}

export interface ConsensusResult {
	consensusScore: number      // Weighted median
	confidenceLevel: number     // 0-100: how much models agree
	scores: AIModelScore[]
	spread: number              // Max - min score
	outliers: string[]          // Models that disagree significantly
	method: string              // 'multi-ai' | 'single-model' | 'fallback-only'
}

// ============================================================================
// Consensus Algorithm
// ============================================================================

/**
 * Compute weighted median from a set of (score, weight) pairs
 */
function weightedMedian(pairs: { score: number; weight: number }[]): number {
	const sorted = [...pairs].sort((a, b) => a.score - b.score)
	const totalWeight = sorted.reduce((sum, p) => sum + p.weight, 0)
	let cumWeight = 0
	for (const pair of sorted) {
		cumWeight += pair.weight
		if (cumWeight >= totalWeight / 2) {
			return pair.score
		}
	}
	return sorted[sorted.length - 1].score
}

/**
 * Calculate standard deviation
 */
function standardDeviation(scores: number[]): number {
	if (scores.length <= 1) return 0
	const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length
	const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length
	return Math.sqrt(variance)
}

/**
 * Run the multi-AI consensus algorithm.
 *
 * Takes scores from multiple models and produces a consensus score
 * with confidence metrics.
 */
export function computeConsensus(modelScores: AIModelScore[]): ConsensusResult {
	const available = modelScores.filter((m) => m.available)

	if (available.length === 0) {
		return {
			consensusScore: 50, // Default to moderate risk
			confidenceLevel: 0,
			scores: modelScores,
			spread: 0,
			outliers: [],
			method: 'fallback-only',
		}
	}

	if (available.length === 1) {
		return {
			consensusScore: available[0].score,
			confidenceLevel: Math.round(available[0].confidence * 100),
			scores: modelScores,
			spread: 0,
			outliers: [],
			method: 'single-model',
		}
	}

	// Multi-model consensus
	const scores = available.map((m) => m.score)
	const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length
	const stdDev = standardDeviation(scores)
	const spread = Math.max(...scores) - Math.min(...scores)

	// Detect outliers (> 1.5 standard deviations from mean)
	const outliers: string[] = []
	for (const model of available) {
		if (stdDev > 0 && Math.abs(model.score - mean) > stdDev * 1.5) {
			outliers.push(model.model)
		}
	}

	// Compute weighted median (exclude outliers from weighting)
	const pairs = available
		.filter((m) => !outliers.includes(m.model))
		.map((m) => ({
			score: m.score,
			weight: m.confidence,
		}))

	// If all are outliers, use all scores with equal weight
	const consensusPairs = pairs.length > 0 ? pairs : available.map((m) => ({
		score: m.score,
		weight: 1,
	}))

	const consensusScore = weightedMedian(consensusPairs)

	// Calculate confidence level based on agreement
	// 100 = all models agree perfectly, 0 = maximum disagreement
	let confidenceLevel: number
	if (spread === 0) {
		confidenceLevel = 100
	} else if (spread <= 5) {
		confidenceLevel = 95 // Very high agreement
	} else if (spread <= 10) {
		confidenceLevel = 85 // High agreement
	} else if (spread <= 20) {
		confidenceLevel = 70 // Moderate agreement
	} else if (spread <= 30) {
		confidenceLevel = 50 // Low agreement
	} else {
		confidenceLevel = Math.max(20, 100 - spread * 2) // Very low agreement
	}

	// Penalize confidence for outliers
	confidenceLevel -= outliers.length * 10

	return {
		consensusScore: Math.round(consensusScore),
		confidenceLevel: Math.max(0, Math.min(100, confidenceLevel)),
		scores: modelScores,
		spread,
		outliers,
		method: 'multi-ai',
	}
}

/**
 * Build the rule-based model score (same logic as Chainlink Functions fallback)
 */
export function computeRuleBasedScore(
	aaveTvl: number,
	compoundTvl: number,
	makerTvl: number,
	ethPrice: number,
): AIModelScore {
	const start = Date.now()

	const scoreProtocol = (tvl: number, critical: number, warning: number, caution: number): number => {
		let score = 15
		if (tvl < critical) score += 40
		else if (tvl < warning) score += 20
		else if (tvl < caution) score += 10
		return Math.min(100, score)
	}

	let aaveScore = scoreProtocol(aaveTvl, 5e9, 15e9, 20e9)
	let compScore = scoreProtocol(compoundTvl, 500e6, 1e9, 2e9)
	let makerScore = scoreProtocol(makerTvl, 2e9, 4e9, 6e9)

	let ethAdj = 0
	if (ethPrice < 1000) ethAdj = 20
	else if (ethPrice < 1500) ethAdj = 10
	else if (ethPrice < 2000) ethAdj = 5

	aaveScore = Math.min(100, aaveScore + ethAdj)
	compScore = Math.min(100, compScore + ethAdj)
	makerScore = Math.min(100, makerScore + ethAdj)

	const aggregate = Math.round((aaveScore * 50 + compScore * 25 + makerScore * 25) / 100)

	return {
		model: 'Rule-Based (Functions)',
		score: Math.min(100, Math.max(0, aggregate)),
		confidence: 0.7, // Rule-based is reliable but less nuanced
		latencyMs: Date.now() - start,
		available: true,
	}
}

/**
 * Build a contagion-aware model score
 */
export function computeContagionAdjustedScore(
	baseScore: number,
	contagionRisk: number,
): AIModelScore {
	// Blend base score with contagion risk (30% contagion weight)
	const adjusted = Math.round(baseScore * 0.7 + contagionRisk * 0.3)

	return {
		model: 'Contagion-Adjusted',
		score: Math.min(100, Math.max(0, adjusted)),
		confidence: 0.6, // Derived model, moderate confidence
		latencyMs: 0,
		available: true,
	}
}

/**
 * Format consensus results for logging/display
 */
export function formatConsensusForLog(result: ConsensusResult): string[] {
	const lines: string[] = [
		`  Consensus Score:   ${result.consensusScore}/100`,
		`  Confidence Level:  ${result.confidenceLevel}%`,
		`  Method:            ${result.method}`,
		`  Score Spread:      ${result.spread} points`,
	]

	for (const model of result.scores) {
		const status = model.available ? `${model.score}/100` : 'UNAVAILABLE'
		const tag = result.outliers.includes(model.model) ? ' [OUTLIER]' : ''
		lines.push(`  ${model.model}: ${status}${tag}`)
	}

	return lines
}
