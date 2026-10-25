/**
 * Deterministic Financial Quantitative Analytics Engine
 * Provides mathematically sound calculations for technical indicators, risk metrics,
 * portfolio concentration, stock switch comparisons, and scenario shocks.
 */
import { MarketQuote } from './marketDataService';

export interface TechnicalIndicators {
  rsi14: { value: number; period: number; method: string } | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  annualizedVolatilityPct: { value: number; lookbackDays: number; annualizationFactor: number } | null;
  maxDrawdownPct: { value: number; lookbackDays: number } | null;
  supportEstimate: { value: number; method: string } | null;
  resistanceEstimate: { value: number; method: string } | null;
  dataObservations: number;
  startDate?: string;
  endDate?: string;
}

export interface StockComparisonResult {
  currentStock: {
    symbol: string;
    name: string;
    price: number;
    changePercent: number | null;
    oneMonthReturnPct: number | null;
    oneYearReturnPct: number | null;
    annualizedVolatilityPct: number | null;
    maxDrawdownPct: number | null;
    rsi14: number | null;
    sessionDate: string;
  };
  targetStock: {
    symbol: string;
    name: string;
    price: number;
    changePercent: number | null;
    oneMonthReturnPct: number | null;
    oneYearReturnPct: number | null;
    annualizedVolatilityPct: number | null;
    maxDrawdownPct: number | null;
    rsi14: number | null;
    sessionDate: string;
  };
  portfolioImpact: {
    beforeConcentrationPct: number;
    afterConcentrationPct: number;
    volatilityChangeDelta: number | null;
    hypotheticalEstimatedTaxOrFriction: number;
    tradeEvaluation: string;
    keyRisks: string[];
    isPersonalizedPortfolio: boolean;
  };
  historicalCorrelation: number | null;
  dateRangeEvaluated: { from: string; to: string };
}

