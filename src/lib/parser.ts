import { StrikeRow, ChainSnapshot, SideData, calculateGreeks } from "./utils";

export const INDICES = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"];

function extractRows(raw: any): any[] {
  if (typeof raw !== "object" || !raw) return [];
  const paths = [
    ["records", "data"],
    ["data"],
    ["filtered", "data"],
    ["optionChain", "data"],
  ];
  for (const path of paths) {
    let node = raw;
    for (const key of path) {
      if (node && typeof node === "object" && key in node) {
        node = node[key];
      } else {
        node = null;
        break;
      }
    }
    if (Array.isArray(node) && node.length > 0) {
      return node;
    }
  }
  return [];
}

function extractUnderlying(raw: any): number {
  if (!raw) return 0;
  const paths = [
    ["records", "underlyingValue"],
    ["underlyingValue"],
    ["filtered", "underlyingValue"],
    ["spotPrice"],
    ["records", "spotPrice"],
  ];
  for (const path of paths) {
    let node = raw;
    for (const key of path) {
      if (node && typeof node === "object" && key in node) {
        node = node[key];
      } else {
        node = null;
        break;
      }
    }
    if (typeof node === "number") return node;
  }
  return 0.0;
}

function extractTimestamp(raw: any): string {
  if (!raw) return "";
  const paths = [
    ["records", "timestamp"],
    ["timestamp"],
    ["lastUpdateTime"],
  ];
  for (const path of paths) {
    let node = raw;
    for (const key of path) {
      if (node && typeof node === "object" && key in node) {
        node = node[key];
      } else {
        node = null;
        break;
      }
    }
    if (typeof node === "string" && node) return node;
  }
  return "—";
}

export function parseChain(
  symbol: string,
  raw: any,
  expiry: string,
  vix: number | null,
  vix_change: number | null
): ChainSnapshot {
  const data = extractRows(raw);
  const underlying = extractUnderlying(raw);
  const timestamp = extractTimestamp(raw);
  
  // Calculate time to expiration (T in years)
  let T = 0;
  try {
    const expDate = new Date(expiry + " 15:30:00");
    const curDate = timestamp !== "—" ? new Date(timestamp) : new Date();
    const diffMs = expDate.getTime() - curDate.getTime();
    T = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365));
  } catch (e) {
    T = 0;
  }

  const rows: StrikeRow[] = [];
  for (const d of data) {
    if (typeof d !== "object" || (!d.CE && !d.PE)) continue;
    const strike = d.strikePrice;
    if (strike === undefined || strike === null) continue;

    const parseSide = (rawSide: any, type: 'CE' | 'PE'): SideData => {
      rawSide = rawSide || {};
      const oi = parseInt(rawSide.openInterest || 0, 10);
      const oi_chg = parseInt(rawSide.changeinOpenInterest || 0, 10);
      const prev_oi = oi - oi_chg;
      const oi_change_pct = prev_oi !== 0 ? (oi_chg / prev_oi) * 100 : 0.0;
      const iv = parseFloat(rawSide.impliedVolatility || 0.0);
      
      const greeks = calculateGreeks(type, underlying, strike, T, 0.10, iv / 100);

      return {
        ltp: parseFloat(rawSide.lastPrice || 0.0),
        p_change: parseFloat(rawSide.pChange || 0.0),
        oi,
        oi_change: oi_chg,
        oi_change_pct,
        volume: parseInt(rawSide.totalTradedVolume || 0, 10),
        iv,
        greeks
      };
    };

    rows.push({
      strike: parseFloat(strike),
      ce: parseSide(d.CE, 'CE'),
      pe: parseSide(d.PE, 'PE'),
    });
  }

  rows.sort((a, b) => a.strike - b.strike);

  let total_call_oi = 0;
  let total_put_oi = 0;
  let total_call_oi_change = 0;
  let total_put_oi_change = 0;

  for (const r of rows) {
    total_call_oi += r.ce.oi;
    total_put_oi += r.pe.oi;
    total_call_oi_change += r.ce.oi_change;
    total_put_oi_change += r.pe.oi_change;
  }

  const pcr = total_call_oi ? total_put_oi / total_call_oi : 0.0;

  let atm_index = 0;
  if (rows.length > 0) {
    atm_index = rows.reduce(
      (bestIndex, row, index) =>
        Math.abs(row.strike - underlying) < Math.abs(rows[bestIndex].strike - underlying) ? index : bestIndex,
      0
    );
  }

  return {
    symbol,
    underlying,
    expiry,
    timestamp,
    rows,
    vix,
    vix_change,
    total_call_oi,
    total_put_oi,
    total_call_oi_change,
    total_put_oi_change,
    pcr,
    atm_index,
  };
}

export function buildupTag(price_change: number, oi_change: number): string {
  if (price_change > 0 && oi_change > 0) return "LB";
  if (price_change < 0 && oi_change > 0) return "SB";
  if (price_change > 0 && oi_change < 0) return "SC";
  if (price_change < 0 && oi_change < 0) return "LC";
  return "—";
}
