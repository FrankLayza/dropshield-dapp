import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying RecipientRegistry with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const Registry = await ethers.getContractFactory("RecipientRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("\n✅ RecipientRegistry deployed to:", address);
  console.log("\nPaste this address into src/lib/addresses.ts as RECIPIENT_REGISTRY_SEPOLIA");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
