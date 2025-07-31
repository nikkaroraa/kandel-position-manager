import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, formatUnits, formatEther, type Address } from "viem";
import { createGeometricDistribution } from "@mangrovedao/mgv";
import type { MarketParams } from "@mangrovedao/mgv";
import { kandelSeederABI } from "@/src/abi/kandelSeeder";
import { KandelAbi } from "@/src/abi/kandel";
import { erc20Abi } from "@/src/abi/erc20";
import { readerAbi } from "@/src/abi/reader";
import { useContracts } from "./use-contracts";
import {
  KANDEL_EVENTS,
  TICK_BASE,
  TOKEN_DECIMALS,
  TICK_SPACING,
} from "@/lib/constants";
import { calculateMinimumVolume } from "@/lib/kandel-math";
import { useQueryClient } from "@tanstack/react-query";

interface DeployParams {
  minPrice: number;
  maxPrice: number;
  pricePoints: number;
  baseAmount: string;
  quoteAmount: string;
  stepSize: number;
  gasreq: string;
  gasprice: string;
}

interface Distribution {
  asks: Array<{ index: bigint; tick: bigint; gives: bigint }>;
  bids: Array<{ index: bigint; tick: bigint; gives: bigint }>;
}

function priceToTick(price: number): bigint {
  const adjustedPrice =
    price * Math.pow(10, TOKEN_DECIMALS.WETH - TOKEN_DECIMALS.USDC);
  const tick = Math.round(Math.log(adjustedPrice) / Math.log(TICK_BASE));
  return BigInt(tick);
}

function createDistribution(
  params: DeployParams,
  contracts: Contracts
): {
  distribution: Distribution;
  totalBaseNeeded: bigint;
  totalQuoteNeeded: bigint;
} {
  const minTick = priceToTick(params.minPrice);
  const maxTick = priceToTick(params.maxPrice);

  // Adjust price points first to add a gap between bids and asks
  const adjustedPricePoints = params.pricePoints + 1;
  const firstAskIndex = Math.floor(adjustedPricePoints / 2);

  // Calculate tick offset based on adjusted price points to ensure we stay within range
  const tickOffset = (maxTick - minTick) / BigInt(adjustedPricePoints - 1);

  const baseAmountWei = parseUnits(params.baseAmount, TOKEN_DECIMALS.WETH);
  const quoteAmountWei = parseUnits(params.quoteAmount, TOKEN_DECIMALS.USDC);

  // Create market params for the SDK
  const market: MarketParams = {
    base: {
      address: contracts.weth as Address,
      symbol: "WETH",
      decimals: TOKEN_DECIMALS.WETH,
      displayDecimals: 4,
      priceDisplayDecimals: 4,
      mgvTestToken: false,
    },
    quote: {
      address: contracts.usdc as Address,
      symbol: "USDC",
      decimals: TOKEN_DECIMALS.USDC,
      displayDecimals: 2,
      priceDisplayDecimals: 2,
      mgvTestToken: false,
    },
    tickSpacing: TICK_SPACING,
  };

  // Use the SDK's createGeometricDistribution
  // Parameters explained:
  // - baseQuoteTickIndex0: The tick for the first price point (minimum price)
  // - baseQuoteTickOffset: The tick spacing between consecutive price points
  // - firstAskIndex: The index where asks start (creates a gap between bids and asks)
  // - pricePoints: Total number of price points in the distribution
  // - stepSize: The distance between dual offers (for reposting after fills)
  // - bidGives: Amount of quote token (USDC) for each bid
  // - askGives: Amount of base token (WETH) for each ask
  // - market: Market configuration with token details
  const sdkDistribution = createGeometricDistribution({
    baseQuoteTickIndex0: minTick,
    baseQuoteTickOffset: tickOffset,
    firstAskIndex: BigInt(firstAskIndex),
    pricePoints: BigInt(adjustedPricePoints),
    stepSize: BigInt(params.stepSize),
    bidGives: quoteAmountWei,
    askGives: baseAmountWei,
    market,
  });

  // Convert SDK distribution format to our expected format
  // Filter out zero-gives offers that the SDK might create and validate minimum volumes
  const distribution: Distribution = {
    asks: sdkDistribution.asks
      .filter((offer) => {
        if (offer.gives <= 0n) return false;

        // Calculate the price for this tick to determine minimum WETH volume
        const price = TICK_BASE ** Number(offer.tick);
        const minVolume = calculateMinimumVolume(price);

        // Check if the offer meets minimum volume requirements
        if (offer.gives < minVolume) {
          console.warn(
            `Ask offer at tick ${offer.tick} (price: $${price.toFixed(
              2
            )}) has insufficient volume: ${formatUnits(
              offer.gives,
              TOKEN_DECIMALS.WETH
            )} WETH < ${formatUnits(
              minVolume,
              TOKEN_DECIMALS.WETH
            )} WETH minimum`
          );
          return false;
        }

        return true;
      })
      .map((offer) => ({
        index: offer.index,
        tick: offer.tick,
        gives: offer.gives,
      })),
    bids: sdkDistribution.bids
      .filter((offer) => {
        if (offer.gives <= 0n) return false;

        // For bids, we need to check if the USDC amount is sufficient
        // Calculate the price for this tick
        const price = TICK_BASE ** Number(offer.tick);
        const minWethVolume = calculateMinimumVolume(price);
        const minUsdcVolume = parseUnits(
          (
            Number(formatUnits(minWethVolume, TOKEN_DECIMALS.WETH)) * price
          ).toFixed(TOKEN_DECIMALS.USDC),
          TOKEN_DECIMALS.USDC
        );

        // Check if the offer meets minimum volume requirements
        if (offer.gives < minUsdcVolume) {
          console.warn(
            `Bid offer at tick ${offer.tick} (price: $${price.toFixed(
              2
            )}) has insufficient volume: ${formatUnits(
              offer.gives,
              TOKEN_DECIMALS.USDC
            )} USDC < ${formatUnits(
              minUsdcVolume,
              TOKEN_DECIMALS.USDC
            )} USDC minimum`
          );
          return false;
        }

        return true;
      })
      .map((offer) => ({
        index: offer.index,
        tick: offer.tick,
        gives: offer.gives,
      })),
  };

  const totalBaseNeeded = distribution.asks.reduce(
    (sum, ask) => sum + ask.gives,
    0n
  );
  const totalQuoteNeeded = distribution.bids.reduce(
    (sum, bid) => sum + bid.gives,
    0n
  );

  // Validate that we have at least some valid offers
  if (distribution.asks.length === 0 && distribution.bids.length === 0) {
    throw new Error(
      "No valid offers could be created. Please increase the liquidity amounts to meet minimum volume requirements."
    );
  }

  return { distribution, totalBaseNeeded, totalQuoteNeeded };
}

