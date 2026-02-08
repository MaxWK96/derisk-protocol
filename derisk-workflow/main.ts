/**
 * DeRisk Protocol - AI-Powered DeFi Risk Oracle
 * Chainlink Convergence Hackathon 2026
 *
 * CRE Workflow that:
 * 1. Fetches Aave V3 metrics from DeFi Llama
 * 2. Reads ETH/USD price from Chainlink Price Feed
 * 3. Runs AI risk analysis via Anthropic Claude
 * 4. Writes risk score + circuit breaker state on-chain
 */

import {
	bytesToHex,
	ConsensusAggregationByFields,
	type CronPayload,
	handler,
	CronCapability,
	EVMClient,
	HTTPClient,
	type HTTPSendRequester,
	encodeCallMsg,
	getNetwork,
	hexToBase64,
	LAST_FINALIZED_BLOCK_NUMBER,
	median,
	Runner,
	type Runtime,
	TxStatus,
} from '@chainlink/cre-sdk'
import { type Address, decodeFunctionResult, encodeFunctionData, zeroAddress } from 'viem'
import { z } from 'zod'
import { ChainlinkPriceFeed, DeRiskOracle } from '../contracts/abi'
import { analyzeContagion, formatContagionForAI, type ProtocolMetrics, type ContagionAnalysis } from './lib/contagion-analyzer'
import { analyzeDepegRisk, formatDepegForAI, type DepegAnalysis } from './lib/depeg-monitor'
import { computeConsensus, computeRuleBasedScore, computeContagionAdjustedScore, formatConsensusForLog, type AIModelScore, type ConsensusResult } from './lib/multi-ai-consensus'

// ============================================================================
// Configuration
// ============================================================================

const configSchema = z.object({
	schedule: z.string(),
	anthropicApiKey: z.string(),
	defiLlamaUrl: z.string(),
	evms: z.array(
		z.object({
			oracleAddress: z.string(),
			priceFeedAddress: z.string(),
			chainSelectorName: z.string(),
			gasLimit: z.string(),
		}),
	),
})

type Config = z.infer<typeof configSchema>

// ============================================================================
// Types
// ============================================================================

interface DeFiMetrics {
	aaveTvl: number
	compoundTvl: number
	makerTvl: number
	totalTvl: number
}

interface RiskResult {
	riskScore: number
	source: number // 1 = Claude AI, 2 = Chainlink Functions fallback
}

// ============================================================================
// Utilities
// ============================================================================

const safeJsonStringify = (obj: any): string =>
	JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2)

const getRiskLevel = (score: number): string => {
	if (score <= 20) return 'LOW'
	if (score <= 40) return 'MODERATE'
	if (score <= 60) return 'ELEVATED'
	if (score <= 80) return 'HIGH'
	return 'CRITICAL'
}

// ============================================================================
// Step 1: Fetch DeFi Protocol Metrics from DeFi Llama
// Uses lightweight /tvl/ endpoint (CRE HTTP buffer is limited)
// ============================================================================

const fetchDeFiMetrics = (sendRequester: HTTPSendRequester, config: Config): DeFiMetrics => {
	// Fetch TVL for 3 major DeFi protocols via DeFi Llama (each returns a single number)
	const aaveResp = sendRequester.sendRequest({ method: 'GET', url: 'https://api.llama.fi/tvl/aave-v3' }).result()
	const compoundResp = sendRequester.sendRequest({ method: 'GET', url: 'https://api.llama.fi/tvl/compound-v3' }).result()
	const makerResp = sendRequester.sendRequest({ method: 'GET', url: 'https://api.llama.fi/tvl/makerdao' }).result()

	const aaveTvl = aaveResp.statusCode === 200 ? parseFloat(Buffer.from(aaveResp.body).toString('utf-8')) : 0
	const compoundTvl = compoundResp.statusCode === 200 ? parseFloat(Buffer.from(compoundResp.body).toString('utf-8')) : 0
	const makerTvl = makerResp.statusCode === 200 ? parseFloat(Buffer.from(makerResp.body).toString('utf-8')) : 0

	return {
		aaveTvl,
		compoundTvl,
		makerTvl,
		totalTvl: aaveTvl + compoundTvl + makerTvl,
	}
}

// ============================================================================
// Step 2: Read Chainlink ETH/USD Price Feed (On-Chain)
// ============================================================================

