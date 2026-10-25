/**
 * Modular Market Data Service
 * Implements strict market data verification, data integrity checks,
 * market session status, and validated percentage calculations.
 */
import { logger } from '../logger';

export interface MarketQuote {
  symbol: string;
  name: string;
  exchange: string;
  fullExchangeName?: string;
  instrumentType: string;
  currency: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  sessionDate: string; // ISO date of trading session (e.g. 2026-10-23)
  timestamp: string; // Exact quote timestamp ISO
  isMarketOpen: boolean;
  freshnessStatus: 'REAL_TIME' | 'SESSION_CLOSE' | 'DELAYED' | 'HISTORICAL_CACHED';
  freshnessNote: string;
  dataSource: string;
  validationPassed: boolean;
  validationWarnings: string[];
  historicalCloses: { date: string; price: number; volume: number }[];
}

export interface MacroSnapshot {
  nifty: MarketQuote;
  bankNifty: MarketQuote;
  sensex: MarketQuote;
  crude: MarketQuote;
  usdinr: MarketQuote;
  gold: MarketQuote;
  us10y: MarketQuote;
  timestamp: string;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const quoteCache = new Map<string, CacheEntry<MarketQuote>>();
const searchCache = new Map<string, CacheEntry<{ symbol: string; name: string; exchange: string }[]>>();
const QUOTE_TTL_MS = 60 * 1000; // 1 minute
const SEARCH_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class MarketDataService {
  /**
   * Normalizes an Indian stock symbol or resolves common exchange formats.
   */
  public normalizeSymbol(input: string): string {
    let s = input.trim().toUpperCase();
    if (s.startsWith('NSE:')) return s.replace('NSE:', '') + '.NS';
    if (s.startsWith('BSE:')) return s.replace('BSE:', '') + '.BO';
    if (s.endsWith('.NS') || s.endsWith('.BO') || s.startsWith('^') || s.includes('=')) {
      return s;
    }
    // US or Global tickers that shouldn't append .NS
    const US_EQUITIES = new Set([
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'SPY', 'QQQ', 'VOO', 'IWM', 'AMD', 'INTC', 'NFLX', 'BRK.B', 'JNJ', 'JPM', 'V', 'PG'
    ]);
    if (US_EQUITIES.has(s)) {
      return s;
    }
    // Default to NSE (.NS) for Indian equities
    return `${s}.NS`;
  }

  /**
   * Resolve company names or query terms to verified exchange tickers.
   */
  public async resolveSymbol(query: string): Promise<{ symbol: string; name: string; exchange: string }[]> {
    const cleanQuery = query.trim().toUpperCase();
    const cached = searchCache.get(cleanQuery);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
      });

      if (!res.ok) {
        throw new Error(`Symbol resolution search returned HTTP ${res.status}`);
      }

      const data = (await res.json()) as any;
      const quotes = data?.quotes || [];