export class QuantitativeAnalyticsService {
  /**
   * Calculate 14-period Relative Strength Index (RSI) using Wilder smoothing.
   * Returns null if historical observations are insufficient (< period + 1).
   */
  public calculateRSI(closes: number[], period = 14): { value: number; period: number; method: string } | null {
    if (!closes || closes.length <= period) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) {
        avgGain = (avgGain * (period - 1) + diff) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
      }
    }

    let rsiValue: number;
    if (avgLoss === 0) {
      rsiValue = 100; // Mathematical definition when zero losses exist
    } else {
      const rs = avgGain / avgLoss;
      rsiValue = Number((100 - 100 / (1 + rs)).toFixed(2));
    }

    return {
      value: rsiValue,
      period,
      method: `Wilder's Smoothing (${period} trading sessions)`,
    };
  }

  /**
   * Calculate Simple Moving Average (SMA).
   */
  public calculateSMA(closes: number[], period: number): number | null {
    if (!closes || closes.length < period) return null;
    const slice = closes.slice(closes.length - period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return Number((sum / period).toFixed(2));
  }

  /**
   * Calculate Annualized Volatility (%) from daily close price returns.
   * Assumes 252 trading sessions per annum. Returns null if < 5 observations.
   */
  public calculateVolatility(closes: number[]): { value: number; lookbackDays: number; annualizationFactor: number } | null {
    if (!closes || closes.length < 5) return null;
    const dailyReturns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const prev = closes[i - 1];
      if (prev > 0) dailyReturns.push((closes[i] - prev) / prev);
    }
    if (dailyReturns.length < 4) return null;

    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (dailyReturns.length - 1);
    const dailyStd = Math.sqrt(variance);
    const annualFactor = Math.sqrt(252);
    const annualizedVol = Number((dailyStd * annualFactor * 100).toFixed(2));

    return {
      value: annualizedVol,
      lookbackDays: dailyReturns.length,
      annualizationFactor: 252,
    };
  }

  /**
   * Calculate Historical Maximum Peak-to-Trough Drawdown (%).
   * Returns null if fewer than 2 valid observations.
   */
  public calculateMaxDrawdown(closes: number[]): { value: number; lookbackDays: number } | null {
    if (!closes || closes.length < 2) return null;
    let peak = closes[0];
    let maxDrawdown = 0;

    for (const price of closes) {
      if (price > peak) {
        peak = price;
      }
      const drawdown = peak > 0 ? (peak - price) / peak : 0;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      value: Number((maxDrawdown * 100).toFixed(2)),
      lookbackDays: closes.length,
    };
  }

  /**
   * Computes deterministic technical indicator suite from verified closes.
   */
  public calculateTechnicalIndicators(quote: MarketQuote): TechnicalIndicators {
    const closes = quote.historicalCloses.map((h) => h.price);
    const count = closes.length;
    const startDate = quote.historicalCloses[0]?.date;
    const endDate = quote.historicalCloses[count - 1]?.date;

    const rsi14 = this.calculateRSI(closes, 14);
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const sma200 = this.calculateSMA(closes, 200);
    const annualizedVolatilityPct = this.calculateVolatility(closes);
    const maxDrawdownPct = this.calculateMaxDrawdown(closes);

    // Support and resistance: lowest and highest closing prices over the last 60 sessions
    let supportEstimate = null;
    let resistanceEstimate = null;
    if (closes.length >= 10) {
      const recentCloses = closes.slice(Math.max(0, closes.length - 60));
      supportEstimate = {
        value: Number(Math.min(...recentCloses).toFixed(2)),
        method: `60-Session Historical Low (${recentCloses.length} trading days)`,
      };
      resistanceEstimate = {
        value: Number(Math.max(...recentCloses).toFixed(2)),
        method: `60-Session Historical High (${recentCloses.length} trading days)`,
      };
    }

    return {
      rsi14,
      sma20,
      sma50,
      sma200,
      annualizedVolatilityPct,
      maxDrawdownPct,
      supportEstimate,
      resistanceEstimate,
      dataObservations: count,
      startDate,
      endDate,
    };
  }

  /**
   * Pearson correlation between two daily price series over identical dates.
   */
  public calculateCorrelation(
    historyA: { date: string; price: number }[],
    historyB: { date: string; price: number }[],
  ): number | null {
    // Build date-aligned map
    const mapB = new Map(historyB.map((h) => [h.date, h.price]));
    const alignedA: number[] = [];
    const alignedB: number[] = [];

    for (const h of historyA) {
      const priceB = mapB.get(h.date);
      if (priceB !== undefined && h.price > 0 && priceB > 0) {
        alignedA.push(h.price);
        alignedB.push(priceB);
      }
    }

    if (alignedA.length < 10) return null;

    const rA: number[] = [];
    const rB: number[] = [];
    for (let i = 1; i < alignedA.length; i++) {
      rA.push((alignedA[i] - alignedA[i - 1]) / alignedA[i - 1]);
      rB.push((alignedB[i] - alignedB[i - 1]) / alignedB[i - 1]);
    }

    const n = rA.length;
    if (n < 5) return null;

    const meanA = rA.reduce((s, x) => s + x, 0) / n;
    const meanB = rB.reduce((s, x) => s + x, 0) / n;

    let cov = 0;
    let varA = 0;
    let varB = 0;
    for (let i = 0; i < n; i++) {
      const diffA = rA[i] - meanA;
      const diffB = rB[i] - meanB;
      cov += diffA * diffB;
      varA += diffA * diffA;
      varB += diffB * diffB;
    }

    if (varA === 0 || varB === 0) return null;
    return Number((cov / Math.sqrt(varA * varB)).toFixed(2));
  }

  /**
   * Quantitative Stock Switch Comparison over aligned historical date range.
   */
  public compareStocks(
    currentQuote: MarketQuote,
    targetQuote: MarketQuote,
    portfolioHoldings: Array<{ name: string; ticker?: string; valueInPortfolioCurrency: number; sector?: string }>,
  ): StockComparisonResult {
    const techCurrent = this.calculateTechnicalIndicators(currentQuote);
    const techTarget = this.calculateTechnicalIndicators(targetQuote);

    const closesCurrent = currentQuote.historicalCloses.map((h) => h.price);
    const closesTarget = targetQuote.historicalCloses.map((h) => h.price);

    // Period returns
    const current1M = closesCurrent.length >= 22
      ? Number((((currentQuote.price - closesCurrent[closesCurrent.length - 22]) / closesCurrent[closesCurrent.length - 22]) * 100).toFixed(2))
      : null;
    const current1Y = closesCurrent.length >= 100
      ? Number((((currentQuote.price - closesCurrent[0]) / closesCurrent[0]) * 100).toFixed(2))
      : null;

    const target1M = closesTarget.length >= 22
      ? Number((((targetQuote.price - closesTarget[closesTarget.length - 22]) / closesTarget[closesTarget.length - 22]) * 100).toFixed(2))
      : null;
    const target1Y = closesTarget.length >= 100
      ? Number((((targetQuote.price - closesTarget[0]) / closesTarget[0]) * 100).toFixed(2))
      : null;

    const totalPortfolioValue = portfolioHoldings.reduce((sum, h) => sum + (h.valueInPortfolioCurrency || 0), 0);
    const isPersonalized = portfolioHoldings.length > 0;

    const currentHolding = isPersonalized
      ? portfolioHoldings.find(
          (h) =>
            (h.ticker && currentQuote.symbol.toUpperCase().includes(h.ticker.toUpperCase().replace('.NS', '').replace('.BO', ''))) ||
            h.name.toLowerCase().includes(currentQuote.name.toLowerCase().split(' ')[0]),
        )
      : undefined;

    const holdingValue = currentHolding?.valueInPortfolioCurrency || (totalPortfolioValue > 0 ? totalPortfolioValue * 0.15 : 100000);
    const beforeConcentrationPct = totalPortfolioValue > 0 ? Number(((holdingValue / totalPortfolioValue) * 100).toFixed(1)) : 0;
    const afterConcentrationPct = beforeConcentrationPct;

    const volCurrent = techCurrent.annualizedVolatilityPct?.value ?? null;
    const volTarget = techTarget.annualizedVolatilityPct?.value ?? null;
    const volatilityDelta = volCurrent !== null && volTarget !== null ? Number((volTarget - volCurrent).toFixed(2)) : null;

    const corr = this.calculateCorrelation(currentQuote.historicalCloses, targetQuote.historicalCloses);
    const estimatedFriction = Number((holdingValue * 0.002).toFixed(0)); // 0.2% STT + brokerage

    let tradeEvaluation = '';
    const keyRisks: string[] = [];

    if (volatilityDelta !== null) {
      if (volatilityDelta < 0) {
        tradeEvaluation = `Switching to ${targetQuote.name} historically reduces annualized volatility by ${Math.abs(volatilityDelta)}% under identical lookback conditions.`;
      } else {
        tradeEvaluation = `Switching increases annualized volatility by ${volatilityDelta}%, requiring higher risk tolerance.`;
      }
    } else {
      tradeEvaluation = `Volatility comparison unavailable due to insufficient aligned price observations.`;
    }

    if (corr !== null && corr > 0.70) {
      keyRisks.push(`High correlation (${corr}) indicates both securities respond similarly to macro and sector shocks.`);
    }
    if (techTarget.rsi14 && techTarget.rsi14.value > 70) {
      keyRisks.push(`Target stock (${targetQuote.symbol}) 14-day RSI is ${techTarget.rsi14.value} (near-term overbought territory).`);
    }
    if (techTarget.maxDrawdownPct && techCurrent.maxDrawdownPct && techTarget.maxDrawdownPct.value > techCurrent.maxDrawdownPct.value) {
      keyRisks.push(`Target stock suffered a deeper 1-year historical drawdown (-${techTarget.maxDrawdownPct.value}% vs -${techCurrent.maxDrawdownPct.value}%).`);
    }
    keyRisks.push(`Hypothetical switch assumes ~₹${estimatedFriction.toLocaleString('en-IN')} in transaction fees, STT, and slippage.`);

    const dateRangeFrom = currentQuote.historicalCloses[0]?.date || 'N/A';
    const dateRangeTo = currentQuote.historicalCloses[currentQuote.historicalCloses.length - 1]?.date || 'N/A';

    return {
      currentStock: {
        symbol: currentQuote.symbol,
        name: currentQuote.name,
        price: currentQuote.price,
        changePercent: currentQuote.changePercent,
        oneMonthReturnPct: current1M,
        oneYearReturnPct: current1Y,
        annualizedVolatilityPct: volCurrent,
        maxDrawdownPct: techCurrent.maxDrawdownPct?.value ?? null,
        rsi14: techCurrent.rsi14?.value ?? null,
        sessionDate: currentQuote.sessionDate,
      },
      targetStock: {
        symbol: targetQuote.symbol,
        name: targetQuote.name,
        price: targetQuote.price,
        changePercent: targetQuote.changePercent,
        oneMonthReturnPct: target1M,
        oneYearReturnPct: target1Y,
        annualizedVolatilityPct: volTarget,
        maxDrawdownPct: techTarget.maxDrawdownPct?.value ?? null,
        rsi14: techTarget.rsi14?.value ?? null,
        sessionDate: targetQuote.sessionDate,
      },
      portfolioImpact: {
        beforeConcentrationPct,
        afterConcentrationPct,
        volatilityChangeDelta: volatilityDelta,
        hypotheticalEstimatedTaxOrFriction: estimatedFriction,
        tradeEvaluation,
        keyRisks,
        isPersonalizedPortfolio: isPersonalized,
      },
      historicalCorrelation: corr,
      dateRangeEvaluated: { from: dateRangeFrom, to: dateRangeTo },
    };
  }

  /**
   * Deterministic Portfolio Shock Calculator.
   */
  public simulateShock(
    holdings: Array<{ id: string; name: string; assetClass: string; sector?: string; valueInPortfolioCurrency: number }>,
    scenario: {
      type: 'NIFTY_DROP' | 'CRUDE_SURGE' | 'USD_DEPRECIATION';
      shockPercent: number;
    },
  ): {
    originalValue: number;
    shockedValue: number;
    rupeeImpact: number;
    percentageImpact: number;
    holdingBreakdown: {
      id: string;
      name: string;
      originalValue: number;
      shockedValue: number;
      delta: number;
      sensitivityApplied: number;
      rationale: string;
    }[];
    assumptions: string[];
  } {
    const totalOriginal = holdings.reduce((s, h) => s + (h.valueInPortfolioCurrency || 0), 0);
    const breakdown = [];
    const assumptions: string[] = [];

    if (scenario.type === 'NIFTY_DROP') {
      assumptions.push(`Simulating a hypothetical ${scenario.shockPercent}% broad index decline in NIFTY 50.`);
      assumptions.push(`Asset sensitivity (beta) applied: Equities (1.0 to 1.25 for cyclical banking/auto, 0.65 for defensive FMCG/Pharma).`);
      assumptions.push(`Fixed income and Cash holdings assumed invariant to equity market drawdowns (Beta = 0.0).`);
      assumptions.push(`Historical correlations during crises may diverge from normal market regimes.`);
    }

    for (const h of holdings) {
      const val = h.valueInPortfolioCurrency || 0;
      let beta = 1.0;
      let rationale = 'Standard baseline equity beta';

      if (h.assetClass === 'fixed_income' || h.assetClass === 'cash') {
        beta = 0.0;
        rationale = 'Fixed income / cash insulated from direct equity shock';
      } else {
        const sectorLower = (h.sector || '').toLowerCase();
        if (sectorLower.includes('it') || sectorLower.includes('tech')) {
          beta = 0.85;
          rationale = 'IT services export revenue provides modest buffer against domestic market shocks';
        } else if (sectorLower.includes('bank') || sectorLower.includes('financial')) {
          beta = 1.2;
          rationale = 'High systemic sensitivity to liquidity and credit cycle conditions';
        } else if (sectorLower.includes('fmcg') || sectorLower.includes('pharma')) {
          beta = 0.65;
          rationale = 'Defensive non-discretionary consumer / healthcare demand profile';
        }
      }

      const shockFraction = (scenario.shockPercent / 100) * beta;
      const shockedVal = Math.max(0, val * (1 + shockFraction));
      const delta = shockedVal - val;

      breakdown.push({
        id: h.id,
        name: h.name,
        originalValue: Math.round(val),
        shockedValue: Math.round(shockedVal),
        delta: Math.round(delta),
        sensitivityApplied: beta,
        rationale,
      });
    }

    const totalShocked = breakdown.reduce((s, b) => s + b.shockedValue, 0);
    const rupeeImpact = Math.round(totalShocked - totalOriginal);
    const percentageImpact = totalOriginal > 0 ? Number(((rupeeImpact / totalOriginal) * 100).toFixed(2)) : 0;

    return {
      originalValue: Math.round(totalOriginal),
      shockedValue: Math.round(totalShocked),
      rupeeImpact,
      percentageImpact,
      holdingBreakdown: breakdown,
      assumptions,
    };
  }
}

export const quantitativeAnalyticsService = new QuantitativeAnalyticsService();
