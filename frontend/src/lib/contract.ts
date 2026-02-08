import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || 'rDnyc363yJB4fPau3xTbg'
const RPC_URL = import.meta.env.VITE_SEPOLIA_RPC || `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`

export const DERISK_ORACLE_ADDRESS = (import.meta.env.VITE_DERISK_ORACLE_ADDRESS || '0xbC75cCB19bc37a87bB0500c016bD13E50c591f09') as `0x${string}`

export const DERISK_ORACLE_ABI = [
  {
    inputs: [],
    name: 'getRiskData',
    outputs: [
      { name: '_riskScore', type: 'uint256' },
      { name: '_circuitBreakerActive', type: 'bool' },
      { name: '_tvl', type: 'uint256' },
      { name: '_utilizationRate', type: 'uint256' },
      { name: '_ethPrice', type: 'uint256' },
      { name: '_lastUpdateTimestamp', type: 'uint256' },
      { name: '_updateCount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getProtocolScores',
    outputs: [
      { name: '_aave', type: 'uint256' },
      { name: '_compound', type: 'uint256' },
      { name: '_maker', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getProtocolTvls',
    outputs: [
      { name: '_aaveTvl', type: 'uint256' },
      { name: '_compoundTvl', type: 'uint256' },
      { name: '_makerTvl', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAggregateScore',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isStale',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'needsUpdate',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'timeSinceUpdate',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'bytes' }],
    name: 'checkUpkeep',
    outputs: [
      { name: 'upkeepNeeded', type: 'bool' },
      { name: 'performData', type: 'bytes' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getBacktestCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'backtestResults',
    outputs: [
      { name: 'eventName', type: 'string' },
      { name: 'alertLeadTimeHours', type: 'uint256' },
      { name: 'peakRiskScore', type: 'uint256' },
      { name: 'actualLossesUsd', type: 'uint256' },
      { name: 'preventedLossesUsd', type: 'uint256' },
      { name: 'effectivenessPercent', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getContagionData',
    outputs: [
      { name: '_contagionScore', type: 'uint256' },
      { name: '_worstCaseLoss', type: 'uint256' },
      { name: '_lastUpdated', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'riskScore',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'circuitBreakerActive',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'score', type: 'uint256' },
      { indexed: false, name: 'tvl', type: 'uint256' },
      { indexed: false, name: 'ethPrice', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'RiskScoreUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'score', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'CircuitBreakerTriggered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'score', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'CircuitBreakerReset',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'lastUpdate', type: 'uint256' },
      { indexed: false, name: 'currentTime', type: 'uint256' },
    ],
    name: 'StalenessAlert',
    type: 'event',
  },
] as const

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
})

export interface RiskData {
  riskScore: number
  circuitBreakerActive: boolean
  tvl: bigint
  utilizationRate: bigint
  ethPrice: bigint
  lastUpdateTimestamp: bigint
  updateCount: bigint
}

export async function fetchRiskData(): Promise<RiskData> {
  const data = await publicClient.readContract({
    address: DERISK_ORACLE_ADDRESS,
    abi: DERISK_ORACLE_ABI,
    functionName: 'getRiskData',
  })

  return {
    riskScore: Number(data[0]),
    circuitBreakerActive: data[1],
    tvl: data[2],
    utilizationRate: data[3],
    ethPrice: data[4],
    lastUpdateTimestamp: data[5],
    updateCount: data[6],
  }
}

export interface ProtocolScores {
  aave: number
  compound: number
  maker: number
}

export async function fetchProtocolScores(): Promise<ProtocolScores> {
  const data = await publicClient.readContract({
    address: DERISK_ORACLE_ADDRESS,
    abi: DERISK_ORACLE_ABI,
    functionName: 'getProtocolScores',
  })

  return {
    aave: Number(data[0]),
    compound: Number(data[1]),
    maker: Number(data[2]),
  }
}

export interface ProtocolTvls {
  aaveTvl: bigint
  compoundTvl: bigint
  makerTvl: bigint
}

export async function fetchProtocolTvls(): Promise<ProtocolTvls> {
  const data = await publicClient.readContract({
    address: DERISK_ORACLE_ADDRESS,
    abi: DERISK_ORACLE_ABI,
    functionName: 'getProtocolTvls',
  })

  return {
    aaveTvl: data[0],
    compoundTvl: data[1],
    makerTvl: data[2],
  }
}

export async function fetchAggregateScore(): Promise<number> {
  const data = await publicClient.readContract({
    address: DERISK_ORACLE_ADDRESS,
    abi: DERISK_ORACLE_ABI,
    functionName: 'getAggregateScore',
  })
  return Number(data)
}

export async function fetchIsStale(): Promise<boolean> {
  return publicClient.readContract({
    address: DERISK_ORACLE_ADDRESS,
    abi: DERISK_ORACLE_ABI,
    functionName: 'isStale',
  })
}

export interface ContagionData {
  contagionScore: number
  worstCaseLoss: bigint
  lastUpdated: bigint
}

export async function fetchContagionData(): Promise<ContagionData> {
  const data = await publicClient.readContract({
    address: DERISK_ORACLE_ADDRESS,
    abi: DERISK_ORACLE_ABI,
    functionName: 'getContagionData',
  })

  return {
    contagionScore: Number(data[0]),
    worstCaseLoss: data[1],
    lastUpdated: data[2],
  }
}

export interface BacktestProof {
  eventName: string
  alertLeadTimeHours: number
  peakRiskScore: number
  actualLossesUsd: bigint
  preventedLossesUsd: bigint
  effectivenessPercent: number
}

export async function fetchBacktestProofs(): Promise<BacktestProof[]> {
  const count = await publicClient.readContract({
    address: DERISK_ORACLE_ADDRESS,
    abi: DERISK_ORACLE_ABI,
    functionName: 'getBacktestCount',
  })

  const proofs: BacktestProof[] = []
  for (let i = 0; i < Number(count); i++) {
    const data = await publicClient.readContract({
      address: DERISK_ORACLE_ADDRESS,
      abi: DERISK_ORACLE_ABI,
      functionName: 'backtestResults',
      args: [BigInt(i)],
    })
    proofs.push({
      eventName: data[0],
      alertLeadTimeHours: Number(data[1]),
      peakRiskScore: Number(data[2]),
      actualLossesUsd: data[3],
      preventedLossesUsd: data[4],
      effectivenessPercent: Number(data[5]),
    })
  }
  return proofs
}

export interface RiskEvent {
  score: number
  tvl: bigint
  ethPrice: bigint
  timestamp: bigint
  txHash: string
  blockNumber: bigint
}

export async function fetchRiskEvents(): Promise<RiskEvent[]> {
  const currentBlock = await publicClient.getBlockNumber()
  const eventDef = {
    type: 'event' as const,
    name: 'RiskScoreUpdated' as const,
    inputs: [
      { indexed: true, name: 'score', type: 'uint256' as const },
      { indexed: false, name: 'tvl', type: 'uint256' as const },
      { indexed: false, name: 'ethPrice', type: 'uint256' as const },
      { indexed: false, name: 'timestamp', type: 'uint256' as const },
    ],
  }

  // Try progressively smaller block ranges (Alchemy free tier limits)
  const ranges = [2000n, 500n, 100n, 9n]
  for (const range of ranges) {
    try {
      const fromBlock = currentBlock > range ? currentBlock - range : 0n
      const logs = await publicClient.getLogs({
        address: DERISK_ORACLE_ADDRESS,
        event: eventDef,
        fromBlock,
        toBlock: currentBlock,
      })
      const events = logs.map((log) => {
        const args = log.args as { score?: bigint; tvl?: bigint; ethPrice?: bigint; timestamp?: bigint }
        return {
          score: Number(args.score || 0n),
          tvl: args.tvl || 0n,
          ethPrice: args.ethPrice || 0n,
          timestamp: args.timestamp || 0n,
          txHash: log.transactionHash || '',
          blockNumber: log.blockNumber || 0n,
        }
      })
      // Cache successful events in sessionStorage
      if (events.length > 0) {
        try {
          sessionStorage.setItem('derisk_events', JSON.stringify(events.map(e => ({
            ...e, tvl: e.tvl.toString(), ethPrice: e.ethPrice.toString(),
            timestamp: e.timestamp.toString(), blockNumber: e.blockNumber.toString(),
          }))))
        } catch { /* ignore */ }
      }
      return events
    } catch {
      continue
    }
  }
  // Fallback: try cached events from sessionStorage
  try {
    const cached = sessionStorage.getItem('derisk_events')
    if (cached) {
      const parsed = JSON.parse(cached) as Array<{
        score: number; tvl: string; ethPrice: string;
        timestamp: string; txHash: string; blockNumber: string;
      }>
      return parsed.map((e) => ({
        score: Number(e.score), tvl: BigInt(e.tvl), ethPrice: BigInt(e.ethPrice),
        timestamp: BigInt(e.timestamp), txHash: e.txHash, blockNumber: BigInt(e.blockNumber),
      }))
    }
  } catch { /* ignore */ }
  return []
}
