const fs = require('fs');
let content = fs.readFileSync('src/components/OptionChainTable.tsx', 'utf8');

const regex = /(\{\/\* PE OI CHG \*\/\}\s*<div className="flex-1 text-left relative flex items-center h-8">\s*\{Math\.abs\(row\.pe\.oi_change\) > 0 && \(\s*<div\s*className=\{cn\("absolute bottom-1 left-1 h-\[2px\] rounded-sm", row\.pe\.oi_change > 0 \? "bg-\[#2fd17a\]" : "bg-\[#ef5b5b\]"\)\}\s*style=\{\{ width: `calc\(\$\{\(Math\.abs\(row\.pe\.oi_change\) \/ visibleMaxOiChg\) \* 100\}% - 4px\)` \}\}\s*\/>\s*\)\}\s*<span className=\{cn\(\s*"relative z-10 pl-2",\s*row\.pe\.oi_change > 0 \? "text-emerald-500 dark:text-\[#2fd17a\]" : row\.pe\.oi_change < 0 \? "text-rose-500 dark:text-\[#ef5b5b\]" : "text-neutral-400 dark:text-\[#6b7d85\]"\s*\)\}>\s*\{row\.pe\.oi_change > 0 \? '\+' : ''\}\{formatNum\(row\.pe\.oi_change\)\}\s*<\/span>\s*<\/div>\s*)(\{\/\* PE OI \*\/\})/g;

const match = regex.exec(content);
if (match) {
  const replace = `
                {/* PE RECENT OI CHG */}
                <div className="flex-1 text-left relative flex items-center h-8">
                  {row.pe.recent_oi_change !== undefined && Math.abs(row.pe.recent_oi_change) > 0 && (
                    <div 
                      className={cn("absolute bottom-1 left-1 h-[2px] rounded-sm", row.pe.recent_oi_change > 0 ? "bg-[#2fd17a]" : "bg-[#ef5b5b]")}
                      style={{ width: \`calc(\${(Math.abs(row.pe.recent_oi_change) / visibleMaxOiChg) * 100}% - 4px)\` }}
                    />
                  )}
                  <span className={cn(
                    "relative z-10 pl-2",
                    row.pe.recent_oi_change && row.pe.recent_oi_change > 0 ? "text-emerald-500 dark:text-[#2fd17a]" : row.pe.recent_oi_change && row.pe.recent_oi_change < 0 ? "text-rose-500 dark:text-[#ef5b5b]" : "text-neutral-400 dark:text-[#6b7d85]"
                  )}>
                    {row.pe.recent_oi_change !== undefined ? (row.pe.recent_oi_change > 0 ? '+' : '') + formatNum(row.pe.recent_oi_change) : '—'}
                  </span>
                </div>
                `;
  content = content.replace(regex, `$1${replace}$2`);
  fs.writeFileSync('src/components/OptionChainTable.tsx', content);
  console.log('Success');
} else {
  console.log('Target not found');
}
