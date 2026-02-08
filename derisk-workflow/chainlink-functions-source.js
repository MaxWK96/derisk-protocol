/**
 * DeRisk Protocol - Chainlink Functions Fallback Risk Scoring
 *
 * Runs on the Chainlink Decentralized Oracle Network (DON)
 * as a fallback when the primary Anthropic Claude AI is unavailable.
 *
 * Inputs (args[]):
 *   args[0] - Aave V3 TVL in USD (string)
 *   args[1] - Compound V3 TVL in USD (string)
 *   args[2] - MakerDAO TVL in USD (string)
 *   args[3] - ETH/USD price (string)
 *
 * Returns: uint256 aggregate risk score (0-100)
 */

const aaveTvl = parseFloat(args[0] || "0")
const compoundTvl = parseFloat(args[1] || "0")
const makerTvl = parseFloat(args[2] || "0")
const ethPrice = parseFloat(args[3] || "0")
const totalTvl = aaveTvl + compoundTvl + makerTvl

function scoreProtocol(tvl, critical, warning, caution) {
  let score = 15
  if (tvl < critical) score += 40
  else if (tvl < warning) score += 20
  else if (tvl < caution) score += 10

  if (totalTvl > 0) {
    const share = tvl / totalTvl
    if (share > 0.8) score += 10
    if (share < 0.05) score += 5
  }

  return Math.min(100, Math.max(0, score))
}

// Protocol-specific TVL thresholds
let aaveScore = scoreProtocol(aaveTvl, 5e9, 15e9, 20e9)
let compoundScore = scoreProtocol(compoundTvl, 500e6, 1e9, 2e9)
let makerScore = scoreProtocol(makerTvl, 2e9, 4e9, 6e9)

// ETH price risk adjustment
let ethAdj = 0
if (ethPrice < 1000) ethAdj = 20
else if (ethPrice < 1500) ethAdj = 10
else if (ethPrice < 2000) ethAdj = 5

aaveScore = Math.min(100, aaveScore + ethAdj)
compoundScore = Math.min(100, compoundScore + ethAdj)
makerScore = Math.min(100, makerScore + ethAdj)

// Weighted aggregate (Aave 50%, Compound 25%, Maker 25%)
const aggregate = Math.round(
  (aaveScore * 50 + compoundScore * 25 + makerScore * 25) / 100
)

return Functions.encodeUint256(aggregate)
