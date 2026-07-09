import React, { useState } from 'react';
import { ChainSnapshot } from '../lib/utils';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface ChartPopupProps {
  snapshot: ChainSnapshot;
  strikeRange: number;
  onClose: () => void;
}

export const ChartsPopup: React.FC<ChartPopupProps> = ({ snapshot, strikeRange, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);

  const { rows, atm_index, symbol, expiry } = snapshot;
  const lo = Math.max(0, atm_index - strikeRange);
  const hi = Math.min(rows.length - 1, atm_index + strikeRange);
  const visible = rows.slice(lo, hi + 1);

  const atmStrike = rows[atm_index]?.strike || 0;
  
  // Take nearest 7 strikes for the bar chart
  const byDist = [...visible].sort((a,b) => Math.abs(a.strike - atmStrike) - Math.abs(b.strike - atmStrike));
  const nearest7 = byDist.slice(0, 7).sort((a, b) => a.strike - b.strike);
  const nearest11 = byDist.slice(0, 11).sort((a, b) => a.strike - b.strike);

  const top7Data = nearest7.map(r => ({
    name: r.strike.toString(),
    ceOiChange: r.ce.oi_change,
    peOiChange: r.pe.oi_change,
    isAtm: r.strike === atmStrike
  }));

  const allVisibleData = visible.map(r => ({
    name: r.strike.toString(),
    ceOi: r.ce.oi,
    peOi: r.pe.oi,
    isAtm: r.strike === atmStrike
  }));

  const stacked11Data = nearest11.map(r => {
    const ceOpen = r.ce.oi - r.ce.oi_change;
    const peOpen = r.pe.oi - r.pe.oi_change;

    const ceBase = Math.min(Math.max(0, ceOpen), Math.max(0, r.ce.oi));
    const ceInc = r.ce.oi_change > 0 ? r.ce.oi_change : 0;
    const ceDec = r.ce.oi_change < 0 ? Math.abs(r.ce.oi_change) : 0;

    const peBase = Math.min(Math.max(0, peOpen), Math.max(0, r.pe.oi));
    const peInc = r.pe.oi_change > 0 ? r.pe.oi_change : 0;
    const peDec = r.pe.oi_change < 0 ? Math.abs(r.pe.oi_change) : 0;

    return {
      name: r.strike.toString(),
      ceBase,
      ceInc,
      ceDec,
      peBase,
      peInc,
      peDec,
      isAtm: r.strike === atmStrike,
      rawRows: r
    };
  });

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload.rawRows;
      if (!data) return null;
      const ceOpen = data.ce.oi - data.ce.oi_change;
      const peOpen = data.pe.oi - data.pe.oi_change;
      
      return (
        <div className="bg-[#1a2329] border border-[#2a3843] p-3 rounded shadow-xl text-xs font-mono">
          <div className="text-[#dce6e8] font-bold mb-2 pb-1 border-b border-[#2a3843]">Strike {label}</div>
          
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 pr-4 border-r border-[#1f2a31]">
              <div className="text-[#ef5b5b] font-bold">Call OI</div>
              <div className="text-[#6b7d85] flex justify-between gap-4"><span>Opening</span> <span>{fmt(ceOpen)}</span></div>
              <div className="text-[#6b7d85] flex justify-between gap-4"><span>Change</span> <span className={data.ce.oi_change > 0 ? "text-[#2fd17a]" : data.ce.oi_change < 0 ? "text-[#ef5b5b]" : ""}>{data.ce.oi_change > 0 ? '+' : ''}{fmt(data.ce.oi_change)}</span></div>
              <div className="text-[#dce6e8] flex justify-between gap-4 font-bold border-t border-[#1f2a31] pt-1 mt-1"><span>Current</span> <span>{fmt(data.ce.oi)}</span></div>
            </div>
            
            <div className="flex flex-col gap-1 pl-2">
              <div className="text-[#2fd17a] font-bold">Put OI</div>
              <div className="text-[#6b7d85] flex justify-between gap-4"><span>Opening</span> <span>{fmt(peOpen)}</span></div>
              <div className="text-[#6b7d85] flex justify-between gap-4"><span>Change</span> <span className={data.pe.oi_change > 0 ? "text-[#2fd17a]" : data.pe.oi_change < 0 ? "text-[#ef5b5b]" : ""}>{data.pe.oi_change > 0 ? '+' : ''}{fmt(data.pe.oi_change)}</span></div>
              <div className="text-[#dce6e8] flex justify-between gap-4 font-bold border-t border-[#1f2a31] pt-1 mt-1"><span>Current</span> <span>{fmt(data.pe.oi)}</span></div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const fmt = (v: number) => {
    if (Math.abs(v) >= 10000000) return `${(v/10000000).toFixed(1)}Cr`;
    if (Math.abs(v) >= 100000) return `${(v/100000).toFixed(1)}L`;
    if (Math.abs(v) >= 1000) return `${(v/1000).toFixed(0)}K`;
    return v.toString();
  };

  const atmIndexInVisible = visible.findIndex(r => r.strike === atmStrike);
  const atmPercent = visible.length > 1 ? (atmIndexInVisible / (visible.length - 1)) * 100 : 50;

  const tabLabels = [
    "📊 OI Change per Strike (Top 7)",
    "📈 Cumulative OI (CE vs PE)",
    "📉 OI Change Trend (Top 7)",
    "🟪 OI + Chg from Opening",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0a0d0f] rounded-xl shadow-2xl w-full max-w-[1400px] h-[95vh] flex flex-col overflow-hidden border border-[#1f2a31]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#1f2a31] bg-[#10151a]">
          <div>
            <h2 className="text-base font-bold text-[#dce6e8] flex items-center gap-2">
              OI Charts 
              <span className="text-[#ffd24d] font-mono text-xs px-2 py-0.5 bg-[#241d10] rounded">{symbol}</span>
            </h2>
            <p className="text-xs text-[#6b7d85] mt-1">Expiry: {expiry} • Spot: {snapshot.underlying.toFixed(2)}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 px-3 bg-[#141b21] hover:bg-[#1f2a31] rounded-lg text-xs text-[#dce6e8] transition-colors"
          >
            ✕ Close
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 p-2 bg-[#141b21] border-b border-[#1f2a31]">
          {tabLabels.map((tab, i) => (
            <button 
              key={i} 
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all flex-1 sm:flex-none text-center ${
                activeTab === i 
                ? 'bg-[#ffd24d] shadow-sm text-black' 
                : 'text-[#6b7d85] hover:bg-[#1f2a31] bg-[#1a2329] sm:bg-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Chart Content */}
        <div className="flex-1 p-2 bg-[#0a0d0f] min-h-0 flex flex-col">
          {activeTab === 0 && (
            <div className="h-full flex flex-col">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top7Data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2a31"/>
                  <XAxis dataKey="name" tick={{fill: '#6b7d85', fontSize: 12}} axisLine={{stroke: '#1f2a31'}} tickFormatter={(val) => val === atmStrike.toString() ? `${val} (ATM)` : val} angle={-45} textAnchor="end" height={50}/>
                  <YAxis tick={{fill: '#6b7d85', fontSize: 12}} axisLine={{stroke: '#1f2a31'}} tickFormatter={fmt} width={50} />
                  <RechartsTooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#10151a] border border-[#1f2a31] rounded p-3 shadow-xl">
                            <p className="text-[#dce6e8] font-bold mb-2">{label}</p>
                            {payload.map((entry: any, index: number) => {
                              const val = entry.value as number;
                              const color = val >= 0 ? '#2fd17a' : '#ef5b5b';
                              return (
                                <div key={index} className="flex justify-between gap-4 text-sm mb-1">
                                  <span style={{ color: entry.color }}>{entry.name}:</span>
                                  <span style={{ color: color }} className="font-mono font-medium">
                                    {val > 0 ? '+' : ''}{val.toLocaleString()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{paddingTop: '10px'}}/>
                  <ReferenceLine x={atmStrike.toString()} stroke="#ffffff" strokeWidth={1} label={{ position: 'top', value: `Spot: ${snapshot.underlying.toFixed(2)}`, fill: '#ffffff', fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="#ffffff" strokeWidth={2}/>
                  <Bar dataKey="ceOiChange" name="CE OI Change" maxBarSize={60} fill="#ef5b5b">
                    {top7Data.map((entry, index) => (
                      <Cell key={`cell-ce-${index}`} fill={entry.ceOiChange >= 0 ? '#ef5b5b' : '#a03030'} />
                    ))}
                  </Bar>
                  <Bar dataKey="peOiChange" name="PE OI Change" maxBarSize={60} fill="#2fd17a">
                    {top7Data.map((entry, index) => (
                      <Cell key={`cell-pe-${index}`} fill={entry.peOiChange >= 0 ? '#2fd17a' : '#3a8f5c'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 1 && (
            <div className="h-full flex flex-col relative pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={allVisibleData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2a31"/>
                  <XAxis dataKey="name" tick={{fill: '#6b7d85', fontSize: 11}} axisLine={{stroke: '#1f2a31'}} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{fill: '#6b7d85', fontSize: 12}} axisLine={{stroke: '#1f2a31'}} tickFormatter={fmt} width={50} />
                  <RechartsTooltip 
                    contentStyle={{fill: '#10151a', border: '1px solid #1f2a31', borderRadius: '4px', color: '#dce6e8'}}
                  />
                  <Legend 
                    wrapperStyle={{paddingTop: '10px'}}
                    content={() => (
                      <div className="flex justify-center items-center gap-8 text-sm pt-2">
                        <div className="flex items-center gap-2">
                           <span className="w-3 h-3 bg-[#ef5b5b] inline-block rounded-sm"></span>
                           <span className="text-[#dce6e8] font-medium">Call OI</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="w-3 h-3 bg-[#2fd17a] inline-block rounded-sm"></span>
                           <span className="text-[#dce6e8] font-medium">Put OI</span>
                        </div>
                      </div>
                    )}
                  />
                  <ReferenceLine x={atmStrike.toString()} stroke="#ffd24d" strokeDasharray="4 4" label={{ position: 'top', value: 'ATM', fill: '#ffd24d', fontSize: 10 }} />
                  <Line type="monotone" dataKey="ceOi" name="Call OI" stroke="#ef5b5b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="peOi" name="Put OI" stroke="#2fd17a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>

              {/* Left side labels */}
              <div className="absolute left-[5.5rem] top-12 flex flex-col gap-2 text-[10px] sm:text-xs font-mono font-bold opacity-80 pointer-events-none bg-[#0a0d0f]/80 p-1 rounded">
                <div className="flex items-center gap-2"><div className="w-3 h-[2px] bg-[#ef5b5b]"></div><span className="text-[#ef5b5b]">CALL ITM</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-[2px] bg-[#2fd17a]"></div><span className="text-[#2fd17a]">PUT OTM</span></div>
              </div>

              {/* Right side labels */}
              <div className="absolute right-8 top-12 flex flex-col items-end gap-2 text-[10px] sm:text-xs font-mono font-bold opacity-80 pointer-events-none bg-[#0a0d0f]/80 p-1 rounded">
                <div className="flex items-center gap-2"><span className="text-[#ef5b5b]">CALL OTM</span><div className="w-3 h-[2px] bg-[#ef5b5b]"></div></div>
                <div className="flex items-center gap-2"><span className="text-[#2fd17a]">PUT ITM</span><div className="w-3 h-[2px] bg-[#2fd17a]"></div></div>
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="h-full flex flex-col relative pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={top7Data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2a31"/>
                  <XAxis dataKey="name" tick={{fill: '#6b7d85', fontSize: 12}} axisLine={{stroke: '#1f2a31'}} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{fill: '#6b7d85', fontSize: 12}} axisLine={{stroke: '#1f2a31'}} tickFormatter={fmt} width={50} />
                  <RechartsTooltip 
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#10151a] border border-[#1f2a31] rounded p-3 shadow-xl">
                            <p className="text-[#dce6e8] font-bold mb-2">{label}</p>
                            {payload.map((entry: any, index: number) => {
                              const val = entry.value as number;
                              const color = val >= 0 ? '#2fd17a' : '#ef5b5b';
                              return (
                                <div key={index} className="flex justify-between gap-4 text-sm mb-1">
                                  <span style={{ color: entry.color }}>{entry.name}:</span>
                                  <span style={{ color: color }} className="font-mono font-medium">
                                    {val > 0 ? '+' : ''}{val.toLocaleString()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{paddingTop: '10px'}}
                    content={() => (
                      <div className="flex justify-center items-center gap-8 text-sm pt-2">
                        <div className="flex items-center gap-2">
                           <span className="w-3 h-3 bg-[#ef5b5b] inline-block rounded-sm"></span>
                           <span className="text-[#dce6e8] font-medium">CE OI Chg</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="w-3 h-3 bg-[#2fd17a] inline-block rounded-sm"></span>
                           <span className="text-[#dce6e8] font-medium">PE OI Chg</span>
                        </div>
                      </div>
                    )}
                  />
                  <ReferenceLine y={0} stroke="#445157" strokeWidth={1}/>
                  <ReferenceLine x={atmStrike.toString()} stroke="#ffffff" strokeWidth={1} label={{ position: 'top', value: `Spot: ${snapshot.underlying.toFixed(2)}`, fill: '#ffffff', fontSize: 10 }} />
                  <Line type="monotone" dataKey="ceOiChange" name="CE OI Chg" stroke="#ef5b5b" strokeWidth={2} dot={{ fill: '#ef5b5b', r: 4 }} />
                  <Line type="monotone" dataKey="peOiChange" name="PE OI Chg" stroke="#2fd17a" strokeWidth={2} dot={{ fill: '#2fd17a', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>

              {/* Left side labels */}
              <div className="absolute left-[5.5rem] top-12 flex flex-col gap-2 text-[10px] sm:text-xs font-mono font-bold opacity-80 pointer-events-none bg-[#0a0d0f]/80 p-1 rounded">
                <div className="flex items-center gap-2"><div className="w-3 h-[2px] bg-[#ef5b5b]"></div><span className="text-[#ef5b5b]">CALL ITM</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-[2px] bg-[#2fd17a]"></div><span className="text-[#2fd17a]">PUT OTM</span></div>
              </div>

              {/* Right side labels */}
              <div className="absolute right-8 top-12 flex flex-col items-end gap-2 text-[10px] sm:text-xs font-mono font-bold opacity-80 pointer-events-none bg-[#0a0d0f]/80 p-1 rounded">
                <div className="flex items-center gap-2"><span className="text-[#ef5b5b]">CALL OTM</span><div className="w-3 h-[2px] bg-[#ef5b5b]"></div></div>
                <div className="flex items-center gap-2"><span className="text-[#2fd17a]">PUT ITM</span><div className="w-3 h-[2px] bg-[#2fd17a]"></div></div>
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="h-full flex flex-col">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stacked11Data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }} barGap={2}>
                  <defs>
                    <pattern id="ce-hatched" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                      <rect width="6" height="6" fill="#ef5b5b" />
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#b83030" strokeWidth="3" />
                    </pattern>
                    <pattern id="pe-hatched" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                      <rect width="6" height="6" fill="#2fd17a" />
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#1e8f52" strokeWidth="3" />
                    </pattern>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2a31"/>
                  <XAxis dataKey="name" tick={{fill: '#6b7d85', fontSize: 11}} axisLine={{stroke: '#1f2a31'}} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{fill: '#6b7d85', fontSize: 12}} axisLine={{stroke: '#1f2a31'}} tickFormatter={fmt} width={50} />
                  <RechartsTooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                    content={customTooltip}
                  />
                  <Legend wrapperStyle={{paddingTop: '10px'}}/>
                  <ReferenceLine x={atmStrike.toString()} stroke="#ffffff" strokeWidth={1} label={{ position: 'top', value: `Spot: ${snapshot.underlying.toFixed(2)}`, fill: '#ffffff', fontSize: 10 }} />
                  
                  {/* CE Side */}
                  <Bar dataKey="ceBase" name="CE Base OI" stackId="ce" fill="#ef5b5b" maxBarSize={40} />
                  <Bar dataKey="ceInc" name="CE Increase" stackId="ce" fill="url(#ce-hatched)" maxBarSize={40} />
                  <Bar dataKey="ceDec" name="CE Decrease" stackId="ce" fill="transparent" stroke="#b83030" strokeWidth={1} strokeDasharray="2 2" maxBarSize={40} />
                  
                  {/* PE Side */}
                  <Bar dataKey="peBase" name="PE Base OI" stackId="pe" fill="#2fd17a" maxBarSize={40} />
                  <Bar dataKey="peInc" name="PE Increase" stackId="pe" fill="url(#pe-hatched)" maxBarSize={40} />
                  <Bar dataKey="peDec" name="PE Decrease" stackId="pe" fill="transparent" stroke="#1e8f52" strokeWidth={1} strokeDasharray="2 2" maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

