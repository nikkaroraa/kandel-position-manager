import { formatUnits } from "viem";
import {
  TOKEN_DECIMALS,
  FORMAT_THRESHOLDS,
  BLOCKCHAIN_CONSTANTS,
} from "./constants";

export function formatNumber(
  value: string | number,
  decimals?: number
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";

  const fixed = decimals !== undefined ? num.toFixed(decimals) : num.toString();
  const parts = fixed.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function formatBalance(
  value: bigint,
  decimals: number,
  displayDecimals: number = 2
): string {
  const formatted = parseFloat(formatUnits(value, decimals));
  return formatted.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  });
}

export function formatUSDC(value: bigint): string {
  return formatBalance(value, TOKEN_DECIMALS.USDC, 2);
}

export function formatETH(value: bigint, minDecimals: number = 4): string {
  const formatted = parseFloat(formatUnits(value, TOKEN_DECIMALS.ETH));

  if (formatted > 0 && formatted < FORMAT_THRESHOLDS.SCIENTIFIC_NOTATION) {
    return formatted.toExponential(2);
  }

  return formatted.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: minDecimals,
  });
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatUSD(value: number): string {
  if (value > 0 && value < FORMAT_THRESHOLDS.USD_SHOW_CENTS) {
    return `$${value.toFixed(6)}`;
  }

  if (value < FORMAT_THRESHOLDS.USD_SHOW_DECIMALS) {
    return `$${value.toFixed(2)}`;
  }

  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatProvision(value: bigint): string {
  const wei = value;
  const gwei = wei / BLOCKCHAIN_CONSTANTS.GWEI_DIVISOR;
  const formatted = parseFloat(formatUnits(value, TOKEN_DECIMALS.ETH));

  if (formatted > 0 && formatted < FORMAT_THRESHOLDS.ETH_SHOW_GWEI) {
    return `${gwei.toString()} gwei`;
  }

  if (formatted < FORMAT_THRESHOLDS.ETH_EIGHT_DECIMALS) {
    return `${formatted.toFixed(8)} ETH`;
  }

  if (formatted < FORMAT_THRESHOLDS.ETH_SIX_DECIMALS) {
    return `${formatted.toFixed(6)} ETH`;
  }

  return `${formatted.toFixed(4)} ETH`;
}
