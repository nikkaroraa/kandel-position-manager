import { parseUnits } from "viem";

interface KandelCalculationParams {
  minPrice: number;
  maxPrice: number;
  pricePoints: number;
  stepSize: number;
  baseAmount: bigint;
  quoteAmount: bigint;
}

interface KandelParams {
  spread: bigint;
  ratio: bigint;
  priceRatio: bigint;
  baseMidPrice: bigint;
  firstAskIndex: bigint;
  bidGives: bigint[];
  askGives: bigint[];
}

const TICK_BASE = 1.0001;
const PRECISION = 1e18;

export function calculateKandelParams(
  params: KandelCalculationParams
): KandelParams {
  const { minPrice, maxPrice, pricePoints, stepSize, baseAmount, quoteAmount } =
    params;

  // Calculate price ratio and spread
  const priceRatio = BigInt(Math.floor(stepSize * PRECISION));
  const spread = BigInt(Math.floor((maxPrice / minPrice - 1) * PRECISION));

  // Calculate mid price
  const midPrice = Math.sqrt(minPrice * maxPrice);
  const baseMidPrice = BigInt(Math.floor(midPrice * PRECISION));

  // Calculate ratio for geometric distribution
  const ratio = BigInt(
    Math.floor(Math.pow(maxPrice / minPrice, 1 / (pricePoints - 1)) * PRECISION)
  );

  // Determine first ask index (offers above mid price)
  const firstAskIndex = BigInt(Math.ceil(pricePoints / 2));

  // Calculate gives amounts for each price point
  const bidGives: bigint[] = [];
  const askGives: bigint[] = [];

  // Distribute liquidity geometrically
  const totalBids = Number(firstAskIndex);
  const totalAsks = pricePoints - totalBids;

  // Quote amount for bids (buying with USDC)
  const quotePerBid = quoteAmount / BigInt(totalBids);
  for (let i = 0; i < totalBids; i++) {
    bidGives.push(quotePerBid);
  }

  // Base amount for asks (selling WETH)
  const basePerAsk = baseAmount / BigInt(totalAsks);
  for (let i = 0; i < totalAsks; i++) {
    askGives.push(basePerAsk);
  }

  return {
    spread,
    ratio,
    priceRatio,
    baseMidPrice,
    firstAskIndex,
    bidGives,
    askGives,
  };
}

export function priceToTick(price: number): bigint {
  return BigInt(Math.floor(Math.log(price) / Math.log(TICK_BASE)));
}

export function tickToPrice(tick: bigint): number {
  return TICK_BASE ** Number(tick);
}

export function calculateMinimumVolume(price: number): bigint {
  // Mangrove requires minimum volume to prevent dust
  // The minimum is designed to ensure offers are economically viable
  // considering gas costs for takers
  const minUsdValue = 10; // $10 minimum per offer
  const wethAmount = minUsdValue / price;

  // Ensure we have at least some minimum amount even at very high prices
  const absoluteMinimum = 0.001; // 0.001 WETH minimum
  const finalAmount = Math.max(wethAmount, absoluteMinimum);

  return parseUnits(finalAmount.toFixed(18), 18);
}

export function calculateProvision(
  gasreq: bigint,
  gasprice: bigint,
  numOffers: number
): bigint {
  // Provision = gasreq * gasprice * numOffers * PROVISION_FACTOR
  const PROVISION_FACTOR = BigInt(2); // Safety factor
  return gasreq * gasprice * BigInt(numOffers) * PROVISION_FACTOR;
}
