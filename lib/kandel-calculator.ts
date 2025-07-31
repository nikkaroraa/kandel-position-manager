import { formatUnits, parseUnits } from "viem";
import { TOKEN_DECIMALS, TICK_BASE, GAS_CONFIG } from "./constants";

export function calculatePositionValue(
  position: {
    baseBalance: bigint;
    quoteBalance: bigint;
    provision: bigint;
  },
  prices: {
    ethPrice: number;
  }
): number {
  const wethAmount = parseFloat(
    formatUnits(position.baseBalance, TOKEN_DECIMALS.WETH)
  );
  const usdcAmount = parseFloat(
    formatUnits(position.quoteBalance, TOKEN_DECIMALS.USDC)
  );
  const provisionAmount = parseFloat(
    formatUnits(position.provision, TOKEN_DECIMALS.ETH)
  );

  const wethValue = wethAmount * prices.ethPrice;
  const usdcValue = usdcAmount;
  const provisionValue = provisionAmount * prices.ethPrice;

  return wethValue + usdcValue + provisionValue;
}

export function calculateProvisionRequired(
  numOffers: number,
  gasRequirement: number = GAS_CONFIG.DEFAULT_GAS_REQUIREMENT,
  gasPrice: number = GAS_CONFIG.DEFAULT_GAS_PRICE
): bigint {
  const provisionPerOffer = BigInt(gasRequirement) * BigInt(gasPrice);
  const totalProvision = provisionPerOffer * BigInt(numOffers);
  const bufferMultiplier = Math.floor(
    GAS_CONFIG.PROVISION_BUFFER_MULTIPLIER * 100
  );

  return (totalProvision * BigInt(bufferMultiplier)) / 100n;
}

export function calculateOfferDistribution(
  minPrice: number,
  maxPrice: number,
  pricePoints: number,
  stepSize: number
): {
  askPrices: number[];
  bidPrices: number[];
  midPrice: number;
  totalOffers: number;
} {
  const midPrice = Math.sqrt(minPrice * maxPrice);
  const askPrices: number[] = [];
  const bidPrices: number[] = [];

  let currentPrice = midPrice;
  for (let i = 0; i < pricePoints; i++) {
    currentPrice = currentPrice * Math.pow(1 + stepSize / 100, 1);
    if (currentPrice <= maxPrice) {
      askPrices.push(currentPrice);
    }
  }

  currentPrice = midPrice;
  for (let i = 0; i < pricePoints; i++) {
    currentPrice = currentPrice / Math.pow(1 + stepSize / 100, 1);
    if (currentPrice >= minPrice) {
      bidPrices.push(currentPrice);
    }
  }

  return {
    askPrices: askPrices.sort((a, b) => a - b),
    bidPrices: bidPrices.sort((a, b) => b - a),
    midPrice,
    totalOffers: askPrices.length + bidPrices.length,
  };
}

export function calculateSpread(askPrice: number, bidPrice: number): number {
  if (bidPrice === 0) return 0;
  return ((askPrice - bidPrice) / bidPrice) * 100;
}

export function priceToTick(price: number): bigint {
  return BigInt(Math.round(Math.log(price) / Math.log(TICK_BASE)));
}

export function tickToPrice(tick: bigint): number {
  return Math.pow(TICK_BASE, Number(tick));
}

export function calculatePnL(
  initialValue: number,
  currentValue: number
): {
  absolute: number;
  percentage: number;
} {
  const absolute = currentValue - initialValue;
  const percentage = initialValue > 0 ? (absolute / initialValue) * 100 : 0;

  return { absolute, percentage };
}

export function calculateOfferAmounts(
  totalBaseAmount: string,
  totalQuoteAmount: string,
  numAskOffers: number,
  numBidOffers: number
): {
  basePerAsk: bigint;
  quotePerBid: bigint;
} {
  const baseAmount = parseUnits(totalBaseAmount, TOKEN_DECIMALS.WETH);
  const quoteAmount = parseUnits(totalQuoteAmount, TOKEN_DECIMALS.USDC);

  const basePerAsk = numAskOffers > 0 ? baseAmount / BigInt(numAskOffers) : 0n;
  const quotePerBid =
    numBidOffers > 0 ? quoteAmount / BigInt(numBidOffers) : 0n;

  return { basePerAsk, quotePerBid };
}

export function isValidPriceRange(minPrice: number, maxPrice: number): boolean {
  return minPrice > 0 && maxPrice > minPrice && maxPrice / minPrice <= 100;
}

export function calculateGeometricRatio(
  minPrice: number,
  maxPrice: number,
  numPoints: number
): number {
  if (numPoints <= 1) return 1;
  return Math.pow(maxPrice / minPrice, 1 / (numPoints - 1));
}
