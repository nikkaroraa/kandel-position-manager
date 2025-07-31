#!/usr/bin/env bun
/**
 * Create Kandel Position using populate() method
 *
 * This script demonstrates the correct way to use populate() instead of populateFromOffset()
 * It creates a properly formatted distribution that populate() expects.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  parseUnits,
  formatUnits,
  formatEther,
  type Address,
} from "viem";
import { foundry } from "viem/chains";
import { account } from "./shared";
import { kandelSeederABI } from "../src/abi/kandelSeeder";
import { KandelAbi } from "../src/abi/kandel";
import { erc20Abi } from "../src/abi/erc20";
import { readerAbi } from "../src/abi/reader";
import { kandelDB } from "../lib/db";
import { getContractsOrThrow, type Contracts } from "./shared-contracts";

// Create clients
const publicClient = createPublicClient({
  chain: foundry,
  transport: http("http://127.0.0.1:8545"),
});

const walletClient = createWalletClient({
  account,
  chain: foundry,
  transport: http("http://127.0.0.1:8545"),
});

// Price to tick conversion for WETH/USDC
function priceToTick(price: number): bigint {
  const adjustedPrice = price * Math.pow(10, 18 - 6); // Adjust for decimals
  const tick = Math.round(Math.log(adjustedPrice) / Math.log(1.0001));
  return BigInt(tick);
}

// Tick to price conversion for display
function tickToPrice(tick: bigint): number {
  const rawPrice = Number(1.0001 ** Number(tick));
  return rawPrice / Math.pow(10, 18 - 6); // Adjust for decimals
}

/**
 * Creates a Kandel position using the populate() method
 */