      // Prefer Indian equities or known global benchmarks
      const results = quotes
        .filter((q: any) => q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO') || q.symbol.startsWith('^') || q.symbol.includes('=')))
        .map((q: any) => ({
          symbol: q.symbol,
          name: q.shortname || q.longname || q.symbol,
          exchange: q.exchDisp || (q.symbol.endsWith('.BO') ? 'BSE' : 'NSE'),
        }));

      searchCache.set(cleanQuery, { data: results, expiresAt: Date.now() + SEARCH_TTL_MS });
      return results;
    } catch (err: any) {
      logger.warn({ err: err.message, query }, 'Symbol resolution failed');
      return [];
    }
  }

  /**
   * Fetches latest market quote + historical closes with strict validation.
   */
  public async getQuote(symbolOrName: string, range: '1mo' | '3mo' | '1y' | '5y' = '1y'): Promise<MarketQuote> {
    const normalized = this.normalizeSymbol(symbolOrName);
    const cacheKey = `${normalized}:${range}`;
    const cached = quoteCache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalized)}?interval=1d&range=${range}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch verified quote for ${normalized} (status: ${res.status})`);
    }

    const data = (await res.json()) as any;
    const result = data?.chart?.result?.[0];
    if (!result || !result.meta) {
      throw new Error(`No verified market records returned for symbol: ${normalized}`);
    }

    const meta = result.meta;
    const quoteObj = result.indicators?.quote?.[0] || {};
    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = quoteObj.close || [];
    const volumes: (number | null)[] = quoteObj.volume || [];

    const historicalCloses: { date: string; price: number; volume: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (c !== null && !isNaN(c) && c > 0) {
        historicalCloses.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          price: Number(c.toFixed(2)),
          volume: volumes[i] ?? 0,
        });
      }
    }

    // Latest price verification
    const rawPrice = meta.regularMarketPrice ?? (historicalCloses.length ? historicalCloses[historicalCloses.length - 1].price : null);
    if (rawPrice === null || isNaN(rawPrice) || rawPrice <= 0) {
      throw new Error(`Invalid market price received for ${normalized}`);
    }
    const price = Number(rawPrice.toFixed(2));

    // Previous close verification
    const rawPrevClose = meta.chartPreviousClose ?? (historicalCloses.length > 1 ? historicalCloses[historicalCloses.length - 2].price : null);
    const previousClose = (rawPrevClose !== null && !isNaN(rawPrevClose) && rawPrevClose > 0)
      ? Number(rawPrevClose.toFixed(2))
      : null;

    // Strict percentage calculation: ((price - prevClose) / prevClose) * 100
    let change: number | null = null;
    let changePercent: number | null = null;
    const validationWarnings: string[] = [];

    if (previousClose !== null) {
      change = Number((price - previousClose).toFixed(2));
      changePercent = Number((((price - previousClose) / previousClose) * 100).toFixed(2));

      // Suspicious extreme return check (> 30% daily movement in a standard equity)
      if (Math.abs(changePercent) >= 30 && !normalized.startsWith('^') && !normalized.includes('=')) {
        validationWarnings.push(
          `Extreme price divergence detected (${changePercent}%). May reflect recent corporate actions (demerger, split) or volatility band readjustment.`,
        );
      }
    } else {
      validationWarnings.push('Previous close missing from exchange tape; daily percentage move omitted to prevent fabrication.');
    }

    // Market session and freshness determination
    const marketTimeSec = meta.regularMarketTime || (timestamps.length ? timestamps[timestamps.length - 1] : Math.floor(Date.now() / 1000));
    const sessionDate = new Date(marketTimeSec * 1000).toISOString().split('T')[0];
    const quoteTimestamp = new Date(marketTimeSec * 1000).toISOString();

    const regEnd = meta.currentTradingPeriod?.regular?.end;
    const regStart = meta.currentTradingPeriod?.regular?.start;
    const nowSec = Math.floor(Date.now() / 1000);
    const isMarketOpen = Boolean(regStart && regEnd && nowSec >= regStart && nowSec < regEnd);

    let freshnessStatus: MarketQuote['freshnessStatus'] = 'SESSION_CLOSE';
    let freshnessNote = `Session Close (${sessionDate} IST)`;
    if (isMarketOpen) {
      freshnessStatus = 'REAL_TIME';
      freshnessNote = 'Live Session Quote';
    } else {
      freshnessNote = `Market closed. Latest verified closing price from ${sessionDate}`;
    }

    const exchange = meta.exchangeName || (normalized.endsWith('.BO') ? 'BSE' : normalized.endsWith('.NS') ? 'NSE' : 'GLOBAL');
    const quote: MarketQuote = {
      symbol: meta.symbol || normalized,
      name: meta.shortName || meta.longName || meta.symbol || normalized,
      exchange,
      fullExchangeName: meta.fullExchangeName,
      instrumentType: meta.instrumentType || 'EQUITY',
      currency: meta.currency || (normalized.endsWith('.NS') || normalized.endsWith('.BO') ? 'INR' : 'USD'),
      price,
      previousClose,
      change,
      changePercent,
      open: meta.regularMarketOpen ? Number(meta.regularMarketOpen.toFixed(2)) : null,
      dayHigh: meta.regularMarketDayHigh ? Number(meta.regularMarketDayHigh.toFixed(2)) : null,
      dayLow: meta.regularMarketDayLow ? Number(meta.regularMarketDayLow.toFixed(2)) : null,
      volume: meta.regularMarketVolume ?? 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? Number(meta.fiftyTwoWeekHigh.toFixed(2)) : null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? Number(meta.fiftyTwoWeekLow.toFixed(2)) : null,
      sessionDate,
      timestamp: quoteTimestamp,
      isMarketOpen,
      freshnessStatus,
      freshnessNote,
      dataSource: 'Yahoo Finance Market Data API',
      validationPassed: true,
      validationWarnings,
      historicalCloses,
    };

    quoteCache.set(cacheKey, { data: quote, expiresAt: Date.now() + QUOTE_TTL_MS });
    return quote;
  }

  /**
   * Retrieve dynamic, verified macro indicators.
   */
  public async getMacroSnapshot(): Promise<MacroSnapshot> {
    const [nifty, bankNifty, sensex, crude, usdinr, gold, us10y] = await Promise.all([
      this.getQuote('^NSEI', '1mo').catch(() => this.getUnavailableQuote('^NSEI', 'NIFTY 50', 'Points')),
      this.getQuote('^NSEBANK', '1mo').catch(() => this.getUnavailableQuote('^NSEBANK', 'NIFTY Bank', 'Points')),
      this.getQuote('^BSESN', '1mo').catch(() => this.getUnavailableQuote('^BSESN', 'S&P BSE SENSEX', 'Points')),
      this.getQuote('CL=F', '1mo').catch(() => this.getUnavailableQuote('CL=F', 'Crude Oil (Brent/WTI)', 'USD/bbl')),
      this.getQuote('INR=X', '1mo').catch(() => this.getUnavailableQuote('INR=X', 'USD / INR Spot', 'INR')),
      this.getQuote('GC=F', '1mo').catch(() => this.getUnavailableQuote('GC=F', 'Gold Continuous Contract', 'USD/oz')),
      this.getQuote('^TNX', '1mo').catch(() => this.getUnavailableQuote('^TNX', 'US 10-Yr Treasury Yield', '%')),
    ]);

    return {
      nifty,
      bankNifty,
      sensex,
      crude,
      usdinr,
      gold,
      us10y,
      timestamp: new Date().toISOString(),
    };
  }

  private getUnavailableQuote(symbol: string, name: string, currency: string): MarketQuote {
    return {
      symbol,
      name,
      exchange: 'GLOBAL',
      instrumentType: 'BENCHMARK',
      currency,
      price: 0,
      previousClose: null,
      change: null,
      changePercent: null,
      open: null,
      dayHigh: null,
      dayLow: null,
      volume: 0,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      sessionDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      isMarketOpen: false,
      freshnessStatus: 'HISTORICAL_CACHED',
      freshnessNote: 'Data provider temporarily unavailable for this benchmark',
      dataSource: 'Yahoo Finance Market Data API',
      validationPassed: false,
      validationWarnings: ['Provider failed to return quote for this session.'],
      historicalCloses: [],
    };
  }
}

export const marketDataService = new MarketDataService();
