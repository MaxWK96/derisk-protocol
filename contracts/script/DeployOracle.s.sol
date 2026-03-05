// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {DeRiskOracle} from "../DeRiskOracle.sol";

/// @notice Deploys a fresh DeRiskOracle with the fixed onReport dispatcher.
/// @dev Run with:
///   forge script contracts/script/DeployOracle.s.sol \
///     --rpc-url $SEPOLIA_RPC_URL \
///     --private-key $PRIVATE_KEY \
///     --broadcast \
///     --verify \
///     --etherscan-api-key $ETHERSCAN_API_KEY \
///     -vvvv
contract DeployOracle is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("===========================================");
        console.log("DeRisk Protocol - Oracle Redeploy");
        console.log("Fix: onReport now dispatches by selector");
        console.log("===========================================");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);
        DeRiskOracle oracle = new DeRiskOracle();
        vm.stopBroadcast();

        console.log("DeRiskOracle deployed at:", address(oracle));
        console.log("");
        console.log("Update these files with the new address:");
        console.log("  derisk-workflow/config.staging.json  -> oracleAddress");
        console.log("  derisk-workflow/config.local.json    -> oracleAddress");
        console.log("  contracts/script/DeployConsumer.s.sol -> DERISK_ORACLE");
        console.log("  contracts/script/DeployRiskAwareVault.s.sol -> DERISK_ORACLE");
        console.log("  frontend/src/lib/contract.ts         -> ORACLE_ADDRESS");
    }
}
