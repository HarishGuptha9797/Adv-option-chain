import express from 'express';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { createServer as createViteServer } from 'vite';
import { nseClient } from './src/lib/nse.js';
import { parseChain } from './src/lib/parser.js';
import cron from 'node-cron';

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ symbols: ['NIFTY'] }, null, 2), 'utf8');
}

function getTrackedSymbols(): string[] {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (Array.isArray(data.symbols)) {
        if (!data.symbols.includes('NIFTY')) {
          data.symbols = ['NIFTY', ...data.symbols];
        }
        return data.symbols;
      }
    }
  } catch (e) {
    console.error("Error reading settings.json", e);
  }
  return ['NIFTY']; // default
}

async function takeSnapshot(symbol: string) {
  try {
    const expiries = await nseClient.getExpiries(symbol);
    if (!expiries || expiries.length === 0) return;
    const expiry = expiries[0]; // Current expiry
    
    const [chainData, vixData] = await Promise.all([
      nseClient.getChain(symbol, expiry),
      nseClient.getVix()
    ]);
    
    const snapshot = parseChain(symbol, chainData, expiry, vixData?.last, vixData?.percentChange);
    
    const istTime = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
    const dateStr = istTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const capturedAt = istTime.toISOString().split('T')[1].substring(0, 5); // HH:MM
    let timeStr = capturedAt;

    if (snapshot.timestamp && snapshot.timestamp !== "—") {
      const parts = snapshot.timestamp.split(' ');
      if (parts.length > 1) {
        timeStr = parts[1].substring(0, 5);
      }
    }
    
    const symbolDir = path.join(DATA_DIR, symbol);
    if (!fs.existsSync(symbolDir)) {
      fs.mkdirSync(symbolDir, { recursive: true });
    }

    const filename = `${symbol}-${dateStr}.csv`;
    const filePath = path.join(symbolDir, filename);

    const header = "CapturedAt,Time,Symbol,Expiry,Underlying,VIX,Strike,CE_LTP,CE_OI,CE_OI_Chg,CE_Vol,PE_LTP,PE_OI,PE_OI_Chg,PE_Vol\n";
    
    let currentData = '';
    if (fs.existsSync(filePath)) {
      currentData = await fsPromises.readFile(filePath, 'utf8');
      if (!currentData.startsWith("CapturedAt,Time")) {
        currentData = header;
      }
    } else {
      currentData = header;
    }
    
    const lines = currentData.trim().split('\n');
    
    if (lines.length > 1) {
      const lastLine = lines[lines.length - 1];
      const lastTime = lastLine.split(',')[1];
      if (lastTime === timeStr) {
        console.log(`[cron] Snapshot for ${timeStr} already exists, skipping.`);
        return;
      }
    }
    
    // Add +/- 10 strikes from ATM
    const underlying = snapshot.underlying.toFixed(2);
    const vix = snapshot.vix?.toFixed(4) || '';
    
    const startIdx = Math.max(0, snapshot.atm_index - 10);
    const endIdx = Math.min(snapshot.rows.length, snapshot.atm_index + 11);
    const filteredRows = snapshot.rows.slice(startIdx, endIdx);
    
    for (const r of filteredRows) {
      lines.push([
        capturedAt,
        timeStr,
        symbol,
        expiry,
        underlying,
        vix,
        r.strike,
        r.ce.ltp,
        r.ce.oi,
        r.ce.oi_change,
        r.ce.volume,
        r.pe.ltp,
        r.pe.oi,
        r.pe.oi_change,
        r.pe.volume
      ].join(','));
    }
    
    await fsPromises.writeFile(filePath, lines.join('\n') + '\n', 'utf8');
    console.log(`[cron] Snapshot saved to ${filename} with ${filteredRows.length} strikes.`);
  } catch (err) {
    console.error("[cron] Snapshot error:", err);
  }
}

