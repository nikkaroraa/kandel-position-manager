import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { formatUnits, type Address } from "viem";
import { useContracts } from "./use-contracts";
import { useEthPrice } from "./use-eth-price";
import { KandelAbi } from "@/src/abi/kandel";
import { erc20Abi } from "@/src/abi/erc20";
import { readerAbi } from "@/src/abi/reader";
import { MangroveABI } from "@/src/abi/mangrove";

export interface KandelPosition {
  address: string;
  baseToken: string;
  quoteToken: string;
  minPrice: number;
  maxPrice: number;
  pricePoints: number;
  baseBalance: bigint;
  quoteBalance: bigint;
  activeOffers: number;
  totalValue: bigint;
  pnl: bigint;
  isActive: boolean;
  provision: bigint;
  lockedBase: bigint;
  lockedQuote: bigint;
}

const TICK_BASE = 1.0001;

function tickToPrice(tick: bigint): number {
  const rawPrice = Number(TICK_BASE ** Number(tick));
  return rawPrice / Math.pow(10, 18 - 6); // Adjust for WETH/USDC decimals
}

function tickToPriceInverse(tick: bigint): number {
  // For USDC/WETH market (bids), the tick represents USDC per WETH
  // We need to convert to WETH/USDC and handle decimal adjustment
  const rawPrice = Number(TICK_BASE ** Number(tick));
  // For bid market, multiply by decimal adjustment to get WETH/USDC price
  return rawPrice * Math.pow(10, 18 - 6);
}

// Fetch Kandel addresses from API
async function fetchKandelAddresses(): Promise<string[]> {
  try {
    const response = await fetch("/api/kandels");
    if (response.ok) {
      const data = await response.json();
      return data.addresses || [];
    }
  } catch (error) {
    console.error("Failed to load Kandel addresses from API:", error);
  }
  return [];
}

