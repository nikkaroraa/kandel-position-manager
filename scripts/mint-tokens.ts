#!/usr/bin/env bun
// Script to mint test tokens

import { parseEther, parseUnits, formatUnits } from "viem";
import { erc20Abi } from "../src/abi/erc20";
import { getContractsOrThrow } from "./shared-contracts";
import { client, publicClient, account } from "./shared";

async function mintTokens(wethAmount: string = "10", usdcAmount: string = "25000") {
  console.log("🪙 Minting test tokens...\n");
  
  const contracts = await getContractsOrThrow();

  // Check current balances
  const wethBefore = await publicClient.readContract({
    address: contracts.weth,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  const usdcBefore = await publicClient.readContract({
    address: contracts.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  console.log("📊 Current balances:");
  console.log(`- WETH: ${formatUnits(wethBefore, 18)}`);
  console.log(`- USDC: ${formatUnits(usdcBefore, 6)}`);

  // Mint WETH
  console.log(`\n1️⃣ Minting ${wethAmount} WETH...`);
  await client.writeContract({
    address: contracts.weth,
    abi: erc20Abi,
    functionName: "mint",
    args: [account.address, parseEther(wethAmount)],
  });

  // Mint USDC
  console.log(`2️⃣ Minting ${usdcAmount} USDC...`);
  await client.writeContract({
    address: contracts.usdc,
    abi: erc20Abi,
    functionName: "mint",
    args: [account.address, parseUnits(usdcAmount, 6)],
  });

  // Check new balances
  const wethAfter = await publicClient.readContract({
    address: contracts.weth,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  const usdcAfter = await publicClient.readContract({
    address: contracts.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  console.log("\n✅ Minting complete!");
  console.log("\n📊 New balances:");
  console.log(`- WETH: ${formatUnits(wethAfter, 18)} (+${wethAmount})`);
  console.log(`- USDC: ${formatUnits(usdcAfter, 6)} (+${usdcAmount})`);
}

// Parse command line args
const args = process.argv.slice(2);
const wethAmount = args[0] || "10";
const usdcAmount = args[1] || "25000";

mintTokens(wethAmount, usdcAmount).catch(console.error);