async function createKandelPositionWithContracts(
  contracts: Contracts,
  params: {
    name?: string;
    minPrice: number;
    maxPrice: number;
    pricePoints: number;
    baseAmount: string; // in ETH
    quoteAmount: string; // in USDC
    stepSize?: number;
    gasreq?: bigint;
  }
) {
  console.log("🚀 Creating Kandel Position\n");

  // ==========================================
  // Step 1: Deploy Kandel via Seeder
  // ==========================================
  console.log("1️⃣ Deploying Kandel via KandelSeeder...");

  const olKeyBaseQuote = {
    outbound_tkn: contracts.weth,
    inbound_tkn: contracts.usdc,
    tickSpacing: BigInt(1),
  };

  const { request } = await publicClient.simulateContract({
    address: contracts.seeder,
    abi: kandelSeederABI,
    functionName: "sow",
    args: [olKeyBaseQuote, false],
    account,
  });

  const sowHash = await walletClient.writeContract(request);
  const sowReceipt = await publicClient.waitForTransactionReceipt({
    hash: sowHash,
  });

  // Extract Kandel address from logs
  const kandelLog = sowReceipt.logs.find(
    (log) => log.address.toLowerCase() === contracts.seeder.toLowerCase()
  ) as { data: `0x${string}` } | undefined;

  if (!kandelLog || !kandelLog.data || kandelLog.data.length < 66) {
    throw new Error("Failed to extract Kandel address from logs");
  }

  const kandel = `0x${kandelLog.data.slice(26, 66)}` as Address;
  console.log("✅ Kandel deployed at:", kandel);

  // ==========================================
  // Step 2: Create distribution manually
  // ==========================================
  console.log("\n2️⃣ Creating distribution for populate()...");

  // Calculate tick parameters
  const minTick = priceToTick(params.minPrice);
  const maxTick = priceToTick(params.maxPrice);
  const tickOffset = (maxTick - minTick) / BigInt(params.pricePoints - 1);

  // IMPORTANT: Account for the gap by using pricePoints + 1
  const adjustedPricePoints = params.pricePoints + 1; // To get 10 visible offers
  const firstAskIndex = Math.floor(adjustedPricePoints / 2);

  const baseAmountWei = parseEther(params.baseAmount);
  const quoteAmountWei = parseUnits(params.quoteAmount, 6);

  // Create distribution with proper structure matching the ABI
  const distribution = {
    asks: [] as Array<{ index: bigint; tick: bigint; gives: bigint }>,
    bids: [] as Array<{ index: bigint; tick: bigint; gives: bigint }>,
  };

  // Create asks (selling WETH)
  for (let i = firstAskIndex; i < adjustedPricePoints; i++) {
    const tick = minTick + BigInt(i) * tickOffset;
    distribution.asks.push({
      index: BigInt(i),
      tick: tick,
      gives: baseAmountWei,
    });
  }

  // Create bids (buying WETH)
  for (let i = 0; i < firstAskIndex - 1; i++) {
    // -1 to create the gap
    const tick = minTick + BigInt(i) * tickOffset;
    distribution.bids.push({
      index: BigInt(i),
      tick: tick,
      gives: quoteAmountWei,
    });
  }

  console.log("Distribution created:");
  console.log("- Asks:", distribution.asks.length);
  console.log("- Bids:", distribution.bids.length);
  console.log("- Gap at index:", firstAskIndex - 1);

  // Log the distribution details
  console.log("\n📊 Distribution Details:");
  console.log("\nAsks (selling WETH):");
  distribution.asks.forEach((ask) => {
    const price = tickToPrice(ask.tick);
    console.log(
      `  Index ${ask.index}: tick=${ask.tick}, price=$${price.toFixed(
        2
      )}, gives=${formatUnits(ask.gives, 18)} WETH`
    );
  });

  console.log("\nBids (buying WETH):");
  distribution.bids.forEach((bid) => {
    const price = tickToPrice(bid.tick);
    console.log(
      `  Index ${bid.index}: tick=${bid.tick}, price=$${price.toFixed(
        2
      )}, gives=${formatUnits(bid.gives, 6)} USDC`
    );
  });

  // ==========================================
  // Step 3: Calculate token requirements
  // ==========================================
  const totalBaseNeeded = distribution.asks.reduce(
    (sum, ask) => sum + ask.gives,
    0n
  );
  const totalQuoteNeeded = distribution.bids.reduce(
    (sum, bid) => sum + bid.gives,
    0n
  );

  console.log("\n3️⃣ Token requirements:");
  console.log("- Total WETH needed:", formatUnits(totalBaseNeeded, 18));
  console.log("- Total USDC needed:", formatUnits(totalQuoteNeeded, 6));

  // ==========================================
  // Step 4: Approve tokens for Kandel
  // ==========================================
  console.log("\n4️⃣ Approving tokens for Kandel...");

  // Approve WETH
  if (totalBaseNeeded > BigInt(0)) {
    const wethApproveTx = await walletClient.writeContract({
      address: contracts.weth,
      abi: erc20Abi,
      functionName: "approve",
      args: [kandel, totalBaseNeeded],
    });
    await publicClient.waitForTransactionReceipt({ hash: wethApproveTx });
    console.log("✅ Approved", formatUnits(totalBaseNeeded, 18), "WETH");
  }

  // Approve USDC
  if (totalQuoteNeeded > BigInt(0)) {
    const usdcApproveTx = await walletClient.writeContract({
      address: contracts.usdc,
      abi: erc20Abi,
      functionName: "approve",
      args: [kandel, totalQuoteNeeded],
    });
    await publicClient.waitForTransactionReceipt({ hash: usdcApproveTx });
    console.log("✅ Approved", formatUnits(totalQuoteNeeded, 6), "USDC");
  }

  // ==========================================
  // Step 5: Calculate provision
  // ==========================================
  console.log("\n5️⃣ Calculating provision...");

  const gasreq = params.gasreq || BigInt(200000);
  const gasprice = BigInt(1);

  const provisionPerOffer = await publicClient.readContract({
    address: contracts.reader,
    abi: readerAbi,
    functionName: "getProvisionWithDefaultGasPrice",
    args: [olKeyBaseQuote, gasreq],
  });

  const totalOffers = BigInt(
    distribution.asks.length + distribution.bids.length
  );
  const totalProvision = provisionPerOffer * totalOffers;
  const provisionWithBuffer = (totalProvision * BigInt(15)) / BigInt(10); // 50% buffer

  console.log("- Gas per offer:", gasreq.toString());
  console.log("- Provision per offer:", formatEther(provisionPerOffer), "ETH");
  console.log("- Total offers:", totalOffers.toString());
  console.log(
    "- Total provision (with buffer):",
    formatEther(provisionWithBuffer),
    "ETH"
  );

  // ==========================================
  // Step 6: Populate using correct format
  // ==========================================
  console.log("\n6️⃣ Populating Kandel...");

  const kandelParams = {
    gasprice: Number(gasprice),
    gasreq: Number(gasreq),
    stepSize: params.stepSize || 1,
    pricePoints: params.pricePoints, // Use original pricePoints, not adjusted
  };

  console.log("\nPopulate parameters:");
  console.log("- Distribution asks:", distribution.asks.length);
  console.log("- Distribution bids:", distribution.bids.length);
  console.log("- Parameters:", JSON.stringify(kandelParams, null, 2));
  console.log("- Base amount:", formatUnits(totalBaseNeeded, 18), "WETH");
  console.log("- Quote amount:", formatUnits(totalQuoteNeeded, 6), "USDC");

  try {
    const { request: populateRequest } = await publicClient.simulateContract({
      address: kandel,
      abi: KandelAbi,
      functionName: "populate",
      args: [
        distribution, // Correctly structured distribution
        kandelParams,
        totalBaseNeeded, // baseAmount to transfer from user
        totalQuoteNeeded, // quoteAmount to transfer from user
      ],
      value: provisionWithBuffer,
      account,
    });

    const populateHash = await walletClient.writeContract(populateRequest);
    const populateReceipt = await publicClient.waitForTransactionReceipt({
      hash: populateHash,
    });

    console.log("\n✅ Kandel populated successfully!");
    console.log("- Transaction hash:", populateHash);
    console.log("- Gas used:", populateReceipt.gasUsed.toString());

    // ==========================================
    // Step 7: Verify offers created
    // ==========================================
    console.log("\n7️⃣ Verifying offers...");

    // Check asks
    const asks = await publicClient.readContract({
      address: contracts.reader,
      abi: readerAbi,
      functionName: "offerList",
      args: [olKeyBaseQuote, BigInt(0), BigInt(50)],
    });

    const kandelAsks = asks[2]
      ? asks[2]
          .map((offer, i) => ({ ...offer, maker: asks[3][i].maker }))
          .filter((offer) => offer.maker.toLowerCase() === kandel.toLowerCase())
      : [];

    // Check bids
    const bids = await publicClient.readContract({
      address: contracts.reader,
      abi: readerAbi,
      functionName: "offerList",
      args: [
        {
          outbound_tkn: contracts.usdc,
          inbound_tkn: contracts.weth,
          tickSpacing: BigInt(1),
        },
        BigInt(0),
        BigInt(50),
      ],
    });

    const kandelBids = bids[2]
      ? bids[2]
          .map((offer, i) => ({ ...offer, maker: bids[3][i].maker }))
          .filter((offer) => offer.maker.toLowerCase() === kandel.toLowerCase())
      : [];

    console.log("Offers created:");
    console.log("- Asks (selling WETH):", kandelAsks.length);
    console.log("- Bids (buying WETH):", kandelBids.length);
    console.log(
      "- Total visible offers:",
      kandelAsks.length + kandelBids.length
    );
  } catch (error) {
    console.error("❌ Error populating Kandel:", error);
    throw error;
  }

  // ==========================================
  // Step 8: Save to database and legacy files
  // ==========================================
  console.log("\n8️⃣ Saving Kandel deployment...");

  // Save to database
  try {
    await kandelDB.addKandel({
      address: kandel,
      deployedBy: account.address,
      deployedAt: new Date().toISOString(),
      deploymentTx: sowHash,
      name: params.name || "Kandel (populate method)",
      market: {
        base: "WETH",
        quote: "USDC",
      },
      priceRange: {
        min: params.minPrice,
        max: params.maxPrice,
      },
      pricePoints: params.pricePoints,
      stepSize: params.stepSize || 1,
      gasreq: Number(gasreq),
      totalBaseDeposited: formatUnits(totalBaseNeeded, 18),
      totalQuoteDeposited: formatUnits(totalQuoteNeeded, 6),
      provision: formatEther(provisionWithBuffer),
      active: true,
      source: "cli",
    });
    console.log("✅ Kandel saved to database");
  } catch (error) {
    console.error("Failed to save to database:", error);
  }

  // Legacy file saving removed - now using database only

  // ==========================================
  // Summary
  // ==========================================
  console.log("\n📊 Position Summary:");
  console.log("═══════════════════");
  console.log("Kandel Address:", kandel);
  console.log("Name:", params.name || "Unnamed");
  console.log("Method: populate()");
  console.log("Market: WETH/USDC");
  console.log("Price Range: $", params.minPrice, "- $", params.maxPrice);
  console.log("Target Offers:", params.pricePoints);
  console.log(
    "Actual Offers:",
    distribution.asks.length + distribution.bids.length
  );
  console.log("WETH Deposited:", formatUnits(totalBaseNeeded, 18));
  console.log("USDC Deposited:", formatUnits(totalQuoteNeeded, 6));
  console.log("ETH Provision:", formatEther(provisionWithBuffer));

  return {
    kandel,
    totalBaseNeeded,
    totalQuoteNeeded,
    provision: provisionWithBuffer,
    distribution,
  };
}

export async function createKandelPosition(
  params: Parameters<typeof createKandelPositionWithContracts>[1]
) {
  const contracts = await getContractsOrThrow();
  return createKandelPositionWithContracts(contracts, params);
}

// Run the script
async function main() {
  await createKandelPosition({
    name: "WETH/USDC Market Maker",
    minPrice: 2000,
    maxPrice: 3000,
    pricePoints: 10, // Will create 10 visible offers with proper gap
    baseAmount: "0.1", // 0.1 WETH per ask offer
    quoteAmount: "250", // 250 USDC per bid offer
  });
}

main()
  .then(() => {
    console.log("\n✨ Kandel position created successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
