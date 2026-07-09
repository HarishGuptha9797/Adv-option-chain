import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, FileText, Database, TrendingUp, BarChart2, ChevronRight, Clock, MoveRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface FileStat {
  name: string;
  path: string;
  symbol?: string;
  size: number;
  mtime: string;
}

interface HistoricalDataRow {
  CapturedAt: string;
  Time: string;
  Symbol: string;
  Expiry: string;
  Underlying: number;
  VIX: number;
  Strike: number;
  CE_LTP: number;
  CE_OI: number;
  CE_OI_Chg: number;
  CE_Vol: number;
  PE_LTP: number;
  PE_OI: number;
  PE_OI_Chg: number;
  PE_Vol: number;
}

export function HistoricalTab() {
  const [files, setFiles] = useState<FileStat[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileStat | null>(null);
  
  const [csvData, setCsvData] = useState<HistoricalDataRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [timeIndex, setTimeIndex] = useState(0);
  const [compareWindow, setCompareWindow] = useState<'day' | '5m' | '10m' | '15m' | '30m' | '1h' | '2h' | '3h' | 'custom'>('day');
  const [customStartIdx, setCustomStartIdx] = useState(0);
  const [srLevel, setSrLevel] = useState<1 | 2 | 3 | 'all'>(1);

  useEffect(() => {
    fetchFiles(true);
  }, []);

  const fetchFiles = async (isInitial = false) => {
    setLoadingFiles(true);
    try {
      const res = await fetch('/api/db/files');
      if (res.ok) {
        let data; try { data = await res.json(); } catch(e) { console.error("res.json error in " + "src/components/HistoricalTab.tsx", e); return; }
        const fetchedFiles = data.files || [];
        
        // Sort files by date (newest first based on filename)
        fetchedFiles.sort((a: FileStat, b: FileStat) => {
          return b.name.localeCompare(a.name);
        });
        
        setFiles(fetchedFiles);
        
        if (fetchedFiles.length > 0) {
          if (isInitial) {
            loadFile(fetchedFiles[0]);
          } else {
            // Manual refresh: reload the currently selected file or the most recent one
            const currentFile = selectedFile || fetchedFiles[0];
            const fileToLoad = fetchedFiles.find(f => f.path === currentFile.path) || fetchedFiles[0];
            loadFile(fileToLoad);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadFile = async (file: FileStat) => {
    setSelectedFile(file);
    setLoadingData(true);
    try {
      const res = await fetch(`/api/db/files/${file.path}`);
      if (!res.ok) throw new Error('Failed to load file');
      const text = await res.text();
      
      const lines = text.trim().split('\n');
      if (lines.length > 1) {
        // Assume first line is header
        const rows: HistoricalDataRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 15) {
            rows.push({
              CapturedAt: parts[0],
              Time: parts[1],
              Symbol: parts[2],
              Expiry: parts[3],
              Underlying: parseFloat(parts[4]),
              VIX: parseFloat(parts[5]),
              Strike: parseFloat(parts[6]),
              CE_LTP: parseFloat(parts[7]),
              CE_OI: parseFloat(parts[8]),
              CE_OI_Chg: parseFloat(parts[9]),
              CE_Vol: parseFloat(parts[10]),
              PE_LTP: parseFloat(parts[11]),
              PE_OI: parseFloat(parts[12]),
              PE_OI_Chg: parseFloat(parts[13]),
              PE_Vol: parseFloat(parts[14]),
            });
          }
        }
        setCsvData(rows);
        
        const groups = new Set<string>();
        rows.forEach(r => groups.add(r.CapturedAt));
        
        setTimeIndex(Math.max(0, groups.size - 1)); // Jump to the latest available time snapshot
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  // Process data for charts
  const timeSnapshots = useMemo(() => {
    if (!csvData.length) return [];
    
    // Group by CapturedAt
    const groups = new Map<string, HistoricalDataRow[]>();
    csvData.forEach(row => {
      if (!groups.has(row.CapturedAt)) {
        groups.set(row.CapturedAt, []);
      }
      groups.get(row.CapturedAt)!.push(row);
    });
    
    return Array.from(groups.entries()).map(([time, rows]) => {
      rows.sort((a, b) => a.Strike - b.Strike);
      return { time, rows };
    }).sort((a, b) => a.time.localeCompare(b.time));
  }, [csvData]);

  const timeTicks = useMemo(() => {
    return timeSnapshots.map(s => s.time).filter(time => {
      const parts = time.split(':');
      if (parts.length < 2) return false;
      const m = parseInt(parts[1], 10);
      return m % 5 === 0;
    });
  }, [timeSnapshots]);

  const currentSnapshot = timeSnapshots[timeIndex];
  const compareSnapshot = useMemo(() => {
    if (!timeSnapshots.length || !currentSnapshot) return null;
    if (compareWindow === 'day') return timeSnapshots[0];
    if (compareWindow === 'custom') return timeSnapshots[customStartIdx] || timeSnapshots[0];
    
    const parseTimeStr = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    
    const currentMins = parseTimeStr(currentSnapshot.time);
    let diff = 5;
    if (compareWindow === '10m') diff = 10;
    else if (compareWindow === '15m') diff = 15;
    else if (compareWindow === '30m') diff = 30;
    else if (compareWindow === '1h') diff = 60;
    else if (compareWindow === '2h') diff = 120;
    else if (compareWindow === '3h') diff = 180;
    
    const targetMins = currentMins - diff;
    let bestIdx = 0;
    for (let i = timeIndex; i >= 0; i--) {
      if (parseTimeStr(timeSnapshots[i].time) <= targetMins) {
        bestIdx = i;
        break;
      }
    }
    return timeSnapshots[bestIdx];
  }, [timeSnapshots, timeIndex, compareWindow, customStartIdx, currentSnapshot]);

  // Support / Resistance over time
  const srData = useMemo(() => {
    return timeSnapshots.map(snap => {
      const underlying = snap.rows[0]?.Underlying || 0;
      
      const sortedCe = [...snap.rows].sort((a, b) => b.CE_OI - a.CE_OI);
      const sortedPe = [...snap.rows].sort((a, b) => b.PE_OI - a.PE_OI);
      
      return {
        time: snap.time,
        Underlying: underlying,
        Res1: sortedCe[0]?.Strike || 0,
        Res2: sortedCe[1]?.Strike || 0,
        Res3: sortedCe[2]?.Strike || 0,
        Sup1: sortedPe[0]?.Strike || 0,
        Sup2: sortedPe[1]?.Strike || 0,
        Sup3: sortedPe[2]?.Strike || 0,
      };
    });
  }, [timeSnapshots]);

  if (!files.length && !loadingFiles) {
    return (
      <div className="bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 text-center text-neutral-500">
        No historical data found. Enable and wait for cron snapshots.
      </div>
    );
  }

  
  // Highlight top 3 positions
  let top3Ce: number[] = [];
  let top3Pe: number[] = [];
  let barData: any[] = [];
  let atmStrike = 0;

  if (currentSnapshot) {
    const underlying = currentSnapshot.rows[0]?.Underlying || 0;
    const sortedCe = [...currentSnapshot.rows].sort((a, b) => b.CE_OI - a.CE_OI).map(r => r.Strike);
    const sortedPe = [...currentSnapshot.rows].sort((a, b) => b.PE_OI - a.PE_OI).map(r => r.Strike);
    top3Ce = sortedCe.slice(0, 3);
    top3Pe = sortedPe.slice(0, 3);
    
    barData = [...currentSnapshot.rows].sort((a, b) => a.Strike - b.Strike).map(r => {
      let ceOiChg = timeIndex === 0 ? 0 : r.CE_OI_Chg;
      let peOiChg = timeIndex === 0 ? 0 : r.PE_OI_Chg;
      
      const diff = Math.abs(r.Strike - underlying);
      if (!atmStrike || diff < Math.abs(atmStrike - underlying)) {
        atmStrike = r.Strike;
      }

      
      if (timeIndex > 0 && compareSnapshot) {
        const compRow = compareSnapshot.rows.find(cr => cr.Strike === r.Strike);
        if (compRow) {
          ceOiChg = r.CE_OI - compRow.CE_OI;
          peOiChg = r.PE_OI - compRow.PE_OI;
        }
      }
      
      return {
        strike: r.Strike,
        ceOi: r.CE_OI,
        peOi: r.PE_OI,
        ceOiChg,
        peOiChg,
        isTopCe: top3Ce.includes(r.Strike) ? top3Ce.indexOf(r.Strike) + 1 : 0,
        isTopPe: top3Pe.includes(r.Strike) ? top3Pe.indexOf(r.Strike) + 1 : 0,
      };
    });
  }

  const getCeColor = (rank: number) => {
    if (rank === 1) return '#dc2626'; // Top 1 strong red
    if (rank === 2) return '#ef4444'; 
    if (rank === 3) return '#f87171';
    return '#fca5a5'; // Base red
  };
  
  const getPeColor = (rank: number) => {
    if (rank === 1) return '#16a34a'; // Top 1 strong green
    if (rank === 2) return '#22c55e';
    if (rank === 3) return '#4ade80';
    return '#86efac'; // Base green
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#1a2329] border border-neutral-200 dark:border-neutral-800 p-3 rounded-lg shadow-xl text-xs font-mono">
          <div className="text-neutral-900 dark:text-neutral-100 font-bold mb-2 pb-1 border-b border-neutral-200 dark:border-neutral-800">Strike {label}</div>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex justify-between gap-4 mb-1" style={{ color: p.color || p.fill }}>
              <span>{p.name}</span>
              <span className="font-bold">{p.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#1a2329] border border-neutral-200 dark:border-neutral-800 p-3 rounded-lg shadow-xl text-xs font-mono">
          <div className="text-neutral-900 dark:text-neutral-100 font-bold mb-2 pb-1 border-b border-neutral-200 dark:border-neutral-800">Time {label}</div>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex justify-between gap-4 mb-1" style={{ color: p.color || p.fill }}>
              <span>{p.name}</span>
              <span className="font-bold">{p.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderTimeframeSelector = () => (
    <div className="mt-4 flex flex-wrap gap-2">
      {[
        { v: 'day', l: 'Full Day' },
        { v: '5m', l: '5 Min' },
        { v: '10m', l: '10 Min' },
        { v: '15m', l: '15 Min' },
        { v: '30m', l: '30 Min' },
        { v: '1h', l: '1 Hr' },
        { v: '2h', l: '2 Hr' },
        { v: 'custom', l: 'Custom' },
      ].map(opt => (
        <button
          key={opt.v}
          onClick={() => setCompareWindow(opt.v as any)}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-colors border ${
            compareWindow === opt.v 
              ? 'bg-blue-500 text-white border-blue-500' 
              : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          {opt.l}
        </button>
      ))}
      {compareWindow === 'custom' && (
        <select
          value={customStartIdx}
          onChange={e => setCustomStartIdx(parseInt(e.target.value))}
          className="bg-neutral-50 dark:bg-[#141b21] border border-neutral-200 dark:border-neutral-800 rounded-full px-3 py-1 text-xs font-bold text-neutral-600 dark:text-neutral-400 outline-none"
        >
          {timeSnapshots.map((snap, i) => (
            <option key={snap.time} value={i}>{snap.time}</option>
          ))}
        </select>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Sidebar: Files */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              Snapshots
            </h3>
            <button onClick={() => fetchFiles(false)} className="p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
            {files.map(f => (
              <button 
                key={f.path}
                onClick={() => loadFile(f)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
                  selectedFile?.path === f.path 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50' 
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </div>
                <ChevronRight className="w-3 h-3 opacity-50 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="lg:col-span-9 space-y-6">
        {!selectedFile ? (
          <div className="bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-12 text-center flex flex-col items-center justify-center">
            <Database className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mb-4" />
            <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-2">Select a snapshot</h3>
            <p className="text-sm text-neutral-500 max-w-md">
              Choose a historical data file from the sidebar to visualize open interest and track moving resistance and support levels.
            </p>
          </div>
        ) : loadingData ? (
          <div className="bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-12 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : currentSnapshot ? (
          <>
            {/* Playback Controls */}
            <div className="bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-full sm:flex-1">
                  <label className="flex items-center justify-between text-xs font-bold tracking-wider text-neutral-500 mb-3">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> TIMELINE</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{currentSnapshot.time}</span>
                  </label>
                  <input 
                    type="range" 
                    min={0} 
                    max={timeSnapshots.length - 1} 
                    value={timeIndex}
                    onChange={(e) => setTimeIndex(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-2 font-mono">
                    <span>{timeSnapshots[0]?.time}</span>
                    <span>{timeSnapshots[timeSnapshots.length - 1]?.time}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-center sm:items-end min-w-[120px]">
                  <span className="text-[10px] font-bold tracking-wider text-neutral-500 mb-1">UNDERLYING</span>
                  <span className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
                    {currentSnapshot.rows[0]?.Underlying?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Positions / OI Chart */}
              <div className="bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-amber-500" />
                    Open Interest Positions
                  </h3>
                  <div className="flex gap-3 text-[10px] font-bold text-neutral-500">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-green-500"></div> PE (Support)</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-500"></div> CE (Resistance)</span>
                  </div>
                </div>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                      <XAxis dataKey="strike" tick={{ fontSize: 10, fill: '#6b7280' }} tickMargin={10} minTickGap={20} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} width={45} tickFormatter={(val) => (val/10000000).toFixed(2) + 'Cr'} />
                      <RechartsTooltip 
                        content={CustomBarTooltip}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      />
                      <ReferenceLine x={atmStrike} stroke="#fbbf24" strokeDasharray="3 3" opacity={0.8} />
                      <Bar dataKey="peOi" name="Put OI" radius={[4, 4, 0, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={`cell-pe-${index}`} fill={getPeColor(entry.isTopPe)} />
                        ))}
                      </Bar>
                      <Bar dataKey="ceOi" name="Call OI" radius={[4, 4, 0, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={`cell-ce-${index}`} fill={getCeColor(entry.isTopCe)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {renderTimeframeSelector()}
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-red-600/70 tracking-wider mb-2">TOP CE POSITIONS</div>
                    {top3Ce.map((strike, i) => (
                      <div key={strike} className="flex justify-between items-center text-xs mb-1 font-mono">
                        <span className="text-red-700 dark:text-red-400">#{i+1} {strike}</span>
                        <span className="text-red-900 dark:text-red-200">{barData.find(b => b.strike === strike)?.ceOi.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-green-600/70 tracking-wider mb-2">TOP PE POSITIONS</div>
                    {top3Pe.map((strike, i) => (
                      <div key={strike} className="flex justify-between items-center text-xs mb-1 font-mono">
                        <span className="text-green-700 dark:text-green-400">#{i+1} {strike}</span>
                        <span className="text-green-900 dark:text-green-200">{barData.find(b => b.strike === strike)?.peOi.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* OI Change Chart */}
              <div className="bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    OI Change (Momentum)
                  </h3>
                </div>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                      <XAxis dataKey="strike" tick={{ fontSize: 10, fill: '#6b7280' }} tickMargin={10} minTickGap={20} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} width={45} tickFormatter={(val) => (val/100000).toFixed(1) + 'L'} />
                      <RechartsTooltip 
                        content={CustomBarTooltip}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      />
                      <ReferenceLine y={0} stroke="#6b7280" opacity={0.5} />
                      <ReferenceLine x={atmStrike} stroke="#fbbf24" strokeDasharray="3 3" opacity={0.8} />
                      <Bar dataKey="peOiChg" name="Put OI Change" fill="#4ade80" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ceOiChg" name="Call OI Change" fill="#f87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {renderTimeframeSelector()}

                <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Positive changes show new positions being built. Negative changes (below the zero line) indicate unwinding or short covering at that strike.
                  </p>
                </div>

                {/* Option Chain Style Table */}
                {(() => {
                  let totalCeOiChg = 0;
                  let totalPeOiChg = 0;
                  barData.forEach(r => {
                    totalCeOiChg += r.ceOiChg;
                    totalPeOiChg += r.peOiChg;
                  });

                  const underlying = currentSnapshot.rows[0]?.Underlying || 0;
                  
                  let atmStrike = barData[0]?.strike;
                  let minDiff = Infinity;
                  barData.forEach(r => {
                    const diff = Math.abs(r.strike - underlying);
                    if (diff < minDiff) {
                      minDiff = diff;
                      atmStrike = r.strike;
                    }
                  });

                  const compSnap = compareSnapshot && compareWindow !== 'day' ? compareSnapshot : (timeSnapshots[0] || currentSnapshot);
                  const startUnderlying = compSnap?.rows[0]?.Underlying || 0;

                  return (
                    <div className="mt-6 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-[#0a0d0f]">
                      {/* Summary Header */}
                      <div className="bg-[#151a1d] p-4 flex flex-col md:flex-row justify-between items-center text-sm font-mono text-neutral-300">
                        <div className="flex gap-6 mb-2 md:mb-0">
                          <div className="flex flex-col gap-1">
                            <span className="text-neutral-500">Change on {currentSnapshot.time}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-4">
                              <span className="w-24">Call OI change</span>
                              <span className={totalCeOiChg > 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                                {totalCeOiChg > 0 ? '+' : ''}{(totalCeOiChg/100000).toFixed(2)}L
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="w-24">Put OI change</span>
                              <span className={totalPeOiChg > 0 ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                                {totalPeOiChg > 0 ? '+' : ''}{(totalPeOiChg/100000).toFixed(2)}L
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-neutral-500">{currentSnapshot.rows[0]?.Symbol || 'NIFTY'} at {compSnap.time}</span>
                            <span className="font-bold text-white w-20">{startUnderlying.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-neutral-500">{currentSnapshot.rows[0]?.Symbol || 'NIFTY'} at {currentSnapshot.time}</span>
                            <span className="font-bold text-white w-20">{underlying.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto subtle-scroll">
                        <table className="w-full text-[11px] font-mono text-right min-w-[600px]">
                          <thead>
                            <tr className="bg-neutral-50 dark:bg-[#10151a] border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 tracking-wider">
                              <th className="py-2 px-2 text-center text-rose-500/80" colSpan={2}>CALLS</th>
                              <th className="py-2 px-2 text-center text-neutral-400">STRIKE</th>
                              <th className="py-2 px-2 text-center text-emerald-500/80" colSpan={2}>PUTS</th>
                            </tr>
                            <tr className="bg-neutral-50 dark:bg-[#10151a] border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 tracking-wider">
                              <th className="py-1.5 px-2">OI (Cr)</th>
                              <th className="py-1.5 px-2 pr-4">CHG (L)</th>
                              <th className="py-1.5 px-2 text-center bg-neutral-100/50 dark:bg-[#141a1f]">PRICE</th>
                              <th className="py-1.5 px-2 pl-4 text-left">CHG (L)</th>
                              <th className="py-1.5 px-2 text-left">OI (Cr)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {barData.map((r, idx) => {
                              const isAtm = r.strike === atmStrike;
                              const isCallItm = r.strike < underlying;
                              const isPutItm = r.strike > underlying;
                              
                              return (
                                <tr key={r.strike} className={`border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${isAtm ? 'border-y border-amber-400/50 dark:border-amber-500/30 shadow-[0_0_10px_rgba(251,191,36,0.1)]' : ''}`}>
                                  <td className={`py-1.5 px-2 ${isCallItm ? 'bg-amber-50/50 dark:bg-[#2a2416]' : ''}`}>
                                    <span className="text-neutral-800 dark:text-neutral-300">{(r.ceOi / 10000000).toFixed(2)} Cr</span>
                                  </td>
                                  <td className={`py-1.5 px-2 pr-4 ${isCallItm ? 'bg-amber-50/50 dark:bg-[#2a2416]' : ''}`}>
                                    <span className={`${r.ceOiChg > 0 ? 'text-emerald-500 dark:text-emerald-400' : r.ceOiChg < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-neutral-400'}`}>
                                      {r.ceOiChg > 0 ? '+' : ''}{(r.ceOiChg / 100000).toFixed(2)} L
                                    </span>
                                  </td>
                                  
                                  <td className={`py-1.5 px-2 text-center font-bold font-sans text-[12px] bg-neutral-50/80 dark:bg-[#141a1f] ${isAtm ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200' : 'text-neutral-700 dark:text-neutral-200'}`}>
                                    {r.strike}
                                  </td>
                                  
                                  <td className={`py-1.5 px-2 pl-4 text-left ${isPutItm ? 'bg-amber-50/50 dark:bg-[#2a2416]' : ''}`}>
                                    <span className={`${r.peOiChg > 0 ? 'text-emerald-500 dark:text-emerald-400' : r.peOiChg < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-neutral-400'}`}>
                                      {r.peOiChg > 0 ? '+' : ''}{(r.peOiChg / 100000).toFixed(2)} L
                                    </span>
                                  </td>
                                  <td className={`py-1.5 px-2 text-left ${isPutItm ? 'bg-amber-50/50 dark:bg-[#2a2416]' : ''}`}>
                                    <span className="text-neutral-800 dark:text-neutral-300">{(r.peOi / 10000000).toFixed(2)} Cr</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Moving Support & Resistance Chart */}
              <div className="xl:col-span-2 bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                    <MoveRight className="w-4 h-4 text-indigo-500" />
                    Moving Resistance & Support
                  </h3>
                  <div className="flex gap-2">
                    {[1, 2, 3, 'all'].map(level => (
                      <button
                        key={level}
                        onClick={() => setSrLevel(level as any)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors border ${
                          srLevel === level 
                            ? 'bg-indigo-500 text-white border-indigo-500' 
                            : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {level === 'all' ? 'All Levels' : `Level ${level}`}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={srData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                      <XAxis dataKey="time" ticks={timeTicks} tick={{ fontSize: 10, fill: '#6b7280' }} angle={-45} textAnchor="end" height={40} interval={0} />
                      <YAxis domain={[(dataMin: number) => dataMin - 50, (dataMax: number) => dataMax + 50]} tick={{ fontSize: 10, fill: '#6b7280' }} width={55} />
                      <RechartsTooltip 
                        content={CustomLineTooltip}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                      
                      {(srLevel === 1 || srLevel === 'all') && <Line type="stepAfter" dataKey="Res1" name="Res 1" stroke="#dc2626" strokeWidth={2} dot={false} />}
                      {(srLevel === 2 || srLevel === 'all') && <Line type="stepAfter" dataKey="Res2" name="Res 2" stroke="#ef4444" strokeWidth={2} strokeDasharray={srLevel === 'all' ? "2 4" : undefined} opacity={srLevel === 'all' ? 0.8 : 1} dot={false} />}
                      {(srLevel === 3 || srLevel === 'all') && <Line type="stepAfter" dataKey="Res3" name="Res 3" stroke="#fca5a5" strokeWidth={2} strokeDasharray={srLevel === 'all' ? "6 6" : undefined} opacity={srLevel === 'all' ? 0.6 : 1} dot={false} />}
                      
                      <Line type="monotone" dataKey="Underlying" name="Spot Price" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                      
                      {(srLevel === 1 || srLevel === 'all') && <Line type="stepAfter" dataKey="Sup1" name="Sup 1" stroke="#16a34a" strokeWidth={2} dot={false} />}
                      {(srLevel === 2 || srLevel === 'all') && <Line type="stepAfter" dataKey="Sup2" name="Sup 2" stroke="#22c55e" strokeWidth={2} strokeDasharray={srLevel === 'all' ? "2 4" : undefined} opacity={srLevel === 'all' ? 0.8 : 1} dot={false} />}
                      {(srLevel === 3 || srLevel === 'all') && <Line type="stepAfter" dataKey="Sup3" name="Sup 3" stroke="#86efac" strokeWidth={2} strokeDasharray={srLevel === 'all' ? "6 6" : undefined} opacity={srLevel === 'all' ? 0.6 : 1} dot={false} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
