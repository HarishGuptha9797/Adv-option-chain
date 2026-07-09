import axios from 'axios';

const INDICES = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'];

const NSE_BASE = 'https://www.nseindia.com';
const NSE_OPTION_CHAIN_PAGE = `${NSE_BASE}/option-chain`;
const NSE_CONTRACT_INFO_API = `${NSE_BASE}/api/option-chain-contract-info`;
const NSE_CHAIN_INDEX_API = `${NSE_BASE}/api/option-chain-v3?type=Indices&symbol={symbol}&expiry={expiry}`;
const NSE_CHAIN_EQUITY_API = `${NSE_BASE}/api/option-chain-v3?type=Equity&symbol={symbol}&expiry={expiry}`;
const NSE_VIX_API = `${NSE_BASE}/api/allIndices`;

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  accept: '*/*',
};

class NSEClient {
  private cookies: string = '';
  private cookiesPrimed: boolean = false;

  private newSession() {
    this.cookies = '';
    this.cookiesPrimed = false;
  }

  private async primeCookies(): Promise<void> {
    try {
      const resp = await axios.get(NSE_OPTION_CHAIN_PAGE, { headers: HEADERS, timeout: 4000 });
      const setCookies = resp.headers['set-cookie'];
      if (setCookies && Array.isArray(setCookies)) {
        this.cookies = setCookies.map(c => c.split(';')[0]).join('; ');
      }
      this.cookiesPrimed = true;
      await new Promise((resolve) => setTimeout(resolve, 400));
    } catch (e: any) {
      console.error('Failed to prime cookies', e.message);
    }
  }

  private getRequestHeaders() {
    return {
      ...HEADERS,
      Cookie: this.cookies,
    };
  }

  public async getExpiries(symbol: string): Promise<string[]> {
    if (!this.cookiesPrimed) await this.primeCookies();

    try {
      let resp = await axios.get(NSE_CONTRACT_INFO_API, { params: { symbol }, headers: this.getRequestHeaders(), timeout: 4000 });
      if (resp.status === 401 || resp.status === 403) {
        this.newSession();
        await this.primeCookies();
        resp = await axios.get(NSE_CONTRACT_INFO_API, { params: { symbol }, headers: this.getRequestHeaders(), timeout: 4000 });
      }

      const data = resp.data;
      const expiries =
        data?.expiryDates ||
        data?.records?.expiryDates ||
        data?.data?.expiryDates ||
        [];

      if (!expiries || expiries.length === 0) {
        throw new Error(`No expiry dates returned for ${symbol}`);
      }
      return expiries;
    } catch (e: any) {
      console.error('Error fetching expiries', e.message);
      throw e;
    }
  }

  public async getChain(symbol: string, expiry: string): Promise<any> {
    const isIndex = INDICES.includes(symbol.toUpperCase().trim());
    const urlTemplate = isIndex ? NSE_CHAIN_INDEX_API : NSE_CHAIN_EQUITY_API;
    const url = urlTemplate.replace('{symbol}', encodeURIComponent(symbol)).replace('{expiry}', encodeURIComponent(expiry));

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (!this.cookiesPrimed) await this.primeCookies();
        const resp = await axios.get(url, { headers: this.getRequestHeaders(), timeout: 4000 });
        
        if (resp.status === 401 || resp.status === 403) {
          this.newSession();
          if (attempt === 0) continue;
          throw new Error(`${resp.status} blocked by NSE`);
        }
        
        return resp.data;
      } catch (e: any) {
        if (e.response && (e.response.status === 401 || e.response.status === 403)) {
          this.newSession();
          if (attempt === 0) continue;
        }
        if (attempt === 0) {
          this.newSession();
          continue;
        }
        throw e;
      }
    }
    throw new Error(`Could not fetch option chain for ${symbol}`);
  }

  public async getVix(): Promise<{ last: number | null; percentChange: number | null }> {
    try {
      if (!this.cookiesPrimed) await this.primeCookies();
      const resp = await axios.get(NSE_VIX_API, { headers: this.getRequestHeaders(), timeout: 4000 });
      const data = resp.data;
      for (const item of data?.data || []) {
        const sym = (item.indexSymbol || item.index || '').toUpperCase();
        if (sym.includes('VIX')) {
          const last = item.last !== undefined ? parseFloat(item.last) : null;
          const pchg = item.percentChange !== undefined ? parseFloat(item.percentChange) : null;
          return { last, percentChange: pchg };
        }
      }
    } catch (e) {
      // Ignore errors for VIX
    }
    return { last: null, percentChange: null };
  }
}

export const nseClient = new NSEClient();
