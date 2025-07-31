import type { Address } from "viem";

export interface KandelPosition {
  address: Address;
  owner: Address;
  baseBalance: bigint;
  quoteBalance: bigint;
  provision: bigint;
  activeOffers: number;
  totalOffers: number;
  spread: number;
  priceRange: {
    min: number;
    max: number;
  };
  gasRequirement: number;
  gasprice: number;
  type: string;
  name?: string;
}

export interface Offer {
  id: bigint;
  price: number;
  tick: bigint;
  gives: bigint;
  gasprice: number;
  gasreq: number;
  maker: Address;
  isKandel?: boolean;
  kandelAddress?: Address;
}

export interface OfferDetail {
  id: bigint;
  maker: Address;
  gives: bigint;
  tick: bigint;
  gasprice: number;
  gasreq: number;
}

export interface OLKey {
  outbound_tkn: Address;
  inbound_tkn: Address;
  tickSpacing: bigint;
}

export interface KandelParams {
  name?: string;
  minPrice: number;
  maxPrice: number;
  pricePoints: number;
  baseAmount: string;
  quoteAmount: string;
  stepSize: number;
  gasRequirement: number;
  asksLocalConfig: Address;
  bidsLocalConfig: Address;
  startIndex: number;
  provision: bigint;
}

export interface KandelDeployment {
  address: Address;
  owner: Address;
  timestamp: number;
  name?: string;
}

export interface KandelDeployedEvent extends CustomEvent {
  detail: {
    address: Address;
    name?: string;
  };
}