export function useKandelPositions(userAddress?: Address) {
  const publicClient = usePublicClient();
  const { contracts } = useContracts();
  const { ethPrice } = useEthPrice();
  const queryClient = useQueryClient();

  // Query for Kandel addresses
  const { data: kandelAddresses = [] } = useQuery({
    queryKey: ["kandel-addresses"],
    queryFn: fetchKandelAddresses,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Query for positions data
  const fetchPositions = useCallback(async () => {
    if (
      !publicClient ||
      !userAddress ||
      !contracts ||
      kandelAddresses.length === 0
    ) {
      return [];
    }

    const positionsData: KandelPosition[] = [];

    // Fetch data for each Kandel
    for (const kandelAddress of kandelAddresses) {
      try {
        // Check if this Kandel belongs to the user by checking admin
        let admin: Address;
        try {
          admin = (await publicClient.readContract({
            address: kandelAddress as Address,
            abi: KandelAbi,
            functionName: "admin",
          })) as Address;
        } catch (error) {
          console.error(`Failed to read admin for ${kandelAddress}:`, error);
          // This might not be a valid Kandel contract, skip it
          continue;
        }

        // Only show kandels owned by the current user
        if (admin.toLowerCase() !== userAddress.toLowerCase()) {
          continue; // Skip if not owned by user
        }

        // Get base and quote tokens (these should be WETH and USDC)
        const baseToken = contracts.weth;
        const quoteToken = contracts.usdc;

        if (!baseToken || !quoteToken) {
          continue;
        }
        // Helper to create OLKey
        const createOLKey = (outbound: string, inbound: string) => ({
          outbound_tkn: outbound as Address,
          inbound_tkn: inbound as Address,
          tickSpacing: 1n,
        });

        // Get offers from both market directions
        const [askMarket, bidMarket] = await Promise.all([
          publicClient.readContract({
            address: contracts.reader as Address,
            abi: readerAbi,
            functionName: "offerList",
            args: [createOLKey(contracts.weth, contracts.usdc), 0n, 100n],
          }),
          publicClient.readContract({
            address: contracts.reader as Address,
            abi: readerAbi,
            functionName: "offerList",
            args: [createOLKey(contracts.usdc, contracts.weth), 0n, 100n],
          }),
        ]);

        // Get balances
        const [baseBalance, quoteBalance] = await Promise.all([
          publicClient.readContract({
            address: baseToken as Address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [kandelAddress as Address],
          }),
          publicClient.readContract({
            address: quoteToken as Address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [kandelAddress as Address],
          }),
        ]);

        // Helper to process market offers
        const processMarketOffers = (marketData: unknown[]) => {
          if (!marketData[2] || !marketData[3]) return [];

          const offers = marketData[2] as unknown as Array<{
            tick: bigint;
            gives: bigint;
          }>;
          const details = marketData[3] as unknown as Array<{
            maker: string;
          }>;

          return offers
            .map((offer, i) => ({ ...offer, maker: details[i].maker }))
            .filter(
              (offer) =>
                offer.maker.toLowerCase() === kandelAddress.toLowerCase()
            );
        };

        // Process offers from both markets
        const kandelAsks = processMarketOffers(
          askMarket as unknown as unknown[]
        );
        const kandelBids = processMarketOffers(
          bidMarket as unknown as unknown[]
        );

        // Debug logging for ticks
        if (kandelAsks.length > 0 || kandelBids.length > 0) {
          console.log(`Kandel ${kandelAddress} tick values:`, {
            askTicks: kandelAsks.map((o) => Number(o.tick)),
            bidTicks: kandelBids.map((o) => Number(o.tick)),
          });
        }

        // Calculate locked amounts
        const lockedBase = kandelAsks.reduce(
          (sum, offer) => sum + offer.gives,
          0n
        );
        const lockedQuote = kandelBids.reduce(
          (sum, offer) => sum + offer.gives,
          0n
        );

        // Count active offers
        const activeOffers = kandelAsks.length + kandelBids.length;

        // Calculate price range
        const allPrices: number[] = [];

        // Add ask prices
        kandelAsks.forEach((offer, index) => {
          console.log(`Processing ask ${index}, tick: ${offer.tick}`);
          const price = tickToPrice(offer.tick);
          console.log(`Ask ${index} final price: ${price}`);
          if (price > 0 && price < 1000000) {
            allPrices.push(price);
          }
        });

        // Add bid prices (bids are in the inverse market USDC/WETH)
        // For bids, we need to calculate the WETH/USDC price from the USDC/WETH tick
        kandelBids.forEach((offer, index) => {
          let price: number;
          console.log(`Processing bid ${index}, tick: ${offer.tick}`);

          if (offer.tick < 0n) {
            // Negative ticks need special handling
            const positiveTick = -offer.tick;
            const rawPrice = Number(TICK_BASE ** Number(positiveTick));
            const adjustedPrice = rawPrice / Math.pow(10, 18 - 6);
            price = adjustedPrice;
            console.log(`Negative tick calculation:`, {
              originalTick: offer.tick,
              positiveTick,
              rawPrice,
              adjustedPrice,
              finalPrice: price,
            });
          } else {
            price = tickToPriceInverse(offer.tick);
          }

          console.log(`Bid ${index} final price: ${price}`);

          if (price > 0 && price < 1000000) {
            allPrices.push(price);
          }
        });

        // Debug logging
        if (allPrices.length > 0) {
          console.log(`Kandel ${kandelAddress} price calculation:`, {
            askCount: kandelAsks.length,
            bidCount: kandelBids.length,
            allPrices: allPrices.sort((a, b) => a - b),
            minPrice: Math.min(...allPrices),
            maxPrice: Math.max(...allPrices),
          });
        }

        let minPrice = 0;
        let maxPrice = 0;

        if (allPrices.length > 0) {
          minPrice = Math.min(...allPrices);
          maxPrice = Math.max(...allPrices);
        } else if (activeOffers === 0) {
          // If no active offers, the position might have been withdrawn
          // Set prices to 0 to indicate no range
          minPrice = 0;
          maxPrice = 0;
        } else {
          // If we have active offers but couldn't calculate prices, use ETH price as fallback
          minPrice = ethPrice * 0.9;
          maxPrice = ethPrice * 1.1;
        }

        // Get provision from Mangrove contract
        let provision = 0n;
        try {
          provision = await publicClient.readContract({
            address: contracts.mangrove as Address,
            abi: MangroveABI,
            functionName: "balanceOf",
            args: [kandelAddress as Address],
          });
        } catch (error) {
          console.error("Error reading provision:", error);
          // Fallback to ETH balance
          provision = await publicClient.getBalance({
            address: kandelAddress as Address,
          });
        }

        // Skip positions that have been completely withdrawn or have negligible provision
        const MIN_PROVISION = 10000000000000n; // 0.00001 ETH (10^13 wei)
        if (
          baseBalance === 0n &&
          quoteBalance === 0n &&
          provision < MIN_PROVISION &&
          activeOffers === 0
        ) {
          continue;
        }

        // Calculate total value in USDC
        // Use available balance (not locked) for value calculation
        const availableBase = baseBalance - lockedBase;
        const availableQuote = quoteBalance - lockedQuote;

        const midPrice = (minPrice + maxPrice) / 2;
        const baseValueInUsdc =
          Number(formatUnits(availableBase, 18)) * midPrice;
        const quoteValueInUsdc = Number(formatUnits(availableQuote, 6));

        // Include provision value in USD (ETH * price)
        const provisionInEth = Number(formatUnits(provision, 18));
        const provisionValueInUsdc = provisionInEth * ethPrice;

        const totalValue = BigInt(
          Math.floor(
            (baseValueInUsdc + quoteValueInUsdc + provisionValueInUsdc) * 1e6
          )
        );

        // todo: need to work on this further
        const pnl = 0n;

        positionsData.push({
          address: kandelAddress,
          baseToken: "WETH",
          quoteToken: "USDC",
          minPrice,
          maxPrice,
          pricePoints: 10, // Default to 10 as per deployment
          baseBalance,
          quoteBalance,
          activeOffers,
          totalValue,
          pnl,
          isActive: activeOffers > 0,
          provision,
          lockedBase,
          lockedQuote,
        });
      } catch (error) {
        console.error(
          `Error fetching data for Kandel ${kandelAddress}:`,
          error
        );
      }
    }

    return positionsData;
  }, [publicClient, userAddress, kandelAddresses, contracts, ethPrice]);

  const {
    data: positions = [],
    isLoading,
  } = useQuery({
    queryKey: ["kandel-positions", userAddress, kandelAddresses],
    queryFn: fetchPositions,
    enabled: !!publicClient && !!userAddress && !!contracts,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Function to invalidate the cache and refetch
  const invalidateAndRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["kandel-addresses"] });
    queryClient.invalidateQueries({ queryKey: ["kandel-positions"] });
  }, [queryClient]);

  return {
    positions,
    isLoading: isLoading || false,
    refetch: invalidateAndRefetch,
  };
}
