/**
 * DeRisk Protocol - Stablecoin Depeg Early Warning System
 *
 * Monitors major stablecoins for deviation from their $1.00 peg.
 * Fetches live prices from CoinGecko API via CRE HTTPClient.
 *
 * Historical depeg events modeled:
 * - UST collapse (May 2022): gradual then catastrophic depeg
 * - USDC depeg (Mar 2023): dropped to $0.87 during SVB crisis
 * - DAI instability: tracks MakerDAO collateral health
 */

import type { HTTPSendRequester } from '@chainlink/cre-sdk'

// ============================================================================
// Types
// ============================================================================

export interface StablecoinPrice {
	symbol: string
	price: number // Current price (should be ~1.00)
	mechanism: string // 'algorithmic' | 'fiat-backed' | 'crypto-backed'
}

// Raw prices fetched from CoinGecko — used with ConsensusAggregationByFields
export interface StablecoinPricesRaw {
	usdtPrice: number
	usdcPrice: number
	daiPrice: number
}

export interface DepegAlert {
	symbol: string
	currentPrice: number
	deviationPercent: number // How far from $1.00 (absolute)
	severity: 'WATCH' | 'WARNING' | 'CRITICAL'
	mechanism: string
	riskFactor: string // Why this matters
}

export interface DepegAnalysis {
	stablecoins: StablecoinPrice[]
	alerts: DepegAlert[]
	depegRiskScore: number // 0-100
	worstDepeg: string // Which stablecoin is most depegged
	avgDeviation: number // Average deviation from peg
}

// ============================================================================
// Thresholds
// ============================================================================

// Deviation thresholds (from $1.00) for each severity level
const WATCH_THRESHOLD = 0.005 // 0.5% - minor deviation
const WARNING_THRESHOLD = 0.02 // 2.0% - concerning deviation
const CRITICAL_THRESHOLD = 0.05 // 5.0% - emergency depeg

// Risk multipliers by mechanism type
// Algorithmic stablecoins are highest risk (see UST)
const MECHANISM_RISK: Record<string, number> = {
	'algorithmic': 2.0,
	'crypto-backed': 1.5,
	'fiat-backed': 1.0,
}

// Stablecoin metadata
const STABLECOIN_CONFIG: Record<string, { mechanism: string; riskFactor: string }> = {
	USDT: {
		mechanism: 'fiat-backed',
		riskFactor: 'Largest stablecoin by market cap. Reserve transparency concerns. Depeg would cascade across all DeFi.',
	},
	USDC: {
		mechanism: 'fiat-backed',
		riskFactor: 'Primary DeFi collateral. SVB exposure caused $0.87 depeg in Mar 2023. Affects Aave and Compound.',
	},
	DAI: {
		mechanism: 'crypto-backed',
		riskFactor: 'MakerDAO CDP-backed. Depends on ETH collateral health. Liquidation cascades during ETH crashes.',
	},
}

// ============================================================================
// CoinGecko Fetch — used as HTTPClient.sendRequest handler
// ============================================================================

// CoinGecko free API — no key required
// Returns: {"tether":{"usd":1.001},"usd-coin":{"usd":0.9999},"dai":{"usd":0.9998}}
const COINGECKO_URL =
	'https://api.coingecko.com/api/v3/simple/price?ids=tether,usd-coin,dai&vs_currencies=usd'

/**
 * Fetch live stablecoin prices from CoinGecko.
 *
 * Designed to run as a CRE HTTPClient.sendRequest handler so that
 * prices are fetched across all CRE nodes and aggregated via median.
 *
 * Falls back to 1.0 for any price that fails to parse, so the
 * pipeline never hard-crashes on a CoinGecko outage.
 */
export const fetchRawStablecoinPrices = (
	sendRequester: HTTPSendRequester,
): StablecoinPricesRaw => {
	const response = sendRequester
		.sendRequest({ method: 'GET', url: COINGECKO_URL })
		.result()

	if (response.statusCode !== 200) {
		return { usdtPrice: 1.0, usdcPrice: 1.0, daiPrice: 1.0 }
	}

	const body = JSON.parse(Buffer.from(response.body).toString('utf-8'))

	return {
		usdtPrice: body['tether']?.['usd'] ?? 1.0,
		usdcPrice: body['usd-coin']?.['usd'] ?? 1.0,
		daiPrice: body['dai']?.['usd'] ?? 1.0,
	}
}