cron.schedule('*/5 * * * *', () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const day = istTime.getUTCDay();
  
  if (day === 0 || day === 6) return; // Weekend
  
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // 9:00 to 15:30
  if (timeInMinutes >= 540 && timeInMinutes <= 930) {
    const symbols = getTrackedSymbols();
    symbols.forEach(sym => takeSnapshot(sym));
  }
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/db/settings', (req, res) => {
    try {
      res.json({ symbols: getTrackedSymbols() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/db/settings', async (req, res) => {
    try {
      let { symbols } = req.body;
      if (!Array.isArray(symbols)) {
        return res.status(400).json({ error: 'symbols must be an array' });
      }
      if (!symbols.includes('NIFTY')) {
        symbols = ['NIFTY', ...symbols];
      }
      await fsPromises.writeFile(SETTINGS_FILE, JSON.stringify({ symbols }, null, 2), 'utf8');
      res.json({ success: true, symbols });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/db/snapshot', async (req, res) => {
    try {
      const symbols = getTrackedSymbols();
      await Promise.all(symbols.map(sym => takeSnapshot(sym)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/db/files', async (req, res) => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        return res.json({ files: [] });
      }
      
      const fileStats: any[] = [];
      const entries = await fsPromises.readdir(DATA_DIR, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const symPath = path.join(DATA_DIR, entry.name);
          const csvFiles = await fsPromises.readdir(symPath);
          for (const file of csvFiles) {
            if (file.endsWith('.csv')) {
              const stat = await fsPromises.stat(path.join(symPath, file));
              fileStats.push({
                name: file,
                path: `${entry.name}/${file}`,
                symbol: entry.name,
                size: stat.size,
                mtime: stat.mtime
              });
            }
          }
        } else if (entry.name.endsWith('.csv')) {
          // backwards compatibility for files directly in DATA_DIR
          const stat = await fsPromises.stat(path.join(DATA_DIR, entry.name));
          fileStats.push({
            name: entry.name,
            path: entry.name,
            symbol: entry.name.split('-')[0],
            size: stat.size,
            mtime: stat.mtime
          });
        }
      }
      
      // Sort by modified time descending
      fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      res.json({ files: fileStats });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/db/files/:folder/:filename', async (req, res) => {
    try {
      const { folder, filename } = req.params;
      const filePath = path.join(DATA_DIR, folder, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      const content = await fsPromises.readFile(filePath, 'utf8');
      res.send(content);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/db/files/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(DATA_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      const content = await fsPromises.readFile(filePath, 'utf8');
      res.send(content);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/db/files/:folder/:filename', async (req, res) => {
    try {
      const { folder, filename } = req.params;
      const filePath = path.join(DATA_DIR, folder, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      await fsPromises.unlink(filePath);
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/db/files/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(DATA_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      await fsPromises.unlink(filePath);
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/expiries', async (req, res) => {
    try {
      const symbol = req.query.symbol as string;
      if (!symbol) return res.status(400).json({ error: 'Symbol is required' });
      const expiries = await nseClient.getExpiries(symbol);
      res.json({ expiries });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/recent-snapshot', async (req, res) => {
    try {
      const symbol = req.query.symbol as string;
      if (!symbol) return res.status(400).json({ error: 'Symbol is required' });
      
      const istTime = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
      const dateStr = istTime.toISOString().split('T')[0];
      const filePath = path.join(DATA_DIR, symbol, `${symbol}-${dateStr}.csv`);
      
      if (!fs.existsSync(filePath)) {
        return res.json({ rows: [] });
      }
      
      const content = await fsPromises.readFile(filePath, 'utf8');
      const lines = content.trim().split('\n');
      if (lines.length <= 1) return res.json({ rows: [] });
      
      // Get the last CapturedAt time
      const lastLine = lines[lines.length - 1];
      const lastTime = lastLine.split(',')[0];
      
      // Get all rows for the last CapturedAt time
      const recentRows = [];
      for (let i = lines.length - 1; i > 0; i--) {
        const parts = lines[i].split(',');
        if (parts[0] !== lastTime) break;
        if (parts.length >= 15) {
          recentRows.push({
            Strike: parseFloat(parts[6]),
            CE_OI: parseFloat(parts[8]),
            PE_OI: parseFloat(parts[12])
          });
        }
      }
      
      res.json({ time: lastTime, rows: recentRows });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/chain', async (req, res) => {
    try {
      const symbol = req.query.symbol as string;
      const expiry = req.query.expiry as string;
      if (!symbol || !expiry) return res.status(400).json({ error: 'Symbol and expiry are required' });

      const [chainData, vixData] = await Promise.all([
        nseClient.getChain(symbol, expiry),
        nseClient.getVix()
      ]);

      res.json({
        chain: chainData,
        vix: vixData
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite development middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
