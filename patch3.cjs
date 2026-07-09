const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

const tableCode = `
                {/* Historical Data Table */}
                <div className="mt-6 bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 sm:p-6 overflow-x-auto">
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-neutral-200 flex items-center gap-2 mb-4">
                    <Database className="w-4 h-4 text-indigo-500" />
                    Historical Snapshot Data
                  </h3>
                  <table className="w-full text-xs font-mono text-right">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                        <th className="py-2 px-2 text-left">STRIKE</th>
                        <th className="py-2 px-2 text-red-500">CE OI (Cr)</th>
                        <th className="py-2 px-2 text-red-500">CE CHG (L)</th>
                        <th className="py-2 px-2 text-green-500">PE OI (Cr)</th>
                        <th className="py-2 px-2 text-green-500">PE CHG (L)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {barData.map((r, idx) => (
                        <tr key={r.strike} className={\`border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 \${Math.abs(currentSnapshot.rows[0]?.Underlying - r.strike) < 50 ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}\`}>
                          <td className="py-1.5 px-2 text-left font-bold">{r.strike}</td>
                          <td className="py-1.5 px-2">{(r.ceOi / 10000000).toFixed(2)} Cr</td>
                          <td className={\`py-1.5 px-2 \${r.ceOiChg > 0 ? 'text-red-500' : r.ceOiChg < 0 ? 'text-green-500' : ''}\`}>
                            {r.ceOiChg > 0 ? '+' : ''}{(r.ceOiChg / 100000).toFixed(1)} L
                          </td>
                          <td className="py-1.5 px-2">{(r.peOi / 10000000).toFixed(2)} Cr</td>
                          <td className={\`py-1.5 px-2 \${r.peOiChg > 0 ? 'text-green-500' : r.peOiChg < 0 ? 'text-red-500' : ''}\`}>
                            {r.peOiChg > 0 ? '+' : ''}{(r.peOiChg / 100000).toFixed(1)} L
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
`;

if (!content.includes('Historical Data Table')) {
  content = content.replace(
    '</ResponsiveContainer>\n                </div>\n              </div>\n            </div>\n          </>',
    '</ResponsiveContainer>\n                </div>\n              </div>\n            </div>\n' + tableCode + '\n          </>'
  );
  fs.writeFileSync('src/components/HistoricalTab.tsx', content);
  console.log('Success');
} else {
  console.log('Already added');
}
