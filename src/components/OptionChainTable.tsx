import React from 'react';
import { ChainSnapshot, StrikeRow } from '../lib/utils';
import { buildupTag } from '../lib/parser';
import { cn } from '../lib/utils';
import { Activity, BarChart2, TrendingUp, TrendingDown, RefreshCw, Sun, Moon, ArrowDownToLine, Settings2 } from 'lucide-react';

interface OptionChainTableProps {
  snapshot: ChainSnapshot | null;
  strikeRange: number;
}

const numFmt = new Intl.NumberFormat('en-IN');

const formatNum = (v: number) => numFmt.format(Math.round(v));
const formatPct = (v: number) => (v > 0 ? '+' : '') + v.toFixed(2) + '%';
const formatPrice = (v: number) => v.toFixed(2);

const TagBadge = ({ pChange, oiChange }: { pChange: number; oiChange: number }) => {
  const tag = buildupTag(pChange, oiChange);
  const colorClass = 
    tag === 'LB' || tag === 'SC' ? 'text-[#2fd17a] border-[#2fd17a]' :
    tag === 'SB' || tag === 'LC' ? 'text-[#ef5b5b] border-[#ef5b5b]' :
    'text-[#6b7d85] border-[#445157]';

  return (
    <div className={cn("px-1.5 py-0.5 border rounded text-[10px] font-bold font-mono tracking-wider w-8 text-center bg-transparent", colorClass)}>
      {tag}
    </div>
  );
};

