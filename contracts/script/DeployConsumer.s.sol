// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

// Import the contracts from the project root contracts directory
// Foundry resolves paths relative to the src directory specified in foundry.toml
import {SimpleLendingPool, MockERC20} from "../SimpleLendingPool.sol";

/// @title DeployConsumer
/// @notice Deploys SimpleLendingPool (consumer contract) against the live DeRiskOracle on Sepolia.
/// @dev Run with:
///   forge script contracts/script/DeployConsumer.s.sol \
///     --rpc-url $SEPOLIA_RPC_URL \
///     --private-key $PRIVATE_KEY \
///     --broadcast \
///     --verify \
///     --etherscan-api-key $ETHERSCAN_API_KEY \
///     -vvvv
contract DeployConsumer is Script {

    // Live DeRiskOracle already deployed and verified on Sepolia
    address constant DERISK_ORACLE = 0xbC75cCB19bc37a87bB0500c016bD13E50c591f09;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("===========================================");
        console.log("DeRisk Protocol - Consumer Contract Deploy");
        console.log("===========================================");
        console.log("Deployer:      ", deployer);
        console.log("DeRiskOracle:  ", DERISK_ORACLE);
        console.log("Network:        Sepolia");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy MockUSDC (6 decimal mock stablecoin for demo)
        MockERC20 mockUsdc = new MockERC20("Mock USDC", "mUSDC");
        console.log("MockUSDC deployed at:", address(mockUsdc));

        // 2. Mint initial supply to deployer for demo purposes (10M mUSDC)
        uint256 initialSupply = 10_000_000 * 1e6; // 10M with 6 decimals
        mockUsdc.mint(deployer, initialSupply);
        console.log("Minted 10,000,000 mUSDC to deployer");

        // 3. Deploy SimpleLendingPool pointing at the live DeRiskOracle
        SimpleLendingPool pool = new SimpleLendingPool(DERISK_ORACLE, address(mockUsdc));
        console.log("SimpleLendingPool deployed at:", address(pool));

        vm.stopBroadcast();

        // ── Post-deploy info ───────────────────────────────────────────────
        console.log("");
        console.log("===========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("===========================================");
        console.log("MockUSDC:          ", address(mockUsdc));
        console.log("SimpleLendingPool: ", address(pool));
        console.log("DeRiskOracle:      ", DERISK_ORACLE);
        console.log("");
        console.log("Verify MockUSDC:");
        console.log(
            string.concat(
                "forge verify-contract ",
                vm.toString(address(mockUsdc)),
                " contracts/SimpleLendingPool.sol:MockERC20",
                ' --constructor-args $(cast abi-encode "constructor(string,string)" "Mock USDC" "mUSDC")',
                " --chain sepolia",
                " --etherscan-api-key $ETHERSCAN_API_KEY"
            )
        );
        console.log("");
        console.log("Verify SimpleLendingPool:");
        console.log(
            string.concat(
                "forge verify-contract ",
                vm.toString(address(pool)),
                " contracts/SimpleLendingPool.sol:SimpleLendingPool",
                " --constructor-args $(cast abi-encode \"constructor(address,address)\" ",
                vm.toString(DERISK_ORACLE),
                " ",
                vm.toString(address(mockUsdc)),
                ")",
                " --chain sepolia",
                " --etherscan-api-key $ETHERSCAN_API_KEY"
            )
        );
        console.log("");
        console.log("Update frontend/src/lib/contract.ts:");
        console.log(string.concat("SIMPLE_LENDING_POOL_ADDRESS = '", vm.toString(address(pool)), "'"));
        console.log("");
        console.log("Add to README.md:");
        console.log(string.concat("SimpleLendingPool: https://sepolia.etherscan.io/address/", vm.toString(address(pool))));
    }
}
