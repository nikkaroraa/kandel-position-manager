import { useEffect, useState, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useContracts } from "./use-contracts";
import { readerAbi } from "@/src/abi/reader";
import { TOKEN_DECIMALS, TICK_SPACING, KANDEL_EVENTS } from "@/lib/constants";
import { tickToPrice } from "@/lib/price-utils";
import { useQuery } from "@tanstack/react-query";

interface Offer {
  prev: bigint;
  next: bigint;
  tick: bigint;
  gives: bigint;
}

interface OfferDetail {
  maker: string;
  gasreq: bigint;
  kilo_offer_gasbase: bigint;
  gasprice: bigint;
}

export interface ProcessedOffer {
  id: bigint;
  price: number;
  volume: bigint;
  gives: bigint;
  wants: bigint;
  maker: string;
  isKandel: boolean;
}

// Constants
const KANDEL_DEPLOYMENT_REFRESH_DELAY = 2000;
const MAX_OFFERS_TO_FETCH = 50;

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

export function useOrderbook() {
  const publicClient = usePublicClient();
  const { contracts } = useContracts();
  const [asks, setAsks] = useState<ProcessedOffer[]>([]);
  const [bids, setBids] = useState<ProcessedOffer[]>([]);

  // Query for Kandel addresses
  const { data: kandelAddresses = [] } = useQuery({
    queryKey: ["kandel-addresses"],
    queryFn: fetchKandelAddresses,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const fetchOrderbook = useCallback(async () => {
    const kandelAddressSet = new Set(kandelAddresses.map(addr => addr.toLowerCase()));
    if (!publicClient || !contracts) {
      console.log("Skipping orderbook fetch - missing dependencies");
      return { asks: [], bids: [] };
    }

    try {
      // Define OLKeys for WETH/USDC market
      const askOLKey = {
        outbound_tkn: contracts.weth,
        inbound_tkn: contracts.usdc,
        tickSpacing: TICK_SPACING,
      };

      const bidOLKey = {
        outbound_tkn: contracts.usdc,
        inbound_tkn: contracts.weth,
        tickSpacing: TICK_SPACING,
      };

      // Fetch offers from MgvReader
      const [askResult, bidResult] = (await Promise.all([
        publicClient.readContract({
          address: contracts.reader,
          abi: readerAbi,
          functionName: "offerList",
          args: [askOLKey, 0n, BigInt(MAX_OFFERS_TO_FETCH)], // fromId, maxOffers
        }),
        publicClient.readContract({
          address: contracts.reader,
          abi: readerAbi,
          functionName: "offerList",
          args: [bidOLKey, 0n, BigInt(MAX_OFFERS_TO_FETCH)],
        }),
      ])) as [
        [bigint, readonly bigint[], readonly Offer[], readonly OfferDetail[]],
        [bigint, readonly bigint[], readonly Offer[], readonly OfferDetail[]]
      ];

      // Destructure results: [nextOfferId, offerIds, offers, offerDetails]
      const [, askIds, askOffers, askDetails] = askResult;
      const [, bidIds, bidOffers, bidDetails] = bidResult;

      console.log("Orderbook data:", {
        askCount: askOffers?.length || 0,
        bidCount: bidOffers?.length || 0,
        contracts,
        kandelAddresses: Array.from(kandelAddressSet),
      });

      // Process asks (WETH -> USDC)
      const processedAsks = askOffers
        .map((offer, i) => {
          if (offer.gives === 0n) return null;

          // Convert tick to price for WETH/USDC
          const rawPrice = tickToPrice(offer.tick);
          const price =
            rawPrice / Math.pow(10, TOKEN_DECIMALS.WETH - TOKEN_DECIMALS.USDC); // Adjust for decimals
          const gives = offer.gives;
          const wants = BigInt(
            Math.floor(
              Number(formatUnits(gives, TOKEN_DECIMALS.WETH)) *
                price *
                Math.pow(10, TOKEN_DECIMALS.USDC)
            )
          ); // WETH to USDC

          return {
            id: askIds[i],
            price: price,
            volume: gives,
            gives,
            wants,
            maker: askDetails[i].maker,
            isKandel: kandelAddressSet.has(askDetails[i].maker.toLowerCase()),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a!.price - b!.price) as ProcessedOffer[];

      // Process bids (USDC -> WETH)
      const processedBids = bidOffers
        .map((offer, i) => {
          if (offer.gives === 0n) return null;

          // For bids, calculate price as WETH/USDC
          let price: number;
          if (offer.tick < 0n) {
            // Negative ticks from populateFromOffset
            const positiveTick = -offer.tick;
            const rawPrice = tickToPrice(positiveTick);
            price =
              rawPrice /
              Math.pow(10, TOKEN_DECIMALS.WETH - TOKEN_DECIMALS.USDC);
          } else {
            // Positive ticks from populate
            const rawPrice = tickToPrice(offer.tick);
            price =
              rawPrice /
              Math.pow(10, TOKEN_DECIMALS.WETH - TOKEN_DECIMALS.USDC);
          }

          const gives = offer.gives; // USDC amount
          const wethAmount =
            Number(formatUnits(gives, TOKEN_DECIMALS.USDC)) / price;
          const wants = parseUnits(
            wethAmount.toFixed(TOKEN_DECIMALS.WETH),
            TOKEN_DECIMALS.WETH
          );

          return {
            id: bidIds[i],
            price: price,
            volume: wants, // WETH amount for display
            gives,
            wants,
            maker: bidDetails[i].maker,
            isKandel: kandelAddressSet.has(bidDetails[i].maker.toLowerCase()),
          };
        })
        .filter(Boolean)
        .sort((a, b) => b!.price - a!.price) as ProcessedOffer[];

      return { asks: processedAsks, bids: processedBids };
    } catch (error) {
      console.error("Failed to fetch orderbook:", error);
      return { asks: [], bids: [] };
    }
  }, [publicClient, contracts, kandelAddresses]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["orderbook", contracts?.weth, contracts?.usdc, kandelAddresses],
    queryFn: fetchOrderbook,
    enabled: !!publicClient && !!contracts,
    staleTime: 5 * 1000, // Consider data stale after 5 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (data) {
      setAsks(data.asks);
      setBids(data.bids);
    }
  }, [data]);

  // Listen for new Kandel deployments
  useEffect(() => {
    const handleKandelDeployed = () => {
      // Refetch after a short delay
      setTimeout(() => refetch(), KANDEL_DEPLOYMENT_REFRESH_DELAY);
    };

    window.addEventListener(KANDEL_EVENTS.DEPLOYED, handleKandelDeployed);
    return () =>
      window.removeEventListener(KANDEL_EVENTS.DEPLOYED, handleKandelDeployed);
  }, [refetch]);

  return {
    asks,
    bids,
    isLoading: isLoading || false,
    refetch,
  };
}