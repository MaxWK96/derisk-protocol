/**
 * DeRisk Protocol - Contract Deployment Script
 *
 * OPTION 1 (Recommended for hackathon): Deploy via Remix
 *   1. Go to https://remix.ethereum.org
 *   2. Create new file: DeRiskOracle.sol
 *   3. Paste the contract code from contracts/DeRiskOracle.sol
 *   4. Compile with Solidity 0.8.19+
 *   5. Deploy to Sepolia via Injected Provider (MetaMask)
 *   6. Copy deployed address → update config.staging.json oracleAddress
 *
 * OPTION 2: Deploy via Foundry (if installed)
 *   forge create --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY \
 *     --private-key YOUR_PRIVATE_KEY \
 *     contracts/DeRiskOracle.sol:DeRiskOracle
 *
 * OPTION 3: Run this script with bun
 *   bun run contracts/deploy.ts
 */

import { createWalletClient, createPublicClient, http, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { DeRiskOracle } from './abi'

const sepolia = defineChain({
	id: 11155111,
	name: 'Sepolia',
	nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
	rpcUrls: {
		default: { http: [process.env.SEPOLIA_RPC || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY'] },
	},
	blockExplorers: {
		default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
	},
	testnet: true,
})

// Compiled bytecode of DeRiskOracle.sol
// To get this: compile in Remix → copy bytecode from compilation details
// Or: solc --bin contracts/DeRiskOracle.sol
const BYTECODE = 'PASTE_COMPILED_BYTECODE_HERE' as `0x${string}`

async function main() {
	// Load private key from environment
	const privateKey = process.env.CRE_ETH_PRIVATE_KEY
	if (!privateKey) {
		console.error('ERROR: Set CRE_ETH_PRIVATE_KEY environment variable')
		console.error('  export CRE_ETH_PRIVATE_KEY=0x...')
		process.exit(1)
	}

	const account = privateKeyToAccount(privateKey as `0x${string}`)

	const walletClient = createWalletClient({
		account,
		chain: sepolia,
		transport: http(),
	})

	const publicClient = createPublicClient({
		chain: sepolia,
		transport: http(),
	})

	console.log('=== DeRisk Protocol - Contract Deployment ===')
	console.log(`Network:  Sepolia Testnet`)
	console.log(`Deployer: ${account.address}`)

	const balance = await publicClient.getBalance({ address: account.address })
	console.log(`Balance:  ${Number(balance) / 1e18} ETH`)

	if (balance === 0n) {
		console.error('ERROR: No Sepolia ETH. Get some from https://sepoliafaucet.com')
		process.exit(1)
	}

	console.log('\nDeploying DeRiskOracle...')

	const hash = await walletClient.deployContract({
		abi: DeRiskOracle,
		bytecode: BYTECODE,
	})

	console.log(`Transaction: ${hash}`)
	console.log('Waiting for confirmation...')

	const receipt = await publicClient.waitForTransactionReceipt({ hash })

	console.log(`\nDeployed at: ${receipt.contractAddress}`)
	console.log(`Block:       ${receipt.blockNumber}`)
	console.log(`Gas used:    ${receipt.gasUsed}`)
	console.log(`\nNext steps:`)
	console.log(`  1. Update derisk-workflow/config.staging.json`)
	console.log(`     "oracleAddress": "${receipt.contractAddress}"`)
	console.log(`  2. Run: ..\\cre.exe workflow simulate ./derisk-workflow`)
}

main().catch((err) => {
	console.error('Deployment failed:', err.message)
	process.exit(1)
})
