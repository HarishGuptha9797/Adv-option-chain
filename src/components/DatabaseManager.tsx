import { useState, useEffect } from 'react';
import { Database, Download, Trash2, FileText, RefreshCw, Camera } from 'lucide-react';

interface FileStat {
  name: string;
  path: string;
  symbol?: string;
  size: number;
  mtime: string;
}

export function DatabaseManager() {
  const [files, setFiles] = useState<FileStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [contentLoading, setContentLoading] = useState(false);
  
  const [trackedSymbols, setTrackedSymbols] = useState<string[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  const forceSnapshot = async () => {
    setSnapshotLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/db/snapshot', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to take snapshot');
      await fetchFiles();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to take snapshot');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/db/settings');
      if (res.ok) {
        let data; try { data = await res.json(); } catch(e) { console.error("res.json error in " + "src/components/DatabaseManager.tsx", e); return; }
        setTrackedSymbols(data.symbols || ['NIFTY']);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateTrackedSymbols = async (newSymbols: string[]) => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/db/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: newSymbols })
      });
      if (res.ok) {
        setTrackedSymbols(newSymbols);
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const addSymbol = () => {
    const sym = newSymbol.trim().toUpperCase();
    if (sym && !trackedSymbols.includes(sym)) {
      updateTrackedSymbols([...trackedSymbols, sym]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (symToRemove: string) => {
    if (symToRemove === 'NIFTY') return; // Cannot remove default
    updateTrackedSymbols(trackedSymbols.filter(s => s !== symToRemove));
  };

  const fetchFiles = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/db/files');
      if (!res.ok) throw new Error('Failed to fetch files');
      let data; try { data = await res.json(); } catch(e) { console.error("res.json error in " + "src/components/DatabaseManager.tsx", e); return; }
      setFiles(data.files || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load database files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchSettings();
  }, []);

  const loadFileContent = async (file: FileStat) => {
    setContentLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/db/files/${file.path}`);
      if (!res.ok) throw new Error('Failed to fetch file content');
      const text = await res.text();
      setFileContent(text);
      setSelectedFile(file.path);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to read file');
    } finally {
      setContentLoading(false);
    }
  };

  const deleteFile = async (file: FileStat, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const res = await fetch(`/api/db/files/${file.path}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete file');
      if (selectedFile === file.path) {
        setSelectedFile(null);
        setFileContent('');
      }
      fetchFiles();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete file');
    }
  };

  const handleDownload = (file: FileStat, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `/api/db/files/${file.path}`;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Database Management</h2>
              <p className="text-xs text-neutral-500">View and manage automated 5-min historical snapshot data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={forceSnapshot}
              disabled={snapshotLoading || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Camera className={`w-3.5 h-3.5 ${snapshotLoading ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Capture Now</span>
            </button>
            <button 
              onClick={fetchFiles}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-rose-50 dark:bg-rose-500/10 border-l-4 border-rose-500 p-3 rounded text-sm text-rose-800 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File List */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-neutral-500 tracking-wider mb-2">TRACKED SYMBOLS</h3>
              <div className="bg-neutral-50 dark:bg-[#141b21] p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                <div className="flex flex-wrap gap-2 mb-3">
                  {trackedSymbols.map(sym => (
                    <span key={sym} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      {sym}
                      {sym !== 'NIFTY' && <button onClick={() => removeSymbol(sym)} className="hover:text-rose-500 transition-colors">×</button>}
                    </span>
                  ))}
                  {trackedSymbols.length === 0 && <span className="text-xs text-neutral-500">No symbols tracked.</span>}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" value={newSymbol} onChange={e => setNewSymbol(e.target.value)}
                    placeholder="e.g. BANKNIFTY"
                    onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
                    className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button onClick={addSymbol} disabled={settingsLoading || !newSymbol.trim()} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold disabled:opacity-50">
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-neutral-500 tracking-wider mb-2">STORED CSV FILES</h3>
              
              {files.length === 0 && !loading && (
                <div className="text-center p-8 bg-neutral-50 dark:bg-[#141b21] rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-500 text-sm">
                  No database files found.<br/>
                  <span className="text-xs mt-1 block">Snapshots will automatically generate here during market hours.</span>
                </div>
              )}
              
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {files.map((file) => (
                  <div 
                    key={file.path}
                    onClick={() => loadFileContent(file)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedFile === file.path ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-[#141b21] border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-4 h-4 shrink-0 text-neutral-400" />
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">{file.name}</div>
                        <div className="text-xs text-neutral-500 mt-0.5">{file.symbol} • {formatSize(file.size)} • {new Date(file.mtime).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button onClick={(e) => handleDownload(file, e)} className="p-1.5 text-neutral-400 hover:text-indigo-500 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => deleteFile(file, e)} className="p-1.5 text-neutral-400 hover:text-rose-500 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* File Content Preview */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-bold text-neutral-500 tracking-wider mb-2">FILE PREVIEW</h3>
            
            <div className="bg-neutral-50 dark:bg-[#141b21] border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 h-[400px] overflow-auto">
              {!selectedFile ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                  <Database className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm">Select a file to preview contents</p>
                </div>
              ) : contentLoading ? (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="text-xs font-mono whitespace-pre text-neutral-600 dark:text-neutral-400">
                  {fileContent || 'File is empty'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
