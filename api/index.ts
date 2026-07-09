import { nseClient } from '../src/lib/nse';

export default async function handler(req: any, res: any) {
  // Support both direct hits and rewritten hits
  const path = req.url ? req.url.split('?')[0] : '';
  
  if (path.includes('/api/health')) {
    return res.json({ status: 'ok' });
  }

  if (path.includes('/api/expiries')) {
    try {
      const symbol = req.query.symbol as string;
      if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
      }
      const expiries = await nseClient.getExpiries(symbol);
      return res.json({ expiries });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (path.includes('/api/chain')) {
    try {
      const symbol = req.query.symbol as string;
      const expiry = req.query.expiry as string;
      if (!symbol || !expiry) {
        return res.status(400).json({ error: 'Symbol and expiry are required' });
      }

      const [chainData, vixData] = await Promise.all([
        nseClient.getChain(symbol, expiry),
        nseClient.getVix()
      ]);

      return res.json({
        chain: chainData,
        vix: vixData
      });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
