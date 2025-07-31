export const TOKEN_DECIMALS = {
  WETH: 18,
  USDC: 6,
  ETH: 18,
} as const;

export const TICK_BASE = 1.0001;
export const TICK_SPACING = 1n;

export const REFRESH_INTERVALS = {
  ORDERBOOK: 5000,
  POSITIONS: 10000,
  PRICE: 30000,
} as const;

export const TIMEOUTS = {
  TOAST_SUCCESS: 3000,
  TOAST_ERROR: 5000,
  COPY_FEEDBACK: 2000,
  POSITION_REFRESH_DELAY: 5000,
} as const;

export const MIN_PROVISION = 10000000000000n;
export const MIN_VOLUME = 1000000n;

export const DEFAULT_KANDEL_PARAMS = {
  PRICE_POINTS: 10,
  STEP_SIZE: 1,
  GAS_REQUIREMENT: 200000,
  BASE_AMOUNT: "0.1",
  QUOTE_AMOUNT: "250",
  DEFAULT_MIN_PRICE: 3230,
  DEFAULT_MAX_PRICE: 4370,
} as const;

export const PRICE_PRECISION = 2;
export const AMOUNT_PRECISION = 6;

export const KANDEL_EVENTS = {
  DEPLOYED: "kandel-deployed",
  CLOSED: "kandel-closed",
  UPDATED: "kandel-updated",
} as const;

export const ERROR_MESSAGES = {
  INSUFFICIENT_BALANCE: "Insufficient balance",
  TRANSACTION_FAILED: "Transaction failed",
  INVALID_PRICE_RANGE: "Invalid price range",
  NO_KANDELS_FOUND: "No Kandel positions found",
  CONTRACT_NOT_DEPLOYED: "Contracts not deployed. Please run deploy-contracts.",
} as const;

export const NETWORK_CONFIG = {
  31337: {
    name: "Anvil Local",
    rpcUrl: "http://localhost:8545",
  },
} as const;

export const UI_CONFIG = {
  MAX_VISIBLE_ORDERS: 15,
  PRICE_DIRECTION_TIMEOUT: 1000,
  KANDEL_REFRESH_DELAY: 1000,
  ORDER_LIST_HEIGHT: 280,
  TOAST_POSITION: "top-right" as const,
} as const;

export const PRICE_RANGE_PRESETS = {
  TIGHT: { label: "Tight ±2%", value: 2 },
  NORMAL: { label: "Normal ±5%", value: 5 },
  WIDE: { label: "Wide ±10%", value: 10 },
  VOLATILE: { label: "Volatile ±15%", value: 15 },
} as const;

export const GAS_CONFIG = {
  DEFAULT_GAS_REQUIREMENT: 128000,
  DEFAULT_GAS_PRICE: 20,
  PROVISION_BUFFER_MULTIPLIER: 1.5,
  MIN_PROVISION_PER_OFFER: 0.001,
} as const;

export const ANIMATION_DURATION = {
  FLASH: 500,
  FADE: 300,
  SLIDE: 200,
} as const;

export const PRICE_SLIDER_CONFIG = {
  MIN_PERCENTAGE: -30,
  MAX_PERCENTAGE: 30,
  STEP: 0.5,
} as const;

export const FORM_CONFIG = {
  WETH_AMOUNT_STEP: "0.01",
  USDC_AMOUNT_STEP: "10",
  PRICE_POINTS_MIN: 5,
  PRICE_POINTS_MAX: 30,
  MAX_OFFERS_PER_KANDEL: 100n,
  SKELETON_COUNT: 2,
} as const;

export const DEFAULT_VALUES = {
  FALLBACK_ETH_PRICE: 2500,
  DEFAULT_PRICE_RANGE: { min: 2000, max: 3000 },
  MINT_AMOUNTS: { WETH: "10", USDC: "25000" },
} as const;

export const DELAYS = {
  COPY_FEEDBACK: 2000,
  MODAL_CLOSE: 2000,
  KANDEL_DEPLOYMENT_REFRESH: 2000,
  POSITION_REFETCH: 3000,
} as const;

export const FORMAT_THRESHOLDS = {
  SCIENTIFIC_NOTATION: 0.0001,
  USD_SHOW_CENTS: 0.01,
  USD_SHOW_DECIMALS: 1,
  ETH_SHOW_GWEI: 0.000001,
  ETH_EIGHT_DECIMALS: 0.00001,
  ETH_SIX_DECIMALS: 0.01,
  PRICE_SANITY_CHECK: 1000000,
} as const;

export const BLOCKCHAIN_CONSTANTS = {
  GWEI_DIVISOR: 1_000_000_000n,
  ANVIL_CHAIN_ID: 31337,
} as const;

export const ORDERBOOK_CONFIG = {
  MAX_OFFERS_TO_FETCH: 50,
} as const;

export const CACHE_CONFIG = {
  COINGECKO_REVALIDATE: 60,
} as const;
