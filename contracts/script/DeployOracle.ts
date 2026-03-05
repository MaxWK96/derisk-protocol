/**
 * DeRiskOracle deploy script for Hardhat.
 * Compiles via Forge (avoids forge-std import issues in Hardhat),
 * then deploys the artifact using Hardhat's ethers provider.
 *
 * Usage: npx hardhat run contracts/script/DeployOracle.ts --network sepolia
 */
import { ethers } from "hardhat";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("===========================================");
  console.log("DeRisk Protocol - Oracle Redeploy");
  console.log("Fix: onReport dispatches by selector");
  console.log("===========================================");
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Step 1: compile with forge (avoids forge-std import conflicts in hardhat)
  console.log("\nCompiling with forge...");
  execSync("forge build --silent", { stdio: "inherit" });

  // Step 2: load artifact produced by forge
  const artifactPath = path.join(
    __dirname,
    "../../out/DeRiskOracle.sol/DeRiskOracle.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;
  const bytecode = artifact.bytecode.object;

  // Step 3: deploy
  console.log("Deploying DeRiskOracle...");
  const factory = new ethers.ContractFactory(abi, bytecode, deployer);
  const oracle = await factory.deploy();
  await oracle.waitForDeployment();

  const address = await oracle.getAddress();
  console.log("DeRiskOracle deployed at:", address);

  // Step 4: update config files automatically
  const workflowDir = path.join(__dirname, "../../derisk-workflow");

  for (const configFile of ["config.staging.json", "config.local.json"]) {
    const configPath = path.join(workflowDir, configFile);
    if (!fs.existsSync(configPath)) continue;
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const old = config.evms[0].oracleAddress;
    config.evms[0].oracleAddress = address;
    fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"));
    console.log(`${configFile}: ${old} → ${address}`);
  }

  console.log("\n===========================================");
  console.log("DONE. Next: npm run cre:broadcast");
  console.log("===========================================");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
