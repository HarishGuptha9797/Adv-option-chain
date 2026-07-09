import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Normal distribution CDF
function cdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// Normal distribution PDF
function pdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2.0 * Math.PI);
}

// Calculate Option Greeks
export function calculateGreeks(
  type: 'CE' | 'PE',
  S: number, // Underlying price
  K: number, // Strike price
  T: number, // Time to expiration in years
  r: number, // Risk-free rate (e.g., 0.10 for 10%)
  sigma: number // Volatility (e.g., 0.20 for 20%)
): Greeks {
  if (T <= 0 || sigma <= 0) return { delta: 0, gamma: 0, theta: 0, vega: 0 };
  
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  const pdf_d1 = pdf(d1);
  const cdf_d1 = cdf(d1);
  const cdf_neg_d1 = cdf(-d1);
  const cdf_d2 = cdf(d2);
  const cdf_neg_d2 = cdf(-d2);
  
  const gamma = pdf_d1 / (S * sigma * Math.sqrt(T));
  const vega = S * pdf_d1 * Math.sqrt(T) / 100; // Divided by 100 for 1% change
  
  let delta, theta;
  if (type === 'CE') {
    delta = cdf_d1;
    theta = (- (S * sigma * pdf_d1) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * cdf_d2) / 365;
  } else {
    delta = cdf_d1 - 1;
    theta = (- (S * sigma * pdf_d1) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * cdf_neg_d2) / 365;
  }
  
  return { delta, gamma, theta, vega };
}

// Data structures mimicking Python ones
export interface SideData {
  ltp: number;
  p_change: number;
  oi: number;
  oi_change: number;
  recent_oi_change?: number;
  oi_change_pct: number;
  volume: number;
  iv: number;
  greeks?: Greeks;
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface StrikeRow {
  strike: number;
  ce: SideData;
  pe: SideData;
}

export interface ChainSnapshot {
  symbol: string;
  underlying: number;
  expiry: string;
  timestamp: string;
  rows: StrikeRow[];
  vix?: number | null;
  vix_change?: number | null;
  total_call_oi: number;
  total_put_oi: number;
  total_call_oi_change: number;
  total_put_oi_change: number;
  pcr: number;
  atm_index: number;
}
