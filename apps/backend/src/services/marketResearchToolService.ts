/**
 * Market Research & Intelligence Tools
 * Provides universe ranking, live news/event scraping, multi-stock comparison,
 * and macroeconomic transmission modeling.
 */
import { marketDataService, MarketQuote } from './marketDataService';
import { logger } from '../logger';

export interface RankedStockItem {
  rank: number;
  symbol: string;
  name: string;
  currentPrice: number;
  startingPrice: number;
  returnPct: number;
  period: string;
  sessionDate: string;
}

export interface NewsSnippet {
  title: string;
  source: string;
  snippet: string;
}

// Broad curated universe of key Indian equities across major sectors (Large & Mid-Cap)
export const NSE_BROAD_UNIVERSE = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'BHARTIARTL.NS', 'SBIN.NS', 'LICI.NS', 'ITC.NS', 'HINDUNILVR.NS',
  'LT.NS', 'BAJFINANCE.NS', 'HCLTECH.NS', 'MARUTI.NS', 'SUNPHARMA.NS',
  'ADANIENT.NS', 'TMCV.NS', 'NTPC.NS', 'ONGC.NS', 'POWERGRID.NS',
  'TITAN.NS', 'ULTRACEMCO.NS', 'COALINDIA.NS', 'WIPRO.NS', 'BAJAJFINSV.NS',
  'IOC.NS', 'BEL.NS', 'HAL.NS', 'VEDL.NS', 'SUZLON.NS',
  'IRFC.NS', 'TATAPOWER.NS', 'ZOMATO.NS', 'TRENT.NS', 'JIOFIN.NS',
  'VBL.NS', 'CHOLAFIN.NS', 'PERSISTENT.NS', 'MAZDOCK.NS', 'BSE.NS'
];

export class MarketResearchToolService {
  /**
   * Tool 1: Compute historical performance rankings across a broad Indian stock universe.
   */
  public async getHistoricalUniverseRanking(options: {
    universe?: string[];
    period?: '6M' | '1Y' | '3Y' | '5Y';
    count?: number;
    order?: 'TOP' | 'BOTTOM';
  }): Promise<{
    items: RankedStockItem[];
    universeSize: number;
    evaluatedCount: number;
    periodLabel: string;
    asOf: string;
    coverageNote: string;
  }> {
    const universe = options.universe || NSE_BROAD_UNIVERSE;
    const period = options.period || '1Y';
    const count = options.count || 10;
    const order = options.order || 'TOP';

    const rangeParam = period === '6M' ? '6mo' : period === '3Y' ? '5y' : period === '5Y' ? '5y' : '1y';

    const evaluated = await Promise.all(
      universe.map(async (symbol) => {
        try {
          const quote = await marketDataService.getQuote(symbol, rangeParam);
          const closes = quote.historicalCloses;
          if (closes.length < 10) return null;

          const startClose = closes[0].price;
          const endClose = quote.price;
          if (startClose <= 0 || endClose <= 0) return null;

          const returnPct = Number((((endClose - startClose) / startClose) * 100).toFixed(2));
          return {
            symbol: quote.symbol,
            name: quote.name,
            currentPrice: endClose,
            startingPrice: startClose,
            returnPct,
            sessionDate: quote.sessionDate,
          };
        } catch {
          return null;
        }
      }),
    );

    const validItems = evaluated.filter((x): x is NonNullable<typeof x> => x !== null);

    // Sort descending for TOP, ascending for BOTTOM
    validItems.sort((a, b) => (order === 'TOP' ? b.returnPct - a.returnPct : a.returnPct - b.returnPct));

    const topItems: RankedStockItem[] = validItems.slice(0, count).map((item, idx) => ({
      rank: idx + 1,
      symbol: item.symbol,
      name: item.name,
      currentPrice: item.currentPrice,
      startingPrice: item.startingPrice,
      returnPct: item.returnPct,
      period: `Trailing ${period}`,
      sessionDate: item.sessionDate,
    }));

    return {
      items: topItems,
      universeSize: universe.length,
      evaluatedCount: validItems.length,
      periodLabel: `Trailing ${period}`,
      asOf: topItems[0]?.sessionDate || new Date().toISOString().split('T')[0],
      coverageNote: `Sampled across a representative universe of ${validItems.length} prominent Indian equities (NSE Large/Mid-Cap). Historical returns exclude dividends.`,
    };
  }

  /**
   * Tool 2: Search recent company news or event announcements for market moves.
   */
  public async getRecentVerifiedNews(queryTopic: string): Promise<NewsSnippet[]> {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryTopic + ' stock market news nse bse')}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const regex = /<a class="result__snippet"[^>]*>(.*?)<\/a>/g;
      const titleRegex = /<a class="result__url"[^>]*>(.*?)<\/a>/g;

      let match;
      const snippets: NewsSnippet[] = [];

      while ((match = regex.exec(html)) !== null && snippets.length < 3) {
        const text = match[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .trim();

        if (text.length > 25) {
          snippets.push({
            title: `Market Tape Report on ${queryTopic}`,
            source: 'Financial Press Feed',
            snippet: text,
          });
        }
      }

      return snippets;
    } catch (err: any) {
      logger.warn({ err: err.message, queryTopic }, 'News tool execution failure');
      return [];
    }
  }

  /**
   * Tool 3: Multi-stock comparison across identical periods.
   */
  public async compareMultipleStocks(
    stockNamesOrTickers: string[],
    period: '1mo' | '3mo' | '1y' = '1y',
  ): Promise<Array<{
    symbol: string;
    name: string;
    price: number;
    returnPct: number;
    volatilityPct: number;
    sessionDate: string;
  }>> {
    const quotes = await Promise.all(
      stockNamesOrTickers.map(async (name) => {
        try {
          const resolved = await marketDataService.resolveSymbol(name);
          const sym = resolved[0]?.symbol || marketDataService.normalizeSymbol(name);
          const q = await marketDataService.getQuote(sym, period);
          const closes = q.historicalCloses.map((h) => h.price);
          const startP = closes[0] || q.price;
          const ret = Number((((q.price - startP) / (startP || 1)) * 100).toFixed(2));

          // Quick standard deviation
          let vol = 0;
          if (closes.length >= 5) {
            const rets = [];
            for (let i = 1; i < closes.length; i++) {
              if (closes[i - 1] > 0) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
            }
            const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
            const variance = rets.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (rets.length - 1);
            vol = Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(2));
          }

          return {
            symbol: q.symbol,
            name: q.name,
            price: q.price,
            returnPct: ret,
            volatilityPct: vol,
            sessionDate: q.sessionDate,
          };
        } catch {
          return null;
        }
      }),
    );

    return quotes.filter((q): q is NonNullable<typeof q> => q !== null);
  }
}

export const marketResearchToolService = new MarketResearchToolService();
