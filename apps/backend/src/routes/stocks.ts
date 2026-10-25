import { Router } from 'express';
import { logger } from '../logger';

const router = Router();

export interface StockQuote {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  previousClose: number;
  volume: number;
  oneMonthReturn: number;
  sixMonthReturn: number;
  oneYearReturn: number;
  volatility: number; // Annualized standard deviation of daily returns (%)
  history: { date: string; price: number; volume: number }[];
}

function normalizeIndianSymbol(symbol: string): string {
  let s = symbol.trim().toUpperCase();
  // Strip exchange prefix if provided like NSE:RELIANCE or BSE:TCS
  if (s.startsWith('NSE:')) s = s.replace('NSE:', '') + '.NS';
  else if (s.startsWith('BSE:')) s = s.replace('BSE:', '') + '.BO';
  else if (!s.endsWith('.NS') && !s.endsWith('.BO')) {
    // Default to NSE (.NS) for Indian equities
    s = `${s}.NS`;
  }
  return s;
}

// Fetch single stock chart + quotes from Yahoo Finance
async function fetchIndianStock(rawSymbol: string): Promise<StockQuote> {
  const symbol = normalizeIndianSymbol(rawSymbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch market data for ${symbol} (status: ${response.status})`);
  }

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result || !result.meta) {
    throw new Error(`No stock found matching symbol: ${symbol}`);
  }

  const meta = result.meta;
  const quoteIndicators = result.indicators?.quote?.[0] || {};
  const timestamps: number[] = result.timestamp || [];
  const closes: (number | null)[] = quoteIndicators.close || [];
  const volumes: (number | null)[] = quoteIndicators.volume || [];

  const history: { date: string; price: number; volume: number }[] = [];
  const dailyReturns: number[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const p = closes[i];
    if (p !== null && !isNaN(p) && p > 0) {
      const price = Number(p.toFixed(2));
      const vol = volumes[i] ?? 0;
      const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      history.push({ date, price, volume: vol });

      if (history.length > 1) {
        const prevP = history[history.length - 2].price;
        dailyReturns.push((price - prevP) / prevP);
      }
    }
  }

  const currentPrice = meta.regularMarketPrice ?? (history.length ? history[history.length - 1].price : 0);
  const previousClose = meta.chartPreviousClose ?? (history.length > 1 ? history[history.length - 2].price : currentPrice);
  const change = Number((currentPrice - previousClose).toFixed(2));
  const changePercent = previousClose ? Number(((change / previousClose) * 100).toFixed(2)) : 0;

  // Historical period returns
  const oneMonthAgo = history[Math.max(0, history.length - 22)]?.price ?? currentPrice;
  const sixMonthsAgo = history[Math.max(0, history.length - 126)]?.price ?? currentPrice;
  const oneYearAgo = history[0]?.price ?? currentPrice;

  const oneMonthReturn = oneMonthAgo ? Number((((currentPrice - oneMonthAgo) / oneMonthAgo) * 100).toFixed(2)) : 0;
  const sixMonthReturn = sixMonthsAgo ? Number((((currentPrice - sixMonthsAgo) / sixMonthsAgo) * 100).toFixed(2)) : 0;
  const oneYearReturn = oneYearAgo ? Number((((currentPrice - oneYearAgo) / oneYearAgo) * 100).toFixed(2)) : 0;

  // Annualized volatility
  let volatility = 0;
  if (dailyReturns.length > 5) {
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (dailyReturns.length - 1);
    const dailyStd = Math.sqrt(variance);
    volatility = Number((dailyStd * Math.sqrt(252) * 100).toFixed(2));
  }

  return {
    symbol: meta.symbol,
    name: meta.longName || meta.shortName || meta.symbol,
    currency: meta.currency || 'INR',
    exchange: meta.fullExchangeName || meta.exchangeName || 'NSE',
    currentPrice: Number(currentPrice.toFixed(2)),
    change,
    changePercent,
    dayHigh: meta.regularMarketDayHigh ? Number(meta.regularMarketDayHigh.toFixed(2)) : currentPrice,
    dayLow: meta.regularMarketDayLow ? Number(meta.regularMarketDayLow.toFixed(2)) : currentPrice,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ? Number(meta.fiftyTwoWeekHigh.toFixed(2)) : currentPrice,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ? Number(meta.fiftyTwoWeekLow.toFixed(2)) : currentPrice,
    previousClose: Number(previousClose.toFixed(2)),
    volume: meta.regularMarketVolume ?? 0,
    oneMonthReturn,
    sixMonthReturn,
    oneYearReturn,
    volatility,
    history,
  };
}

// GET /api/stocks/search?q=TCS
router.get('/search', async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      res.json({ results: [] });
      return;
    }

    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    if (!response.ok) {
      throw new Error('Search provider error');
    }

    const data = await response.json();
    const quotes = (data.quotes || [])
      .filter((q: { symbol?: string }) => {
        const s = q.symbol || '';
        return s.endsWith('.NS') || s.endsWith('.BO');
      })
      .map((q: { symbol: string; shortname?: string; longname?: string; exchange?: string }) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchange === 'NSI' ? 'NSE' : (q.exchange === 'BOM' ? 'BSE' : q.exchange),
      }));

    res.json({ results: quotes });
  } catch (err) {
    next(err);
  }
});

// GET /api/stocks/quote/:symbol
router.get('/quote/:symbol', async (req, res, next) => {
  try {
    const symbol = req.params.symbol;
    const stock = await fetchIndianStock(symbol);
    res.json({ stock });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stock not found';
    res.status(404).json({ error: message });
  }
});

// POST /api/stocks/compare-and-switch
router.post('/compare-and-switch', async (req, res, next) => {
  try {
    const { currentSymbol, targetSymbol, investmentAmount } = req.body;

    if (!currentSymbol || !targetSymbol) {
      res.status(400).json({ error: 'Please provide both currentSymbol and targetSymbol' });
      return;
    }

    const amount = Number(investmentAmount) || 100000; // Default ₹1,00,000

    // Fetch real-time market data for both stocks in parallel
    const [currentStock, targetStock] = await Promise.all([
      fetchIndianStock(currentSymbol),
      fetchIndianStock(targetSymbol),
    ]);

    // Align historical dates for direct comparative returns
    const currentDateMap = new Map(currentStock.history.map(h => [h.date, h.price]));
    const targetDateMap = new Map(targetStock.history.map(h => [h.date, h.price]));

    const sharedDates = currentStock.history
      .map(h => h.date)
      .filter(date => targetDateMap.has(date));

    let currentBase = 0;
    let targetBase = 0;
    if (sharedDates.length > 0) {
      currentBase = currentDateMap.get(sharedDates[0]) || 1;
      targetBase = targetDateMap.get(sharedDates[0]) || 1;
    }

    const normalizedTimeline = sharedDates.map(date => {
      const cP = currentDateMap.get(date) || currentBase;
      const tP = targetDateMap.get(date) || targetBase;
      return {
        date,
        currentStockPrice: cP,
        targetStockPrice: tP,
        currentNormalized: Number(((cP / currentBase) * 100).toFixed(2)),
        targetNormalized: Number(((tP / targetBase) * 100).toFixed(2)),
      };
    });

    // Score both stocks across Momentum, Risk/Volatility, 52W High Gap, Returns
    let currentScore = 0;
    let targetScore = 0;

    // 1. 1-Year Return
    if (targetStock.oneYearReturn > currentStock.oneYearReturn) targetScore += 2;
    else currentScore += 2;

    // 2. 6-Month Momentum
    if (targetStock.sixMonthReturn > currentStock.sixMonthReturn) targetScore += 2;
    else currentScore += 2;

    // 3. 1-Month Momentum
    if (targetStock.oneMonthReturn > currentStock.oneMonthReturn) targetScore += 1;
    else currentScore += 1;

    // 4. Volatility / Risk profile (lower volatility is safer)
    if (targetStock.volatility < currentStock.volatility) targetScore += 1.5;
    else currentScore += 1.5;

    // 5. Discount from 52-week High (Valuation / Upside room)
    const currentDiscount = currentStock.fiftyTwoWeekHigh ? ((currentStock.fiftyTwoWeekHigh - currentStock.currentPrice) / currentStock.fiftyTwoWeekHigh) * 100 : 0;
    const targetDiscount = targetStock.fiftyTwoWeekHigh ? ((targetStock.fiftyTwoWeekHigh - targetStock.currentPrice) / targetStock.fiftyTwoWeekHigh) * 100 : 0;

    let recommendation: 'STRONG_SWITCH' | 'CONSIDER_SWITCH' | 'HOLD_CURRENT' | 'NEUTRAL';
    let verdict: string;
    let strategy: string;
    let reasonings: string[] = [];

    const diff = targetScore - currentScore;

    if (diff >= 3) {
      recommendation = 'STRONG_SWITCH';
      verdict = `Switching from ${currentStock.name} to ${targetStock.name} is a high-conviction decision.`;
      strategy = `Staggered Switch (STP / Tranche): Liquidate ${currentStock.symbol} in 2-3 tranches over 2 weeks and deploy into ${targetStock.symbol} to capture upside while hedging short-term volatility.`;
    } else if (diff > 0) {
      recommendation = 'CONSIDER_SWITCH';
      verdict = `Switching to ${targetStock.name} looks moderately favorable based on recent momentum and risk-reward.`;
      strategy = `Tactical Switch: Reallocate 40% to 50% of your position initially into ${targetStock.symbol}. Retain partial exposure to ${currentStock.symbol} until confirmation of target trend.`;
    } else if (diff < -2) {
      recommendation = 'HOLD_CURRENT';
      verdict = `Stay invested in ${currentStock.name}. Switching to ${targetStock.name} is not advised right now.`;
      strategy = `Hold & Accumulate: ${currentStock.symbol} demonstrates superior historical returns, lower risk, or stronger fundamentals. Switching would result in unfavorable opportunity cost.`;
    } else {
      recommendation = 'NEUTRAL';
      verdict = `Both stocks have comparable risk-return profiles. Switching offers neutral advantage.`;
      strategy = `Equal Allocation / Diversification: Rather than an outright switch, split the investment 50/50 across both ${currentStock.symbol} and ${targetStock.symbol} to benefit from both sectors.`;
    }

    if (targetStock.oneYearReturn > currentStock.oneYearReturn) {
      reasonings.push(`${targetStock.symbol} outperformed ${currentStock.symbol} over the past 1 year (${targetStock.oneYearReturn > 0 ? '+' : ''}${targetStock.oneYearReturn}% vs ${currentStock.oneYearReturn > 0 ? '+' : ''}${currentStock.oneYearReturn}%).`);
    } else {
      reasonings.push(`${currentStock.symbol} has shown superior 1-year stability (${currentStock.oneYearReturn}% vs ${targetStock.oneYearReturn}%).`);
    }

    if (targetStock.volatility < currentStock.volatility) {
      reasonings.push(`${targetStock.symbol} exhibits lower annualized volatility (${targetStock.volatility}% vs ${currentStock.volatility}%), offering a smoother risk curve.`);
    } else {
      reasonings.push(`${targetStock.symbol} is more volatile (${targetStock.volatility}% vs ${currentStock.volatility}%), which presents higher price swings.`);
    }

    reasonings.push(
      `${currentStock.symbol} is trading at ₹${currentStock.currentPrice} (${currentDiscount.toFixed(1)}% off 52W High), while ${targetStock.symbol} is trading at ₹${targetStock.currentPrice} (${targetDiscount.toFixed(1)}% off 52W High).`
    );

    // Current units vs Target units for given amount
    const currentUnits = Number((amount / currentStock.currentPrice).toFixed(2));
    const targetUnits = Number((amount / targetStock.currentPrice).toFixed(2));

    res.json({
      investmentAmount: amount,
      recommendation,
      verdict,
      strategy,
      reasonings,
      comparison: {
        currentStock,
        targetStock,
        currentUnits,
        targetUnits,
        timeline: normalizedTimeline,
      },
    });
  } catch (err: unknown) {
    logger.error(err, 'Stock switch analysis failed');
    const msg = err instanceof Error ? err.message : 'Failed to analyze stock switch';
    res.status(500).json({ error: msg });
  }
});

export default router;