export const OptionChainTable: React.FC<OptionChainTableProps> = ({ snapshot, strikeRange }) => {
  const [selectedGreeks, setSelectedGreeks] = React.useState<string[]>([]);

  if (!snapshot || !snapshot.rows.length) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-gray-500 space-y-4">
        <Activity className="w-12 h-12 opacity-20 animate-pulse" />
        <p>No option chain data available. Select a symbol and fetch.</p>
      </div>
    );
  }

  const { rows, atm_index } = snapshot;
  const lo = Math.max(0, atm_index - strikeRange);
  const hi = Math.min(rows.length - 1, atm_index + strikeRange);
  const visible = rows.slice(lo, hi + 1);

  const visibleMaxOi = Math.max(1, ...visible.map(r => Math.max(r.ce.oi, r.pe.oi)));
  const visibleMaxOiChg = Math.max(1, ...visible.map(r => Math.max(Math.abs(r.ce.oi_change), Math.abs(r.pe.oi_change))));

  // Top 3 calls and puts ranking
  const topCe = [...visible].sort((a,b) => b.ce.oi - a.ce.oi).slice(0,3);
  const topPe = [...visible].sort((a,b) => b.pe.oi - a.pe.oi).slice(0,3);
  const ceRank = Object.fromEntries(topCe.filter(r => r.ce.oi > 0).map((r, i) => [r.strike, i + 1]));
  const peRank = Object.fromEntries(topPe.filter(r => r.pe.oi > 0).map((r, i) => [r.strike, i + 1]));

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-x-auto bg-white dark:bg-[#0a0d0f] shadow-sm subtle-scroll">
      <div className="flex flex-col min-w-[1000px]">
        {/* Header grouped */}
        <div className="flex items-center text-xs font-bold font-sans text-neutral-500 bg-neutral-100 dark:bg-[#10151a] py-2 border-b border-neutral-200 dark:border-neutral-800 px-2">
        
        <div className="flex-1 flex items-center gap-4">
          <div className="flex items-center gap-3 text-[10px]">
            {['iv', 'delta', 'gamma', 'theta', 'vega'].map(g => (
              <label key={g} className="flex items-center gap-1 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={selectedGreeks.includes(g)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedGreeks([...selectedGreeks, g]);
                    else setSelectedGreeks(selectedGreeks.filter(x => x !== g));
                  }}
                  className="accent-indigo-500"
                />
                <span className="uppercase text-neutral-600 dark:text-neutral-400 font-bold">{g}</span>
              </label>
            ))}
          </div>
          <div className="text-center text-green-600 dark:text-green-500 flex-1 pr-4">CALLS</div>
        </div>
        <div className="w-24 text-center">STRIKE</div>
        <div className="flex-1 text-center text-red-600 dark:text-rose-500 relative">
          PUTS
        </div>
      </div>
      
      {/* Detail Headers */}
      <div className="flex items-center text-[10px] font-bold text-neutral-500 bg-neutral-50 dark:bg-[#10151a] py-1.5 border-b border-neutral-200 dark:border-neutral-800 tracking-wider">
        <div className="flex-1 flex px-2 space-x-2" style={{ maxWidth: 'calc(50% - 3rem)'}}>
          {selectedGreeks.map(g => <div key={g} className="w-14 text-center text-indigo-500">{g.toUpperCase()}</div>)}
          <div className="w-12 text-center">BUILDUP</div>
          <div className="flex-1 text-right pr-2">OI</div>
          <div className="flex-1 text-right pr-2">RECENT OI</div>
          <div className="flex-1 text-right pr-2">OI CHG</div>
          <div className="w-28 text-right pr-2">LTP (LTP %)</div>
        </div>
        <div className="w-24 px-2"></div>
        <div className="flex-1 flex px-2 space-x-2" style={{ maxWidth: 'calc(50% - 3rem)'}}>
          <div className="w-28 text-left pl-2">LTP (LTP %)</div>
          <div className="flex-1 text-left pl-2">OI CHG</div>
          <div className="flex-1 text-left pl-2">RECENT OI</div>
          <div className="flex-1 text-left pl-2">OI</div>
          <div className="w-12 text-center">BUILDUP</div>
          {selectedGreeks.map(g => <div key={g} className="w-14 text-center text-indigo-500">{g.toUpperCase()}</div>)}
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col max-h-[600px] overflow-y-auto subtle-scroll">
        {visible.map((row, idx) => {
          const isAtm = (lo + idx) === atm_index;
          return (
            <div key={row.strike} className={cn(
              "flex items-center py-1 border-b text-xs font-mono group hover:bg-neutral-50 dark:hover:bg-[#141b21] transition-colors",
              isAtm ? "bg-amber-50 dark:bg-[#241d10] border-[#ffd24d] dark:border-[#ffd24d] border-y shadow-none" : "border-neutral-100 dark:border-[#1f2a31]",
              idx % 2 === 0 && !isAtm ? "bg-neutral-50/50 dark:bg-[#0d1216]" : ""
            )}>
              {/* CALLS Side */}
              <div className="flex-1 flex items-center px-2 space-x-2" style={{ maxWidth: 'calc(50% - 3rem)' }}>
                {selectedGreeks.map(g => (
                  <div key={g} className="w-14 text-center text-[10px] text-indigo-500 font-medium font-mono">
                    {g === 'iv' ? row.ce.iv.toFixed(2) : row.ce.greeks?.[g as keyof typeof row.ce.greeks]?.toFixed(3) || '—'}
                  </div>
                ))}
                <div className="w-12 flex justify-center"><TagBadge pChange={row.ce.p_change} oiChange={row.ce.oi_change}/></div>
                
                {/* CE OI */}
                <div className={cn(
                  "flex-1 text-right relative flex items-center justify-end h-8 group-hover:z-10",
                  ceRank[row.strike] ? "border border-[#ffd24d] shadow-none" : ""
                )}>
                  {ceRank[row.strike] && (
                    <div className="absolute left-0 top-0 bg-[#ffd24d] text-black text-[9px] px-1.5 font-bold flex items-center h-[14px]">
                      #{ceRank[row.strike]}
                    </div>
                  )}
                  {row.ce.oi > 0 && (
                    <div 
                      className="absolute bottom-1 right-1 h-[2px] bg-[#ef5b5b] rounded-sm"
                      style={{ width: `calc(${(row.ce.oi / visibleMaxOi) * 100}% - 4px)` }}
                    />
                  )}
                  <span className="relative z-10 text-neutral-800 dark:text-[#dce6e8] pr-2">{formatNum(row.ce.oi)}</span>
                </div>
                {/* CE RECENT OI CHG */}
                <div className="flex-1 text-right relative flex items-center justify-end h-8">
                  {row.ce.recent_oi_change !== undefined && Math.abs(row.ce.recent_oi_change) > 0 && (
                    <div 
                      className={cn("absolute bottom-1 right-1 h-[2px] rounded-sm", row.ce.recent_oi_change > 0 ? "bg-[#2fd17a]" : "bg-[#ef5b5b]")}
                      style={{ width: `calc(${(Math.abs(row.ce.recent_oi_change) / visibleMaxOiChg) * 100}% - 4px)` }}
                    />
                  )}
                  <span className={cn(
                    "relative z-10 pr-2",
                    row.ce.recent_oi_change && row.ce.recent_oi_change > 0 ? "text-emerald-500 dark:text-[#2fd17a]" : row.ce.recent_oi_change && row.ce.recent_oi_change < 0 ? "text-rose-500 dark:text-[#ef5b5b]" : "text-neutral-400 dark:text-[#6b7d85]"
                  )}>
                    {row.ce.recent_oi_change !== undefined ? (row.ce.recent_oi_change > 0 ? '+' : '') + formatNum(row.ce.recent_oi_change) : '—'}
                  </span>
                </div>
                {/* CE OI CHG */}
                <div className="flex-1 text-right relative flex items-center justify-end h-8">
                  {Math.abs(row.ce.oi_change) > 0 && (
                    <div 
                      className={cn("absolute bottom-1 right-1 h-[2px] rounded-sm", row.ce.oi_change > 0 ? "bg-[#2fd17a]" : "bg-[#ef5b5b]")}
                      style={{ width: `calc(${(Math.abs(row.ce.oi_change) / visibleMaxOiChg) * 100}% - 4px)` }}
                    />
                  )}
                  <span className={cn(
                    "relative z-10 pr-2",
                    row.ce.oi_change > 0 ? "text-emerald-500 dark:text-[#2fd17a]" : row.ce.oi_change < 0 ? "text-rose-500 dark:text-[#ef5b5b]" : "text-neutral-400 dark:text-[#6b7d85]"
                  )}>
                    {row.ce.oi_change > 0 ? '+' : ''}{formatNum(row.ce.oi_change)}
                  </span>
                </div>

                <div className="w-28 flex justify-end items-baseline gap-1 pr-2">
                  <span className="font-medium text-neutral-800 dark:text-[#dce6e8]">{formatPrice(row.ce.ltp)}</span>
                  <span className={cn("text-[9px] font-bold", row.ce.p_change > 0 ? "text-emerald-500 dark:text-[#2fd17a]" : row.ce.p_change < 0 ? "text-rose-500 dark:text-[#ef5b5b]" : "text-neutral-400 dark:text-[#6b7d85]")}>
                    ({formatPct(row.ce.p_change)})
                  </span>
                </div>
              </div>

              {/* STRIKE */}
              <div className="w-24 text-center flex justify-center items-center">
                <span className={cn(
                  "px-3 py-1 text-sm font-sans font-bold flex items-center gap-1.5",
                  isAtm ? "text-[#ffd24d]" : "text-neutral-800 dark:text-[#dce6e8]"
                )}>
                  {formatNum(row.strike)} {isAtm && <span className="text-[10px] pb-0.5">●</span>}
                </span>
              </div>

              {/* PUTS Side */}
              <div className="flex-1 flex items-center px-2 space-x-2" style={{ maxWidth: 'calc(50% - 3rem)' }}>
                <div className="w-28 flex justify-start items-baseline gap-1 pl-2">
                  <span className="font-medium text-neutral-800 dark:text-[#dce6e8]">{formatPrice(row.pe.ltp)}</span>
                  <span className={cn("text-[9px] font-bold", row.pe.p_change > 0 ? "text-emerald-500 dark:text-[#2fd17a]" : row.pe.p_change < 0 ? "text-rose-500 dark:text-[#ef5b5b]" : "text-neutral-400 dark:text-[#6b7d85]")}>
                    ({formatPct(row.pe.p_change)})
                  </span>
                </div>
                
                {/* PE OI CHG */}
                <div className="flex-1 text-left relative flex items-center h-8">
                  {Math.abs(row.pe.oi_change) > 0 && (
                    <div 
                      className={cn("absolute bottom-1 left-1 h-[2px] rounded-sm", row.pe.oi_change > 0 ? "bg-[#2fd17a]" : "bg-[#ef5b5b]")}
                      style={{ width: `calc(${(Math.abs(row.pe.oi_change) / visibleMaxOiChg) * 100}% - 4px)` }}
                    />
                  )}
                  <span className={cn(
                    "relative z-10 pl-2",
                    row.pe.oi_change > 0 ? "text-emerald-500 dark:text-[#2fd17a]" : row.pe.oi_change < 0 ? "text-rose-500 dark:text-[#ef5b5b]" : "text-neutral-400 dark:text-[#6b7d85]"
                  )}>
                    {row.pe.oi_change > 0 ? '+' : ''}{formatNum(row.pe.oi_change)}
                  </span>
                </div>

                
                {/* PE RECENT OI CHG */}
                <div className="flex-1 text-left relative flex items-center h-8">
                  {row.pe.recent_oi_change !== undefined && Math.abs(row.pe.recent_oi_change) > 0 && (
                    <div 
                      className={cn("absolute bottom-1 left-1 h-[2px] rounded-sm", row.pe.recent_oi_change > 0 ? "bg-[#2fd17a]" : "bg-[#ef5b5b]")}
                      style={{ width: `calc(${(Math.abs(row.pe.recent_oi_change) / visibleMaxOiChg) * 100}% - 4px)` }}
                    />
                  )}
                  <span className={cn(
                    "relative z-10 pl-2",
                    row.pe.recent_oi_change && row.pe.recent_oi_change > 0 ? "text-emerald-500 dark:text-[#2fd17a]" : row.pe.recent_oi_change && row.pe.recent_oi_change < 0 ? "text-rose-500 dark:text-[#ef5b5b]" : "text-neutral-400 dark:text-[#6b7d85]"
                  )}>
                    {row.pe.recent_oi_change !== undefined ? (row.pe.recent_oi_change > 0 ? '+' : '') + formatNum(row.pe.recent_oi_change) : '—'}
                  </span>
                </div>
                {/* PE OI */}
                <div className={cn(
                  "flex-1 text-left relative flex items-center justify-start h-8 group-hover:z-10",
                  peRank[row.strike] ? "border border-[#ffd24d] shadow-none" : ""
                )}>
                   {peRank[row.strike] && (
                    <div className="absolute left-0 top-0 bg-[#ffd24d] text-black text-[9px] px-1.5 font-bold flex items-center h-[14px]">
                      #{peRank[row.strike]}
                    </div>
                  )}
                  {row.pe.oi > 0 && (
                    <div 
                      className="absolute bottom-1 left-1 h-[2px] bg-[#2fd17a] rounded-sm"
                      style={{ width: `calc(${(row.pe.oi / visibleMaxOi) * 100}% - 4px)` }}
                    />
                  )}
                  <span className="relative z-10 text-neutral-800 dark:text-[#dce6e8] pl-2">{formatNum(row.pe.oi)}</span>
                </div>
                
                <div className="w-12 flex justify-center"><TagBadge pChange={row.pe.p_change} oiChange={row.pe.oi_change}/></div>
                {selectedGreeks.map(g => (
                  <div key={g} className="w-14 text-center text-[10px] text-indigo-500 font-medium font-mono">
                    {g === 'iv' ? row.pe.iv.toFixed(2) : row.pe.greeks?.[g as keyof typeof row.pe.greeks]?.toFixed(3) || '—'}
                  </div>
                ))}
              </div>

            </div>
          )
        })}
      </div>
      
      {/* Legend Footer */}
      <div className="bg-neutral-50 dark:bg-[#10151a] border-t border-neutral-200 dark:border-neutral-800 p-2 flex text-[10px] items-center gap-6 overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-2 font-mono"><span className="text-[#2fd17a]">LB</span> <span className="text-[#6b7d85] font-sans">Long Buildup (Price ↑ OI ↑)</span></div>
        <div className="flex items-center gap-2 font-mono"><span className="text-[#ef5b5b]">SB</span> <span className="text-[#6b7d85] font-sans">Short Buildup (Price ↓ OI ↑)</span></div>
        <div className="flex items-center gap-2 font-mono"><span className="text-[#2fd17a]">SC</span> <span className="text-[#6b7d85] font-sans">Short Covering (Price ↑ OI ↓)</span></div>
        <div className="flex items-center gap-2 font-mono"><span className="text-[#ef5b5b]">LC</span> <span className="text-[#6b7d85] font-sans">Long Unwinding (Price ↓ OI ↓)</span></div>
        <div className="flex items-center gap-2 ml-auto pr-4">
          <div className="w-3 h-3 bg-transparent border border-[#ffd24d] rounded-sm"></div>
          <span className="text-[#6b7d85]">Top 3 Highest OI</span>
        </div>
      </div>
      </div>
    </div>
  );
};
