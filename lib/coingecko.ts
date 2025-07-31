import { DEFAULT_VALUES, CACHE_CONFIG } from "./constants";

const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";

export interface PriceData {
  ethereum: {
    usd: number;
  };
}

export async function getETHPriceInUSD(): Promise<number> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add API key to headers if available (for Pro API)
    if (apiKey) {
      headers["x-cg-pro-api-key"] = apiKey;
    }

    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=ethereum&vs_currencies=usd`,
      {
        headers,
        next: { revalidate: CACHE_CONFIG.COINGECKO_REVALIDATE }, // Cache for configured seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch price: ${response.statusText}`);
    }

    const data: PriceData = await response.json();

    return data.ethereum.usd;
  } catch (error) {
    console.error("Error fetching ETH price from Coingecko:", error);
    // Return a fallback price if API fails
    return DEFAULT_VALUES.FALLBACK_ETH_PRICE;
  }
}

export async function getETHPriceInUSDC(): Promise<number> {
  // USDC is pegged to USD, so ETH/USDC price is essentially the same as ETH/USD
  return getETHPriceInUSD();
}
