import { formatETH, formatUSDC } from "./format";

export function calculateUSDValue(
  ethBalance: bigint,
  usdcBalance: bigint,
  ethPrice: number
): number {
  const ethValue = parseFloat(formatETH(ethBalance)) * ethPrice;
  const usdcValue = parseFloat(formatUSDC(usdcBalance));
  return ethValue + usdcValue;
}

export function calculateETHValue(ethBalance: bigint, ethPrice: number): number {
  return parseFloat(formatETH(ethBalance)) * ethPrice;
}

export function calculateUSDCValue(usdcBalance: bigint): number {
  return parseFloat(formatUSDC(usdcBalance));
}

export function formatTransactionHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export function getSpinnerClassName(isLoading: boolean, baseClass = "h-3 w-3"): string {
  return `${baseClass} ${isLoading ? "animate-spin" : ""}`;
}