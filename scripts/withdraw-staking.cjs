/**
 * Owner withdraws BNB from BnbStaking.
 *
 * Usage:
 *   node scripts/withdraw-staking.cjs --all
 *   node scripts/withdraw-staking.cjs --amount 0.27
 *
 * Required in .env:
 *   OWNER_PRIVATE_KEY  (or DEPLOYER_PRIVATE_KEY if same as owner)
 *   STAKING_CONTRACT_ADDRESS (or VITE_STAKING_CONTRACT_ADDRESS)
 * Optional:
 *   WITHDRAW_TO_ADDRESS (defaults to owner wallet)
 */
require("dotenv").config();
const hre = require("hardhat");

function pickKey() {
  const raw = process.env.OWNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!raw) throw new Error("Set OWNER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY in .env");
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

function pickContract() {
  const addr =
    process.env.STAKING_CONTRACT_ADDRESS || process.env.VITE_STAKING_CONTRACT_ADDRESS;
  if (!addr) throw new Error("Set STAKING_CONTRACT_ADDRESS or VITE_STAKING_CONTRACT_ADDRESS");
  return addr;
}

async function main() {
  const withdrawAll = process.argv.includes("--all");
  const amountIdx = process.argv.indexOf("--amount");
  const amountBnb = amountIdx >= 0 ? process.argv[amountIdx + 1] : null;

  const provider = new hre.ethers.JsonRpcProvider(
    process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
  );
  const wallet = new hre.ethers.Wallet(pickKey(), provider);
  const contractAddr = pickContract();
  const staking = await hre.ethers.getContractAt("BnbStaking", contractAddr, wallet);

  const owner = await staking.owner();
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(`Wallet ${wallet.address} is not contract owner (${owner})`);
  }

  const to = process.env.WITHDRAW_TO_ADDRESS || wallet.address;
  console.log("Contract:", contractAddr);
  console.log("Owner wallet:", wallet.address);
  console.log("Withdraw to:", to);

  if (withdrawAll) {
    const tx = await staking.withdrawAll(to);
    console.log("withdrawAll tx:", tx.hash);
    await tx.wait();
    console.log("Done.");
    return;
  }

  if (!amountBnb) {
    throw new Error("Use --all or --amount <bnb>");
  }

  const wei = hre.ethers.parseEther(amountBnb);
  const tx = await staking.withdraw(to, wei);
  console.log("withdraw tx:", tx.hash);
  await tx.wait();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
