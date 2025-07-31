import { TICK_BASE } from "./constants";

export function tickToPrice(tick: bigint): number {
  return Math.pow(TICK_BASE, Number(tick));
}

export function priceToTick(price: number): bigint {
  return BigInt(Math.round(Math.log(price) / Math.log(TICK_BASE)));
}

export function calculateMidPrice(minPrice: number, maxPrice: number): number {
  return Math.sqrt(minPrice * maxPrice);
}

export function formatPrice(price: number, decimals: number = 2): string {
  return price.toFixed(decimals);
}

export function calculatePrice(
  baseAmount: bigint,
  quoteAmount: bigint,
  baseDecimals: number,
  quoteDecimals: number
): number {
  if (baseAmount === 0n) return 0;
  
  const base = Number(baseAmount) / Math.pow(10, baseDecimals);
  const quote = Number(quoteAmount) / Math.pow(10, quoteDecimals);
  
  return quote / base;
}