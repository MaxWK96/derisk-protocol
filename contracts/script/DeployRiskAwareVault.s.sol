// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {RiskAwareVault} from "../RiskAwareVault.sol";
import {MockERC20} from "../SimpleLendingPool.sol";

/// @title DeployRiskAwareVault
/// @notice Deploys RiskAwareVault (dynamic LTV consumer) against the live DeRiskOracle on Sepolia.
/// @dev Run with:
///   forge script contracts/script/DeployRiskAwareVault.s.sol \
///     --rpc-url $SEPOLIA_RPC_URL \
///     --private-key $PRIVATE_KEY \
///     --broadcast \
///     --verify \
///     --etherscan-api-key $ETHERSCAN_API_KEY \
///     -vvvv
contract DeployRiskAwareVault is Script {

    // Live DeRiskOracle already deployed and verified on Sepolia
    address constant DERISK_ORACLE = 0xbC75cCB19bc37a87bB0500c016bD13E50c591f09;

    // Reuse the MockUSDC deployed for SimpleLendingPool
    address constant MOCK_USDC = 0xAd714Eb7B95d3De5d0A91b816e0a39cDbE5C586B;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("===========================================");
        console.log("DeRisk Protocol - RiskAwareVault Deploy");
        console.log("===========================================");
        console.log("Deployer:      ", deployer);
        console.log("DeRiskOracle:  ", DERISK_ORACLE);
        console.log("Asset (mUSDC): ", MOCK_USDC);
        console.log("Network:        Sepolia");

        vm.startBroadcast(deployerPrivateKey);

        RiskAwareVault vault = new RiskAwareVault(DERISK_ORACLE, MOCK_USDC);
        console.log("RiskAwareVault deployed at:", address(vault));

        vm.stopBroadcast();

        // Post-deploy summary
        console.log("");
        console.log("===========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("===========================================");
        console.log("RiskAwareVault: ", address(vault));
        console.log("DeRiskOracle:   ", DERISK_ORACLE);
        console.log("Asset:          ", MOCK_USDC);
        console.log("");
        console.log("Verify RiskAwareVault:");
        console.log(
            string.concat(
                "forge verify-contract ",
                vm.toString(address(vault)),
                " contracts/RiskAwareVault.sol:RiskAwareVault",
                " --constructor-args $(cast abi-encode \"constructor(address,address)\" ",
                vm.toString(DERISK_ORACLE),
                " ",
                vm.toString(MOCK_USDC),
                ")",
                " --chain sepolia",
                " --etherscan-api-key $ETHERSCAN_API_KEY"
            )
        );
        console.log("");
        console.log("Add to README.md:");
        console.log(string.concat("RiskAwareVault: https://sepolia.etherscan.io/address/", vm.toString(address(vault))));
    }
}
