import { MacroIndicator } from './types';
import { logger } from '../../logger';
import type { YahooChartResponse } from '../yahooTypes';

// Cache macro quotes for 60 seconds to respect rate limits
const cache = new Map<string, { data: MacroIndicator; expiry: number }>();
const CACHE_TTL_MS = 60 * 1000;

const MACRO_SYMBOLS: Record<string, { name: string; category: MacroIndicator['category']; unit: string }> = {
  'CL=F': { name: 'Crude Oil (Brent/WTI Blend)', category: 'commodity', unit: 'USD/bbl' },
  'INR=X': { name: 'USD / INR Spot Exchange Rate', category: 'currency', unit: 'INR/USD' },
  '^NSEI': { name: 'NIFTY 50 Benchmark Index', category: 'index', unit: 'Points' },
  '^NSEBANK': { name: 'NIFTY Bank Sector Index', category: 'index', unit: 'Points' },
  '^TNX': { name: 'US 10-Year Treasury Yield', category: 'rates', unit: '%' },
  'GC=F': { name: 'Gold Continuous Contract', category: 'commodity', unit: 'USD/t.oz' },
};

export async function fetchMacroIndicator(symbol: string): Promise<MacroIndicator> {
  const cached = cache.get(symbol);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const metaInfo = MACRO_SYMBOLS[symbol] || { name: symbol, category: 'commodity', unit: 'USD' };

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    if (!res.ok) {
      throw new Error(`Data provider status ${res.status} for ${symbol}`);
    }

    const json = await res.json() as YahooChartResponse;
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error(`Empty metadata for ${symbol}`);

    const latestPrice = meta.regularMarketPrice ?? 0;
    const previousClose = meta.chartPreviousClose ?? latestPrice;
    const change = Number((latestPrice - previousClose).toFixed(2));
    const changePercent = previousClose ? Number(((change / previousClose) * 100).toFixed(2)) : 0;

    const indicator: MacroIndicator = {
      symbol,
      name: metaInfo.name,
      category: metaInfo.category,
      latestPrice: Number(latestPrice.toFixed(2)),
      previousClose: Number(previousClose.toFixed(2)),
      change,
      changePercent,
      unit: metaInfo.unit,
      timestamp: new Date().toISOString(),
      isRealTime: true,
    };

    cache.set(symbol, { data: indicator, expiry: Date.now() + CACHE_TTL_MS });
    return indicator;
  } catch (err) {
    logger.warn({ symbol, err }, 'Falling back to latest calibrated baseline for macro variable');
    // Fallback calibrated baselines with explicit timestamp
    const defaultPrices: Record<string, number> = {
      'CL=F': 84.5,
      'INR=X': 84.2,
      '^NSEI': 24800,
      '^NSEBANK': 51500,
      '^TNX': 4.25,
      'GC=F': 2650,
    };

    const fallbackPrice = defaultPrices[symbol] || 100;
    const fallback: MacroIndicator = {
      symbol,
      name: metaInfo.name,
      category: metaInfo.category,
      latestPrice: fallbackPrice,
      previousClose: fallbackPrice,
      change: 0,
      changePercent: 0,
      unit: metaInfo.unit,
      timestamp: new Date().toISOString(),
      isRealTime: false,
    };
    return fallback;
  }
}

export async function getAllMacroBaselines(): Promise<Record<string, MacroIndicator>> {
  const keys = Object.keys(MACRO_SYMBOLS);
  const results = await Promise.all(keys.map(k => fetchMacroIndicator(k)));
  const map: Record<string, MacroIndicator> = {};
  results.forEach(r => { map[r.symbol] = r; });
  return map;
}