interface Contracts {
  weth: string;
  usdc: string;
  seeder: string;
  reader: string;
}

async function deployKandel(
  publicClient: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  walletClient: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  contracts: Contracts,
  address: Address
) {
  const olKeyBaseQuote = {
    outbound_tkn: contracts.weth as Address,
    inbound_tkn: contracts.usdc as Address,
    tickSpacing: TICK_SPACING,
  };

  const { request } = await publicClient.simulateContract({
    address: contracts.seeder as Address,
    abi: kandelSeederABI,
    functionName: "sow",
    args: [olKeyBaseQuote, false],
    account: address,
  });

  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  const kandelLog = receipt.logs.find(
    (log: any) => log.address.toLowerCase() === contracts.seeder?.toLowerCase() // eslint-disable-line @typescript-eslint/no-explicit-any
  );

  if (!kandelLog || !kandelLog.data || kandelLog.data.length < 66) {
    throw new Error("Failed to extract Kandel address from logs");
  }

  const kandelAddress = `0x${kandelLog.data.slice(26, 66)}` as Address;
  return { hash, kandelAddress, olKeyBaseQuote };
}

async function approveTokens(
  publicClient: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  walletClient: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  contracts: Contracts,
  address: Address,
  kandelAddress: Address,
  totalBaseNeeded: bigint,
  totalQuoteNeeded: bigint
) {
  const [wethAllowance, usdcAllowance] = await Promise.all([
    publicClient.readContract({
      address: contracts.weth as Address,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address, kandelAddress],
    }),
    publicClient.readContract({
      address: contracts.usdc as Address,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address, kandelAddress],
    }),
  ]);

  if (totalBaseNeeded > 0n && wethAllowance < totalBaseNeeded) {
    const hash = await walletClient.writeContract({
      address: contracts.weth as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: [kandelAddress, totalBaseNeeded],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  if (totalQuoteNeeded > 0n && usdcAllowance < totalQuoteNeeded) {
    const hash = await walletClient.writeContract({
      address: contracts.usdc as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: [kandelAddress, totalQuoteNeeded],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }
}

async function calculateProvision(
  publicClient: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  contracts: Contracts,
  olKey: { outbound_tkn: Address; inbound_tkn: Address; tickSpacing: bigint },
  gasreq: bigint,
  numOffers: number
): Promise<bigint> {
  const provisionPerOffer = await publicClient.readContract({
    address: contracts.reader as Address,
    abi: readerAbi,
    functionName: "getProvisionWithDefaultGasPrice",
    args: [olKey, gasreq],
  });

  const totalProvision = provisionPerOffer * BigInt(numOffers);
  return (totalProvision * 15n) / 10n; // 50% buffer
}

async function populateKandel(
  publicClient: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  walletClient: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  address: Address,
  kandelAddress: Address,
  distribution: Distribution,
  params: DeployParams,
  totalBaseNeeded: bigint,
  totalQuoteNeeded: bigint,
  provision: bigint
) {
  const kandelParams = {
    gasprice: 1,
    gasreq: Number(params.gasreq || "200000"),
    stepSize: Math.floor(params.stepSize) || 1,
    pricePoints: params.pricePoints,
  };

  const { request } = await publicClient.simulateContract({
    address: kandelAddress,
    abi: KandelAbi,
    functionName: "populate",
    args: [distribution, kandelParams, totalBaseNeeded, totalQuoteNeeded],
    value: provision,
    account: address,
  });

  return walletClient.writeContract(request);
}

export function useDeployKandel() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { contracts } = useContracts();
  const [isDeploying, setIsDeploying] = useState(false);
  const queryClient = useQueryClient();

  const deploy = async (
    params: DeployParams,
    onTxHash?: (hash: string) => void
  ) => {
    if (!address || !publicClient || !walletClient) {
      throw new Error("Wallet not connected");
    }

    if (!contracts) {
      throw new Error("Contracts not loaded");
    }

    setIsDeploying(true);

    try {
      // Step 1: Deploy Kandel
      const {
        hash: sowHash,
        kandelAddress,
        olKeyBaseQuote,
      } = await deployKandel(publicClient, walletClient, contracts, address);

      if (onTxHash) {
        onTxHash(sowHash);
      }

      // Step 2: Create distribution
      const { distribution, totalBaseNeeded, totalQuoteNeeded } =
        createDistribution(params, contracts);

      // Step 3: Approve tokens
      await approveTokens(
        publicClient,
        walletClient,
        contracts,
        address,
        kandelAddress,
        totalBaseNeeded,
        totalQuoteNeeded
      );

      // Step 4: Calculate provision
      const gasreq = BigInt(params.gasreq || "200000");
      const totalOffers = distribution.asks.length + distribution.bids.length;
      const provision = await calculateProvision(
        publicClient,
        contracts,
        olKeyBaseQuote,
        gasreq,
        totalOffers
      );

      // Step 5: Populate Kandel
      const populateHash = await populateKandel(
        publicClient,
        walletClient,
        address,
        kandelAddress,
        distribution,
        params,
        totalBaseNeeded,
        totalQuoteNeeded,
        provision
      );

      if (onTxHash) {
        onTxHash(populateHash);
      }

      await publicClient.waitForTransactionReceipt({ hash: populateHash });

      // Step 6: Save deployment
      const deployment = {
        address: kandelAddress,
        deployedBy: address,
        name: `WETH/USDC ${params.minPrice}-${params.maxPrice}`,
        deployedAt: new Date().toISOString(),
        deploymentTx: sowHash,
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
        totalBaseDeposited: formatUnits(totalBaseNeeded, TOKEN_DECIMALS.WETH),
        totalQuoteDeposited: formatUnits(totalQuoteNeeded, TOKEN_DECIMALS.USDC),
        provision: formatEther(provision),
        active: true,
        source: "ui" as const,
      };

      try {
        await fetch("/api/kandels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(deployment),
        });
      } catch {
        // Silently fail - not critical
      }

      // Invalidate React Query cache
      await queryClient.invalidateQueries({ queryKey: ["kandel-addresses"] });
      await queryClient.invalidateQueries({ queryKey: ["kandel-positions"] });

      window.dispatchEvent(
        new CustomEvent(KANDEL_EVENTS.DEPLOYED, {
          detail: { address: kandelAddress },
        })
      );

      return kandelAddress;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied")
      ) {
        // User cancelled the transaction - this is fine
      } else if (errorMessage.includes("insufficient funds")) {
        alert(
          "Insufficient funds. Please ensure you have enough ETH, WETH, and USDC."
        );
      } else {
        alert(`Deployment failed: ${errorMessage}`);
      }

      throw error;
    } finally {
      setIsDeploying(false);
    }
  };

  return {
    deploy,
    isDeploying,
    contracts,
  };
}