const readEthPrice = (runtime: Runtime<Config>): bigint => {
	const evmConfig = runtime.config.evms[0]
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found: ${evmConfig.chainSelectorName}`)
	}

	const evmClient = new EVMClient(network.chainSelector.selector)

	const callData = encodeFunctionData({
		abi: ChainlinkPriceFeed,
		functionName: 'latestRoundData',
	})

	const contractCall = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({
				from: zeroAddress,
				to: evmConfig.priceFeedAddress as Address,
				data: callData,
			}),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()

	const result = decodeFunctionResult({
		abi: ChainlinkPriceFeed,
		functionName: 'latestRoundData',
		data: bytesToHex(contractCall.data),
	})

	// result = [roundId, answer, startedAt, updatedAt, answeredInRound]
	return result[1] // answer = ETH price with 8 decimals
}

// ============================================================================
// Step 3: AI Risk Analysis via Anthropic Claude
// ============================================================================

const fetchAIRiskScore = (
	sendRequester: HTTPSendRequester,
	params: {
		config: Config
		aaveTvl: number
		compoundTvl: number
		makerTvl: number
		totalTvl: number
		ethPrice: string
		contagionData: string
		depegData: string
	},
): RiskResult => {
	const { config, aaveTvl, compoundTvl, makerTvl, totalTvl, ethPrice, contagionData, depegData } = params

	const prompt = `You are a DeFi risk analysis AI for the DeRisk Protocol oracle. Analyze these multi-protocol metrics and return an aggregate risk score.

MONITORED PROTOCOLS:
1. Aave V3 (Lending) - TVL: $${(aaveTvl / 1e9).toFixed(2)}B
2. Compound V3 (Lending) - TVL: $${(compoundTvl / 1e9).toFixed(2)}B
3. MakerDAO (CDP/Stablecoin) - TVL: $${(makerTvl / 1e9).toFixed(2)}B

AGGREGATE:
- Combined TVL: $${(totalTvl / 1e9).toFixed(2)}B
- ETH/USD Price: $${ethPrice}

${contagionData}

${depegData}

RISK SCORING RUBRIC:
0-20 (LOW): All protocols stable, healthy TVL, normal ETH price
21-40 (MODERATE): Minor fluctuations across protocols
41-60 (ELEVATED): One protocol showing stress, TVL declining
61-80 (HIGH): Multiple protocols stressed, significant TVL outflows
81-100 (CRITICAL): Systemic risk, circuit breaker threshold

KEY RISK FACTORS:
1. Individual protocol TVL health
2. Cross-protocol contagion risk (shared collateral, cascading liquidations)
3. ETH price impact on all lending protocols simultaneously
4. Concentration risk if one protocol dominates TVL
5. Systemic cascade potential (use contagion analysis above)
6. Stablecoin peg stability (depeg amplifies all risk factors)

Respond with ONLY valid JSON, no markdown, no explanation:
{"riskScore": <integer 0-100>}`

	const requestBody = JSON.stringify({
		model: 'claude-sonnet-4-5-20250929',
		max_tokens: 32,
		messages: [{ role: 'user', content: prompt }],
	})

	// CRE HTTP body must be base64-encoded (protobuf bytes field)
	const bodyBase64 = Buffer.from(requestBody).toString('base64')

	const response = sendRequester
		.sendRequest({
			method: 'POST',
			url: 'https://api.anthropic.com/v1/messages',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': config.anthropicApiKey,
				'anthropic-version': '2023-06-01',
			},
			body: bodyBase64,
		})
		.result()

	if (response.statusCode !== 200) {
		// Chainlink Functions-compatible fallback scoring
		// Same logic as chainlink-functions-source.js
		const ethPriceNum = parseFloat(ethPrice)

		const scoreProtocol = (protocolTvl: number, critical: number, warning: number, caution: number): number => {
			let score = 15
			if (protocolTvl < critical) score += 40
			else if (protocolTvl < warning) score += 20
			else if (protocolTvl < caution) score += 10
			return Math.min(100, score)
		}

		let aaveScore = scoreProtocol(aaveTvl, 5e9, 15e9, 20e9)
		let compScore = scoreProtocol(compoundTvl, 500e6, 1e9, 2e9)
		let makerScore = scoreProtocol(makerTvl, 2e9, 4e9, 6e9)

		// ETH price impact
		let ethAdj = 0
		if (ethPriceNum < 1000) ethAdj = 20
		else if (ethPriceNum < 1500) ethAdj = 10
		else if (ethPriceNum < 2000) ethAdj = 5

		aaveScore = Math.min(100, aaveScore + ethAdj)
		compScore = Math.min(100, compScore + ethAdj)
		makerScore = Math.min(100, makerScore + ethAdj)

		// Weighted aggregate (Aave 50%, Compound 25%, Maker 25%)
		const fallbackScore = Math.round((aaveScore * 50 + compScore * 25 + makerScore * 25) / 100)

		return {
			riskScore: Math.min(100, Math.max(0, fallbackScore)),
			source: 2, // Chainlink Functions fallback
		}
	}

	const apiResponse = JSON.parse(Buffer.from(response.body).toString('utf-8'))
	let textContent = apiResponse.content?.[0]?.text || '{"riskScore": 50}'

	// Strip markdown code blocks if Claude wrapped the JSON
	textContent = textContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

	// Parse Claude's JSON response
	const riskData = JSON.parse(textContent)

	return {
		riskScore: Math.min(100, Math.max(0, Math.round(riskData.riskScore ?? 50))),
		source: 1, // Anthropic Claude AI
	}
}

// ============================================================================
// Step 4: Write Risk Score On-Chain via CRE Report
// ============================================================================

const writeRiskScore = (
	runtime: Runtime<Config>,
	riskScore: number,
	tvl: bigint,
	utilizationRate: bigint,
	ethPrice: bigint,
): string => {
	const evmConfig = runtime.config.evms[0]
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		throw new Error(`Network not found: ${evmConfig.chainSelectorName}`)
	}

	const evmClient = new EVMClient(network.chainSelector.selector)

	// Encode the updateRiskData function call
	const callData = encodeFunctionData({
		abi: DeRiskOracle,
		functionName: 'updateRiskData',
		args: [BigInt(riskScore), tvl, utilizationRate, ethPrice],
	})

	runtime.log(
		`Encoding: score=${riskScore}, tvl=${tvl}, utilization=${utilizationRate}, ethPrice=${ethPrice}`,
	)

	// Generate signed consensus report
	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(callData),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

	// Write report to DeRiskOracle receiver contract
	const resp = evmClient
		.writeReport(runtime, {
			receiver: evmConfig.oracleAddress,
			report: reportResponse,
			gasConfig: {
				gasLimit: evmConfig.gasLimit,
			},
		})
		.result()

	if (resp.txStatus !== TxStatus.SUCCESS) {
		throw new Error(`Write failed: ${resp.errorMessage || resp.txStatus}`)
	}

	const txHash = bytesToHex(resp.txHash || new Uint8Array(32))
	runtime.log(`On-chain write successful. TxHash: ${txHash}`)

	return txHash
}

// ============================================================================
// Step 4b: Write Contagion Score On-Chain
// ============================================================================

const writeContagionScore = (
	runtime: Runtime<Config>,
	contagionScore: number,
	worstCaseLoss: number,
): void => {
	const evmConfig = runtime.config.evms[0]
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})

	if (!network) {
		runtime.log('  Warning: Could not write contagion score - network not found')
		return
	}

	const evmClient = new EVMClient(network.chainSelector.selector)

	const callData = encodeFunctionData({
		abi: DeRiskOracle,
		functionName: 'updateContagionScore',
		args: [BigInt(contagionScore), BigInt(Math.floor(worstCaseLoss))],
	})

	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(callData),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

	const resp = evmClient
		.writeReport(runtime, {
			receiver: evmConfig.oracleAddress,
			report: reportResponse,
			gasConfig: {
				gasLimit: evmConfig.gasLimit,
			},
		})
		.result()

	if (resp.txStatus === TxStatus.SUCCESS) {
		const txHash = bytesToHex(resp.txHash || new Uint8Array(32))
		runtime.log(`  Contagion score written. TxHash: ${txHash}`)
	} else {
		runtime.log(`  Warning: Contagion write failed: ${resp.errorMessage || resp.txStatus}`)
	}
}

// ============================================================================
// Main Risk Assessment Pipeline
// ============================================================================

const assessRisk = (runtime: Runtime<Config>): string => {
	runtime.log('================================================')
	runtime.log('  DeRisk Protocol - AI-Powered Risk Assessment  ')
	runtime.log('  Chainlink Convergence Hackathon 2026          ')
	runtime.log('================================================')

	const httpClient = new HTTPClient()

	// ---- Step 1: Fetch Multi-Protocol DeFi Metrics ----
	runtime.log('')
	runtime.log('[1/5] Fetching multi-protocol TVL from DeFi Llama...')

	const metrics = httpClient
		.sendRequest(
			runtime,
			fetchDeFiMetrics,
			ConsensusAggregationByFields<DeFiMetrics>({
				aaveTvl: median,
				compoundTvl: median,
				makerTvl: median,
				totalTvl: median,
			}),
		)(runtime.config)
		.result()

	runtime.log(`  Aave V3:     $${(metrics.aaveTvl / 1e9).toFixed(2)}B`)
	runtime.log(`  Compound V3: $${(metrics.compoundTvl / 1e9).toFixed(2)}B`)
	runtime.log(`  MakerDAO:    $${(metrics.makerTvl / 1e9).toFixed(2)}B`)
	runtime.log(`  Total TVL:   $${(metrics.totalTvl / 1e9).toFixed(2)}B`)

	// ---- Step 2: Read Chainlink Price Feed ----
	runtime.log('')
	runtime.log('[2/5] Reading Chainlink ETH/USD price feed on Sepolia...')

	const ethPriceRaw = readEthPrice(runtime)
	const ethPriceUSD = Number(ethPriceRaw) / 1e8
	runtime.log(`  ETH/USD: $${ethPriceUSD.toFixed(2)}`)

	// ---- Step 3: Cross-Protocol Contagion Analysis ----
	runtime.log('')
	runtime.log('[3/5] Running cross-protocol contagion analysis...')

	const protocolMetrics: ProtocolMetrics[] = [
		{ name: 'Aave V3', tvl: metrics.aaveTvl, riskScore: 0 },
		{ name: 'Compound V3', tvl: metrics.compoundTvl, riskScore: 0 },
		{ name: 'MakerDAO', tvl: metrics.makerTvl, riskScore: 0 },
	]
	const contagionAnalysis = analyzeContagion(protocolMetrics)
	const contagionPromptData = formatContagionForAI(contagionAnalysis)

	runtime.log(`  Contagion Risk:    ${contagionAnalysis.aggregateContagionRisk}/100`)
	runtime.log(`  Worst-Case Loss:   $${(contagionAnalysis.worstCaseSystemLoss / 1e9).toFixed(2)}B`)
	runtime.log(`  Scenarios Tested:  ${contagionAnalysis.scenarios.length}`)
	for (const [protocol, loss] of Object.entries(contagionAnalysis.blastRadius)) {
		runtime.log(`  Blast Radius (${protocol}): $${(loss / 1e9).toFixed(2)}B`)
	}

	// ---- Step 3b: Stablecoin Depeg Early Warning ----
	runtime.log('')
	runtime.log('  Running stablecoin depeg analysis...')

	const depegAnalysis = analyzeDepegRisk(
		ethPriceUSD,
		metrics.aaveTvl,
		metrics.compoundTvl,
		metrics.makerTvl,
	)
	const depegPromptData = formatDepegForAI(depegAnalysis)

	runtime.log(`  Depeg Risk Score:  ${depegAnalysis.depegRiskScore}/100`)
	runtime.log(`  Avg Deviation:     ${(depegAnalysis.avgDeviation * 100).toFixed(2)}%`)
	for (const coin of depegAnalysis.stablecoins) {
		const status = Math.abs(coin.price - 1.0) < 0.005 ? 'STABLE' : 'WATCH'
		runtime.log(`  ${coin.symbol}: $${coin.price.toFixed(4)} (${status})`)
	}
	if (depegAnalysis.alerts.length > 0) {
		for (const alert of depegAnalysis.alerts) {
			runtime.log(`  >>> ALERT [${alert.severity}]: ${alert.symbol} ${alert.deviationPercent}% off peg <<<`)
		}
	}

	// ---- Step 4: AI Risk Analysis (enriched with contagion + depeg data) ----
	runtime.log('')
	runtime.log('[4/5] Running AI risk analysis via Anthropic Claude...')
	runtime.log('  (Prompt enriched with contagion analysis)')

	const riskResult = httpClient
		.sendRequest(
			runtime,
			fetchAIRiskScore,
			ConsensusAggregationByFields<RiskResult>({
				riskScore: median,
				source: median,
			}),
		)({
			config: runtime.config,
			aaveTvl: metrics.aaveTvl,
			compoundTvl: metrics.compoundTvl,
			makerTvl: metrics.makerTvl,
			totalTvl: metrics.totalTvl,
			ethPrice: ethPriceUSD.toFixed(2),
			contagionData: contagionPromptData,
			depegData: depegPromptData,
		})
		.result()

	const scoringMethod = riskResult.source === 1 ? 'Anthropic Claude AI' : 'Chainlink Functions (fallback)'
	runtime.log(`  Claude Score: ${riskResult.riskScore}/100`)
	runtime.log(`  Scored By:    ${scoringMethod}`)

	// ---- Step 4b: Multi-AI Consensus ----
	runtime.log('')
	runtime.log('  Computing multi-AI consensus...')

	// Model 1: Claude AI (already computed above)
	const claudeModelScore: AIModelScore = {
		model: 'Claude (Anthropic)',
		score: riskResult.riskScore,
		confidence: riskResult.source === 1 ? 0.95 : 0.7,
		latencyMs: 0,
		available: true,
	}

	// Model 2: Rule-based scoring (same as Chainlink Functions)
	const ruleBasedScore = computeRuleBasedScore(
		metrics.aaveTvl, metrics.compoundTvl, metrics.makerTvl, ethPriceUSD,
	)

	// Model 3: Contagion-adjusted ensemble
	const contagionAdjustedScore = computeContagionAdjustedScore(
		riskResult.riskScore, contagionAnalysis.aggregateContagionRisk,
	)

	const consensus = computeConsensus([claudeModelScore, ruleBasedScore, contagionAdjustedScore])
	const consensusLogLines = formatConsensusForLog(consensus)
	for (const line of consensusLogLines) {
		runtime.log(line)
	}

	// Use consensus score as the final score
	const finalScore = consensus.consensusScore
	const riskLevel = getRiskLevel(finalScore)
	runtime.log(`  Final Score:       ${finalScore}/100 (${riskLevel})`)

	if (finalScore > 80) {
		runtime.log('  >>> CIRCUIT BREAKER TRIGGERED <<<')
		runtime.log('  Risk exceeds safety threshold. Emergency pause recommended.')
	}

	// ---- Step 5: Write On-Chain ----
	runtime.log('')
	runtime.log('[5/5] Writing risk assessment to DeRiskOracle contract...')

	const tvlScaled = BigInt(Math.floor(metrics.totalTvl))
	const utilizationScaled = BigInt(3) // Number of protocols monitored

	const txHash = writeRiskScore(
		runtime,
		finalScore,
		tvlScaled,
		utilizationScaled,
		ethPriceRaw,
	)

	// Also write contagion score on-chain
	runtime.log('  Writing contagion score on-chain...')
	writeContagionScore(
		runtime,
		contagionAnalysis.aggregateContagionRisk,
		contagionAnalysis.worstCaseSystemLoss,
	)

	// ---- Summary ----
	runtime.log('')
	runtime.log('================================================')
	runtime.log('  RISK ASSESSMENT COMPLETE')
	runtime.log(`  Consensus Score: ${finalScore}/100 (${riskLevel})`)
	runtime.log(`  Confidence:      ${consensus.confidenceLevel}%`)
	runtime.log(`  Contagion Risk:  ${contagionAnalysis.aggregateContagionRisk}/100`)
	runtime.log(`  Depeg Risk:      ${depegAnalysis.depegRiskScore}/100`)
	runtime.log(`  AI Models:       ${consensus.scores.length} (spread: ${consensus.spread} pts)`)
	runtime.log(`  Circuit Breaker: ${finalScore > 80 ? 'ACTIVE' : 'INACTIVE'}`)
	runtime.log(`  TxHash:          ${txHash}`)
	runtime.log('================================================')

	return `${finalScore}|${riskLevel}`
}

// ============================================================================
// Trigger Handler
// ============================================================================

const onCronTrigger = (runtime: Runtime<Config>, payload: CronPayload): string => {
	if (!payload.scheduledExecutionTime) {
		throw new Error('Scheduled execution time is required')
	}

	runtime.log(`Cron triggered at: ${new Date().toISOString()}`)
	return assessRisk(runtime)
}

// ============================================================================
// Workflow Initialization
// ============================================================================

const initWorkflow = (config: Config) => {
	const cronTrigger = new CronCapability()

	return [
		handler(
			cronTrigger.trigger({
				schedule: config.schedule,
			}),
			onCronTrigger,
		),
	]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({
		configSchema,
	})
	await runner.run(initWorkflow)
}