// ============================================================================
// Analysis Engine
// ============================================================================

/**
 * Analyze stablecoin depeg risk from live CoinGecko prices.
 *
 * @param prices - Raw prices fetched via fetchRawStablecoinPrices and
 *                 aggregated by ConsensusAggregationByFields in main.ts
 */
export function analyzeDepegRisk(prices: StablecoinPricesRaw): DepegAnalysis {
	const stablecoins: StablecoinPrice[] = [
		{ symbol: 'USDT', price: prices.usdtPrice, mechanism: 'fiat-backed' },
		{ symbol: 'USDC', price: prices.usdcPrice, mechanism: 'fiat-backed' },
		{ symbol: 'DAI',  price: prices.daiPrice,  mechanism: 'crypto-backed' },
	]

	const alerts: DepegAlert[] = []

	for (const coin of stablecoins) {
		const deviation = Math.abs(coin.price - 1.0)
		const deviationPercent = deviation * 100

		if (deviation >= WATCH_THRESHOLD) {
			const config = STABLECOIN_CONFIG[coin.symbol]
			let severity: DepegAlert['severity'] = 'WATCH'
			if (deviation >= CRITICAL_THRESHOLD) severity = 'CRITICAL'
			else if (deviation >= WARNING_THRESHOLD) severity = 'WARNING'

			alerts.push({
				symbol: coin.symbol,
				currentPrice: coin.price,
				deviationPercent: Math.round(deviationPercent * 100) / 100,
				severity,
				mechanism: coin.mechanism,
				riskFactor: config?.riskFactor || 'Stablecoin peg deviation detected',
			})
		}
	}

	// Sort alerts by severity (CRITICAL first)
	const severityOrder = { CRITICAL: 0, WARNING: 1, WATCH: 2 }
	alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

	// Calculate aggregate depeg risk score
	let depegRiskScore = 0
	for (const coin of stablecoins) {
		const deviation = Math.abs(coin.price - 1.0)
		const mechanismMultiplier = MECHANISM_RISK[coin.mechanism] || 1.0
		depegRiskScore += deviation * 100 * mechanismMultiplier * 10
	}
	depegRiskScore = Math.min(100, Math.round(depegRiskScore))

	// Find worst depeg
	const worstCoin = stablecoins.reduce((worst, coin) =>
		Math.abs(coin.price - 1.0) > Math.abs(worst.price - 1.0) ? coin : worst,
		stablecoins[0],
	)

	const avgDeviation =
		stablecoins.reduce((sum, coin) => sum + Math.abs(coin.price - 1.0), 0) /
		stablecoins.length

	return {
		stablecoins,
		alerts,
		depegRiskScore,
		worstDepeg: worstCoin.symbol,
		avgDeviation: Math.round(avgDeviation * 10000) / 10000,
	}
}

/**
 * Format depeg analysis for Claude AI prompt enrichment
 */
export function formatDepegForAI(analysis: DepegAnalysis): string {
	const lines: string[] = [
		'STABLECOIN DEPEG ANALYSIS:',
		`Depeg Risk Score: ${analysis.depegRiskScore}/100`,
		`Average Deviation: ${(analysis.avgDeviation * 100).toFixed(2)}%`,
		'',
		'Stablecoin Status:',
	]

	for (const coin of analysis.stablecoins) {
		const deviation = Math.abs(coin.price - 1.0) * 100
		const status = deviation < 0.5 ? 'STABLE' : deviation < 2 ? 'WATCH' : 'DEPEGGING'
		lines.push(`  ${coin.symbol}: $${coin.price.toFixed(4)} (${status}, ${deviation.toFixed(2)}% deviation)`)
	}

	if (analysis.alerts.length > 0) {
		lines.push('')
		lines.push('ACTIVE ALERTS:')
		for (const alert of analysis.alerts) {
			lines.push(`  [${alert.severity}] ${alert.symbol}: ${alert.deviationPercent}% off peg - ${alert.riskFactor}`)
		}
	}

	lines.push('')
	lines.push('Consider stablecoin stability when assessing overall DeFi risk.')

	return lines.join('\n')
}
