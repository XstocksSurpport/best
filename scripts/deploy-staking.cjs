/**
 * Deploy BnbStaking on BNB Chain mainnet or testnet.
 *
 * Usage:
 *   npm run deploy:staking:bsc
 *   npm run deploy:staking:testnet
 *
 * Required in .env: DEPLOYER_PRIVATE_KEY (with BNB for gas)
 * Optional: STAKING_OWNER_ADDRESS (defaults to admin treasury)
 */
require("dotenv").config();
const hre = require("hardhat");

const DEFAULT_OWNER = "0xeb9c027fa55cee6d722177f06441b451961731fc";

async function main() {
  const net = await hre.ethers.provider.getNetwork();
  const chainId = Number(net.chainId);

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer: set DEPLOYER_PRIVATE_KEY in .env");
  }

  const owner =
    process.env.STAKING_OWNER_ADDRESS && process.env.STAKING_OWNER_ADDRESS.length > 0
      ? process.env.STAKING_OWNER_ADDRESS
      : DEFAULT_OWNER;

  console.log("Network chainId:", chainId);
  console.log("Deployer:", deployer.address);
  console.log("Staking owner (admin):", owner);

  const Factory = await hre.ethers.getContractFactory("BnbStaking");
  const staking = await Factory.deploy(owner);
  await staking.waitForDeployment();
  const addr = await staking.getAddress();

  console.log("\n--- OK ---");
  console.log("BnbStaking:", addr);
  console.log("Call claim() with 0.27 BNB — wallet should show 领取/claim");
  console.log("\nPaste into .env (then restart Vite):");
  if (chainId === 97) {
    console.log("VITE_STAKING_CONTRACT_ADDRESS_TESTNET=" + addr);
  } else {
    console.log("VITE_STAKING_CONTRACT_ADDRESS=" + addr);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
