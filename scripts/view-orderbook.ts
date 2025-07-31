#!/usr/bin/env bun
// Script to view the order book
//
// The offerList function returns a tuple with 4 elements:
// [0] nextOfferId: uint256 - The next offer ID in the sequence
// [1] offerIds: uint256[] - Array of offer IDs
// [2] offers: OfferUnpacked[] - Array of offer data (prev, next, tick, gives)
// [3] offerDetails: OfferDetailUnpacked[] - Array of offer details (maker, gasreq, etc.)

import { formatUnits } from "viem";
import { readerAbi } from "../src/abi/reader";
import { getContractsOrThrow } from "./shared-contracts";
import { publicClient } from "./shared";

// Convert tick to price for WETH/USDC
function tickToPrice(tick: bigint): number {
  const rawPrice = 1.0001 ** Number(tick);
  return rawPrice / Math.pow(10, 18 - 6); // Adjust for WETH (18) - USDC (6) decimals
}

// For bids in USDC→WETH market
// populateFromOffset creates negative ticks, populate creates positive ticks
function tickToPriceForBid(tick: bigint): number {
  // populateFromOffset uses negative ticks for bids
  // The negative tick represents the inverted price relationship
  if (tick < 0n) {
    // For negative ticks, we need to use -tick to get the absolute value
    // This gives us the bid price in WETH/USDC terms
    const positiveTick = -tick;
    const rawPrice = 1.0001 ** Number(positiveTick);
    return rawPrice / Math.pow(10, 18 - 6);
  }
  // populate uses positive ticks directly
  return tickToPrice(tick);
}

// Format large numbers properly
function formatPrice(price: number): string {
  if (price < 0.01) return price.toExponential(2);
  if (price > 1e6) return price.toExponential(2);
  return price.toFixed(2);
}

async function viewOrderBook() {
  console.log("📊 Fetching Order Book...\n");
  
  const contracts = await getContractsOrThrow();

  // Define both sides of the market
  const olKeyBaseQuote = {
    outbound_tkn: contracts.weth,
    inbound_tkn: contracts.usdc,
    tickSpacing: BigInt(1),
  };

  const olKeyQuoteBase = {
    outbound_tkn: contracts.usdc,
    inbound_tkn: contracts.weth,
    tickSpacing: BigInt(1),
  };

  // Fetch asks (WETH → USDC)
  console.log("💸 ASKS (Selling WETH for USDC):");
  console.log("Price\t\tSize\t\tMaker");
  console.log("----------------------------------------");

  const asksResult = await publicClient.readContract({
    address: contracts.reader,
    abi: readerAbi,
    functionName: "offerList",
    args: [olKeyBaseQuote, BigInt(0), BigInt(50)], // Get first 50 asks to see all
  });

  // Destructure the result for clarity
  const [, , offers, offerDetails] = asksResult;

  if (offers && offers.length > 0) {
    console.log(`(Found ${offers.length} asks total)\n`);
    // Show all asks
    offers.forEach((offer, i) => {
      const price = tickToPrice(offer.tick);
      const size = formatUnits(offer.gives, 18);
      const maker = offerDetails[i].maker;
      console.log(
        `$${formatPrice(price)}\t${size} WETH\t${maker.slice(
          0,
          10
        )}...${maker.slice(-4)}`
      );
    });
  } else {
    console.log("No asks found");
  }

  // Fetch bids (USDC → WETH)
  console.log("\n💰 BIDS (Buying WETH with USDC):");
  console.log("Price\t\tSize\t\tMaker");
  console.log("----------------------------------------");

  const bidsResult = await publicClient.readContract({
    address: contracts.reader,
    abi: readerAbi,
    functionName: "offerList",
    args: [olKeyQuoteBase, BigInt(0), BigInt(100)], // Get first 100 bids to see all
  });

  // Destructure the result for clarity
  const [, , bidOffers, bidOfferDetails] = bidsResult;

  if (bidOffers && bidOffers.length > 0) {
    console.log(`(Found ${bidOffers.length} bids total)\n`);
    // Show all bids
    bidOffers.forEach((offer, i) => {
      const usdcAmount = formatUnits(offer.gives, 6); // USDC gives

      // For bids on USDC→WETH market, use the bid-specific price function
      // to handle both positive ticks (from populate) and negative ticks (from populateFromOffset)
      const price = tickToPriceForBid(offer.tick);

      // Calculate WETH amount from USDC amount and price
      const wethAmount = Number(usdcAmount) / price;

      console.log(
        `$${formatPrice(price)}\t${wethAmount.toFixed(
          6
        )} WETH\t${bidOfferDetails[i].maker.slice(0, 10)}...${bidOfferDetails[
          i
        ].maker.slice(-4)}`
      );
    });
  } else {
    console.log("No bids found");
  }

  // Get best prices
  const bestAsk = await publicClient.readContract({
    address: contracts.mangrove,
    abi: [
      {
        name: "best",
        type: "function",
        inputs: [
          {
            name: "olKey",
            type: "tuple",
            components: [
              { name: "outbound_tkn", type: "address" },
              { name: "inbound_tkn", type: "address" },
              { name: "tickSpacing", type: "uint256" },
            ],
          },
        ],
        outputs: [{ name: "offerId", type: "uint256" }],
        stateMutability: "view",
      },
    ],
    functionName: "best",
    args: [olKeyBaseQuote],
  });

  console.log("\n📈 Market Summary:");
  console.log("- Best Ask ID:", bestAsk.toString());
  console.log("- Best Bid ID:", "Check USDC→WETH market");
  console.log("- Spread: Calculate from best bid/ask prices");
}

viewOrderBook().catch(console.error);
