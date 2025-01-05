const { ethers } = require("hardhat");

async function main() {

  const contract = await ethers.deployContract("Voting");

  console.log(`Deployed Token at ${await contract.getAddress()} !`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
