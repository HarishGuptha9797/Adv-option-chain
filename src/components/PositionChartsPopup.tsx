import React, { useState } from 'react';
import { ChainSnapshot } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface ChartPopupProps {
  snapshot: ChainSnapshot;
  strikeRange: number;
  onClose: () => void;
}

export const PositionChartsPopup: React.FC<ChartPopupProps> = ({ snapshot, strikeRange: initialStrikeRange, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [localStrikeRange, setLocalStrikeRange] = useState(7); // default 7 (which means 7 nearest)

  const { rows, atm_index, symbol, expiry } = snapshot;
  const atmStrike = rows[atm_index]?.strike || 0;
  
  // Sort by distance to ATM, then take 'localStrikeRange' nearest, then sort by strike
  const byDist = [...rows].sort((a,b) => Math.abs(a.strike - atmStrike) - Math.abs(b.strike - atmStrike));
  const nearestN = byDist.slice(0, localStrikeRange).sort((a, b) => a.strike - b.strike);

  const chartData = nearestN.map(r => ({
    name: r.strike.toString(),
    cePos: Math.round(r.ce.oi * r.ce.ltp),
    pePos: Math.round(r.pe.oi * r.pe.ltp),
    cePosChg: Math.round(r.ce.oi_change * r.ce.ltp),
    pePosChg: Math.round(r.pe.oi_change * r.pe.ltp),
    isAtm: r.strike === atmStrike,
    rawRows: r
  }));

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload.rawRows;
      if (!data) return null;
      
      return (
        <div className="bg-[#1a2329] border border-[#2a3843] p-3 rounded shadow-xl text-xs font-mono">
          <div className="text-[#dce6e8] font-bold mb-2 pb-1 border-b border-[#2a3843]">Strike {label}</div>
          
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 pr-4 border-r border-[#1f2a31]">
              <div className="text-[#ef5b5b] font-bold">Call</div>
              <div className="text-[#6b7d85] flex justify-between gap-4"><span>OI</span> <span>{fmt(data.ce.oi)}</span></div>
              <div className="text-[#6b7d85] flex justify-between gap-4"><span>OI Chg</span> <span>{fmt(data.ce.oi_change)}</span></div>
              <div className="text-[#6b7d85] flex justify-between gap-4"><span>LTP</span> <span>₹{data.ce.ltp.toFixed(2)}</span></div>
              <div className="text-[#ef5b5b] flex justify-between gap-4 font-bold border-t border-[#1f2a31] pt-1 mt-1"><span>Pos</span> <span>{fmt(Math.round(data.ce.oi * data.ce.ltp))}</span></div>
              <div className="text-[#ef5b5b] flex justify-between gap-4 font-bold border-t border-[#1f2a31] pt-1 mt-1"><span>Pos Chg</span> <span>{fmt(Math.round(data.ce.oi_change * data.ce.ltp))}</span></div>
            </div>
            
            <div className="flex flex-col gap-1 pl-2">
              <div className="text-[#2fd17a] font-bold">Put</div>
              <div className="text-[#6b7d85] flex justify-between gap-4"><span>OI</span> <span>{fmt(data.pe.oi)}</span></div>
              <div className="text-[#6b7d85] flex justify-between gap-4"><span>OI Chg</span> <span>{fmt(data.pe.oi_change)}</span></div>
              <div className="text-[#6b7d85] flex justify-between gap-4"><span>LTP</span> <span>₹{data.pe.ltp.toFixed(2)}</span></div>
              <div className="text-[#2fd17a] flex justify-between gap-4 font-bold border-t border-[#1f2a31] pt-1 mt-1"><span>Pos</span> <span>{fmt(Math.round(data.pe.oi * data.pe.ltp))}</span></div>
              <div className="text-[#2fd17a] flex justify-between gap-4 font-bold border-t border-[#1f2a31] pt-1 mt-1"><span>Pos Chg</span> <span>{fmt(Math.round(data.pe.oi_change * data.pe.ltp))}</span></div>
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

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const strike = payload.value;
    const data = chartData.find(d => d.name === strike);
    if (!data) return null;
    
    if (activeTab === 0) {
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={14} textAnchor="middle" fill="#6b7d85" fontSize={11}>
            {strike === atmStrike.toString() ? `${strike} (ATM)` : strike}
          </text>
          <text x={-20} y={0} dy={30} textAnchor="middle" fill="#ef5b5b" fontSize={10} fontWeight="bold">
            {fmt(data.cePos)}
          </text>
          <text x={20} y={0} dy={30} textAnchor="middle" fill="#2fd17a" fontSize={10} fontWeight="bold">
            {fmt(data.pePos)}
          </text>
          <text x={-20} y={0} dy={44} textAnchor="middle" fill="#ef5b5b" fontSize={9} opacity={0.8}>
            {data.cePosChg > 0 ? '+' : ''}{fmt(data.cePosChg)}
          </text>
          <text x={20} y={0} dy={44} textAnchor="middle" fill="#2fd17a" fontSize={9} opacity={0.8}>
            {data.pePosChg > 0 ? '+' : ''}{fmt(data.pePosChg)}
          </text>
        </g>
      );
    } else {
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={14} textAnchor="middle" fill="#6b7d85" fontSize={11}>
            {strike === atmStrike.toString() ? `${strike} (ATM)` : strike}
          </text>
          <text x={-20} y={0} dy={30} textAnchor="middle" fill="#ef5b5b" fontSize={10} fontWeight="bold">
            {fmt(data.cePosChg)}
          </text>
          <text x={20} y={0} dy={30} textAnchor="middle" fill="#2fd17a" fontSize={10} fontWeight="bold">
            {fmt(data.pePosChg)}
          </text>
        </g>
      );
    }
  };

  const tabLabels = [
    "💰 Net Position (OI * LTP)",
    "📈 Today Added Value (OI Chg * LTP)",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0a0d0f] rounded-xl shadow-2xl w-full max-w-[1400px] h-[85vh] flex flex-col overflow-hidden border border-[#1f2a31]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#1f2a31] bg-[#10151a]">
          <div>
            <h2 className="text-base font-bold text-[#dce6e8] flex items-center gap-2">
              Position Charts 
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
            <div className="flex-1 flex flex-col min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2a31"/>
                  <XAxis dataKey="name" tick={<CustomXAxisTick />} axisLine={{stroke: '#1f2a31'}} height={60} />
                  <YAxis tick={{fill: '#6b7d85', fontSize: 12}} axisLine={{stroke: '#1f2a31'}} tickFormatter={fmt} width={50} />
                  <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={customTooltip} />
                  <Legend wrapperStyle={{paddingTop: '10px'}}/>
                  <ReferenceLine x={atmStrike.toString()} stroke="#ffffff" strokeWidth={1} label={{ position: 'top', value: `Spot ${snapshot.underlying.toFixed(2)}`, fill: '#ffffff', fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="#ffffff" strokeWidth={2}/>
                  <Bar dataKey="cePos" name="CE Position" maxBarSize={60} fill="#ef5b5b">
                    {chartData.map((entry, index) => <Cell key={`cell-ce-${index}`} fill="#ef5b5b" />)}
                  </Bar>
                  <Bar dataKey="pePos" name="PE Position" maxBarSize={60} fill="#2fd17a">
                    {chartData.map((entry, index) => <Cell key={`cell-pe-${index}`} fill="#2fd17a" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 1 && (
            <div className="flex-1 flex flex-col min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2a31"/>
                  <XAxis dataKey="name" tick={<CustomXAxisTick />} axisLine={{stroke: '#1f2a31'}} height={60} />
                  <YAxis tick={{fill: '#6b7d85', fontSize: 12}} axisLine={{stroke: '#1f2a31'}} tickFormatter={fmt} width={50} />
                  <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={customTooltip} />
                  <Legend wrapperStyle={{paddingTop: '10px'}}/>
                  <ReferenceLine x={atmStrike.toString()} stroke="#ffffff" strokeWidth={1} label={{ position: 'top', value: `Spot ${snapshot.underlying.toFixed(2)}`, fill: '#ffffff', fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="#ffffff" strokeWidth={2}/>
                  <Bar dataKey="cePosChg" name="CE Pos Change" maxBarSize={60} fill="#ef5b5b">
                    {chartData.map((entry, index) => <Cell key={`cell-ce-${index}`} fill={entry.cePosChg >= 0 ? '#ef5b5b' : '#a03030'} />)}
                  </Bar>
                  <Bar dataKey="pePosChg" name="PE Pos Change" maxBarSize={60} fill="#2fd17a">
                    {chartData.map((entry, index) => <Cell key={`cell-pe-${index}`} fill={entry.pePosChg >= 0 ? '#2fd17a' : '#3a8f5c'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Controls */}
          <div className="mt-2 pt-2 border-t border-[#1f2a31] flex justify-center items-center gap-4">
            <span className="text-sm font-bold text-[#6b7d85]">Strikes to Show:</span>
            <input 
              type="range" 
              min="3" 
              max="21" 
              step="2"
              value={localStrikeRange} 
              onChange={e => setLocalStrikeRange(Number(e.target.value))}
              className="w-48 accent-[#ffd24d]"
            />
            <span className="text-sm font-bold text-[#dce6e8] w-8">{localStrikeRange}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
