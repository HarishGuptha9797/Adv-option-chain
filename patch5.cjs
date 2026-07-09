const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

const target = `                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Positive changes show new positions being built. Negative changes (below the zero line) indicate unwinding or short covering at that strike.
                  </p>
                </div>
              </div>`;

const newTable = `                  <p className="text-xs text-neutral-500 leading-relaxed">
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
                            <span className="text-neutral-500">{activeSymbol || 'NIFTY'} at {compSnap.time}</span>
                            <span className="font-bold text-white w-20">{startUnderlying.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-neutral-500">{activeSymbol || 'NIFTY'} at {currentSnapshot.time}</span>
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
                                <tr key={r.strike} className={\`border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors \${isAtm ? 'border-y border-amber-400/50 dark:border-amber-500/30 shadow-[0_0_10px_rgba(251,191,36,0.1)]' : ''}\`}>
                                  <td className={\`py-1.5 px-2 \${isCallItm ? 'bg-amber-50/50 dark:bg-[#2a2416]' : ''}\`}>
                                    <span className="text-neutral-800 dark:text-neutral-300">{(r.ceOi / 10000000).toFixed(2)} Cr</span>
                                  </td>
                                  <td className={\`py-1.5 px-2 pr-4 \${isCallItm ? 'bg-amber-50/50 dark:bg-[#2a2416]' : ''}\`}>
                                    <span className={\`\${r.ceOiChg > 0 ? 'text-emerald-500 dark:text-emerald-400' : r.ceOiChg < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-neutral-400'}\`}>
                                      {r.ceOiChg > 0 ? '+' : ''}{(r.ceOiChg / 100000).toFixed(2)} L
                                    </span>
                                  </td>
                                  
                                  <td className={\`py-1.5 px-2 text-center font-bold font-sans text-[12px] bg-neutral-50/80 dark:bg-[#141a1f] \${isAtm ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200' : 'text-neutral-700 dark:text-neutral-200'}\`}>
                                    {r.strike}
                                  </td>
                                  
                                  <td className={\`py-1.5 px-2 pl-4 text-left \${isPutItm ? 'bg-amber-50/50 dark:bg-[#2a2416]' : ''}\`}>
                                    <span className={\`\${r.peOiChg > 0 ? 'text-emerald-500 dark:text-emerald-400' : r.peOiChg < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-neutral-400'}\`}>
                                      {r.peOiChg > 0 ? '+' : ''}{(r.peOiChg / 100000).toFixed(2)} L
                                    </span>
                                  </td>
                                  <td className={\`py-1.5 px-2 text-left \${isPutItm ? 'bg-amber-50/50 dark:bg-[#2a2416]' : ''}\`}>
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

              </div>`;

if (content.includes('Positive changes show new positions being built.')) {
  content = content.replace(target, newTable);
  fs.writeFileSync('src/components/HistoricalTab.tsx', content);
  console.log('Success');
} else {
  console.log('Target not found');
}
