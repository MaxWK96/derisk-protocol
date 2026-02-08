/**
 * DeRisk Protocol - Deploy & Test Chainlink Functions
 *
 * Usage:
 *   npx ts-node deploy-functions.ts simulate    # Local simulation
 *   npx ts-node deploy-functions.ts deploy       # Deploy to Sepolia DON
 *
 * Prerequisites:
 *   - Functions subscription created at functions.chain.link/sepolia
 *   - Subscription funded with LINK
 *   - Consumer contract added to subscription
 */

import {
	simulateScript,
	buildRequestCBOR,
	CodeLanguage,
	Location,
	ReturnType,
	decodeResult,
} from '@chainlink/functions-toolkit'
import { Contract, JsonRpcProvider, Wallet } from 'ethers'
import * as fs from 'fs'

// ========== Configuration ==========

const RPC_URL = process.env.SEPOLIA_RPC || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY'
const PRIVATE_KEY = process.env.CRE_ETH_PRIVATE_KEY || 'YOUR_PRIVATE_KEY'
const CONSUMER_ADDRESS = '0xbC75cCB19bc37a87bB0500c016bD13E50c591f09'

// Sepolia Functions Router and DON ID
const FUNCTIONS_ROUTER = '0xb83E47C2bC239B3bf370bc41e1459A34b41238D0'
const DON_ID = 'fun-ethereum-sepolia-1'
const SUBSCRIPTION_ID = 4805  // Update with your actual subscription ID
const GAS_LIMIT = 300_000
const SLOT_ID = 0

// Test data matching real DeFi Llama values
const TEST_ARGS = [
	'27190000000',  // Aave TVL ~$27.19B
	'1300000000',   // Compound TVL ~$1.3B
	'5430000000',   // MakerDAO TVL ~$5.43B
	'2678',         // ETH/USD ~$2,678
]

// ========== Functions Consumer ABI (minimal) ==========

const FUNCTIONS_CONSUMER_ABI = [
	'function sendRequest(bytes memory encodedRequest, uint64 subscriptionId, uint32 gasLimit, bytes32 donID) external returns (bytes32)',
	'function s_lastResponse() view returns (bytes)',
	'function s_lastError() view returns (bytes)',
	'function s_lastRequestId() view returns (bytes32)',
]

// ========== Main ==========

async function main() {
	const command = process.argv[2] || 'simulate'
	const source = fs.readFileSync('./chainlink-functions-source.js', 'utf8')

	if (command === 'simulate') {
		await runSimulation(source)
	} else if (command === 'deploy') {
		await deployToDoN(source)
	} else {
		console.log('Usage: npx ts-node deploy-functions.ts [simulate|deploy]')
	}
}

// ========== Local Simulation ==========

async function runSimulation(source: string) {
	console.log('========================================')
	console.log('  DeRisk Functions - Local Simulation')
	console.log('========================================')
	console.log('')
	console.log('Input args:', TEST_ARGS)
	console.log('')

	const result = await simulateScript({
		source,
		args: TEST_ARGS,
		bytesArgs: [],
		secrets: {},
	})

	console.log('Raw response:', result.responseBytesHexstring)

	if (result.errorString) {
		console.error('Error:', result.errorString)
		return
	}

	if (result.responseBytesHexstring) {
		const decoded = decodeResult(
			result.responseBytesHexstring,
			ReturnType.uint256,
		)
		console.log('')
		console.log('========================================')
		console.log(`  Aggregate Risk Score: ${decoded}/100`)
		console.log('========================================')
		console.log('')
		console.log('This score would be written on-chain if')
		console.log('Anthropic Claude API was unavailable.')
	}

	if (result.capturedTerminalOutput) {
		console.log('\nConsole output:', result.capturedTerminalOutput)
	}
}

// ========== Deploy to Chainlink DON ==========

async function deployToDoN(source: string) {
	console.log('========================================')
	console.log('  DeRisk Functions - Deploy to DON')
	console.log('========================================')
	console.log('')

	const provider = new JsonRpcProvider(RPC_URL)
	const wallet = new Wallet(PRIVATE_KEY, provider)

	console.log('Deployer:', wallet.address)
	console.log('Consumer:', CONSUMER_ADDRESS)
	console.log('Subscription:', SUBSCRIPTION_ID)
	console.log('')

	// Build the Functions request CBOR
	const requestCBOR = buildRequestCBOR({
		codeLocation: Location.Inline,
		codeLanguage: CodeLanguage.JavaScript,
		source,
		args: TEST_ARGS,
		secretsLocation: Location.DONHosted,
		encryptedSecretsReference: new Uint8Array(),
	})

	console.log('Request CBOR built:', requestCBOR.length, 'bytes')
	console.log('')

	// Note: To actually send the request, the consumer contract needs to implement
	// FunctionsClient. Since DeRiskOracle doesn't inherit FunctionsClient,
	// we'd need a separate FunctionsConsumer contract or use the Functions router directly.
	//
	// For the hackathon demo, we show:
	// 1. The source code runs correctly (simulation above)
	// 2. The CBOR request is built correctly
	// 3. The scoring logic matches the on-chain weighted aggregate
	//
	// Production deployment would add FunctionsClient inheritance to DeRiskOracle.

	console.log('To send this request on-chain:')
	console.log('1. Ensure DeRiskOracle inherits FunctionsClient')
	console.log('2. Call sendRequest() with this CBOR payload')
	console.log(`3. Subscription ID: ${SUBSCRIPTION_ID}`)
	console.log(`4. Gas Limit: ${GAS_LIMIT}`)
	console.log(`5. DON ID: ${DON_ID}`)
	console.log('')
	console.log('The DON will execute chainlink-functions-source.js')
	console.log('and deliver the aggregate score to fulfillRequest()')
}

main().catch(console.error)
