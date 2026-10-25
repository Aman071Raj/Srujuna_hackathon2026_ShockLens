import { marketDataService } from './marketDataService';
import { quantitativeAnalyticsService } from './quantitativeAnalyticsService';
import { logger } from '../logger';
import prisma from '../db';

export interface RecommendedStock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  oneYearReturnPct: number;
  volatilityPct: number;
  maxDrawdownPct: number;
  rsi14: number | null;
  trendStatus: 'STRONG_BULLISH' | 'MODERATE_GROWTH' | 'DEFENSIVE_COMPOUNDER' | 'RECOVERY';
  fitReason: string;
  suggestedAllocationPct: number;
  targetHorizonNote: string;
  portfolioRole?: 'DIRECT_REPLACEMENT' | 'DIVERSIFICATION' | 'MOMENTUM_BOOSTER' | 'DEFENSIVE_ANCHOR';
}

export interface PortfolioHoldingAudit {
  holdingId: string;
  ticker: string;
  name: string;
  currentValue: number;
  weightPct: number;
  sector: string;
  status: 'UNDERPERFORMER' | 'AT_RISK' | 'STABLE' | 'OUTPERFORMER';
  oneYearReturnPct: number;
  volatilityPct: number;
  maxDrawdownPct: number;
  rsi14: number | null;
  currentPrice: number;
  verdict: 'DUMP_RECOMMENDED' | 'TRIM_OR_REPLACE' | 'HOLD_COMPOUND' | 'ACCUMULATE';
  reason: string;
  suggestedSwitchSymbol?: string;
  suggestedSwitchName?: string;
  capitalToReallocate?: number;
}

export interface GoalInvestmentPlan {
  targetAmount: number;
  targetDate: string;
  timeHorizonYears: number;
  monthsRemaining: number;
  monthlyContribution: number;
  totalPlannedCapital: number;
  wealthDeficitToCompound: number;
  requiredAnnualReturnPct: number;
  marketTrendSummary: {
    niftyStatus: string;
    niftyCurrentPrice: number;
    niftyOneYearReturnPct: number;
    macroBackdrop: string;
  };
  recommendedStocks: RecommendedStock[];
  portfolioHoldingsAudit: PortfolioHoldingAudit[];
  dumpList: PortfolioHoldingAudit[];
  healthyHoldings: PortfolioHoldingAudit[];
  portfolioTotalValue: number;
  totalCapitalFreedFromDump: number;
  riskCategory: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE_GROWTH' | 'UNREALISTIC_REQUIRED_RETURN';
  strategicAdvice: string;
}

// Broad screener universe across diverse Indian market sectors
const SCREENER_UNIVERSE = [
  // Technology
  { symbol: 'TCS.NS', sector: 'Information Technology' },
  { symbol: 'INFY.NS', sector: 'Information Technology' },
  { symbol: 'HCLTECH.NS', sector: 'Information Technology' },
  // Banking & Financial Services
  { symbol: 'HDFCBANK.NS', sector: 'Banking & Financial Services' },
  { symbol: 'ICICIBANK.NS', sector: 'Banking & Financial Services' },
  { symbol: 'SBIN.NS', sector: 'Banking & Financial Services' },
  { symbol: 'BAJFINANCE.NS', sector: 'Banking & Financial Services' },
  // Consumer Discretionary & Retail
  { symbol: 'TITAN.NS', sector: 'Consumer Discretionary' },
  { symbol: 'TRENT.NS', sector: 'Retail & Consumer' },
  { symbol: 'DMART.NS', sector: 'Retail & Consumer' },
  { symbol: 'ITC.NS', sector: 'FMCG & Consumer' },
  // Energy, Conglomerate & Utilities
  { symbol: 'RELIANCE.NS', sector: 'Energy & Conglomerate' },
  { symbol: 'NTPC.NS', sector: 'Renewable & Power' },
  { symbol: 'TATAPOWER.NS', sector: 'Renewable & Power' },
  // Capital Goods, Infrastructure & Defence
  { symbol: 'LT.NS', sector: 'Capital Goods & Infrastructure' },
  { symbol: 'BEL.NS', sector: 'Defence & Electronics' },
  { symbol: 'HAL.NS', sector: 'Defence & Aerospace' },
  // Healthcare & Pharma
  { symbol: 'SUNPHARMA.NS', sector: 'Healthcare & Pharma' },
  { symbol: 'CIPLA.NS', sector: 'Healthcare & Pharma' },
  // Telecom
  { symbol: 'BHARTIARTL.NS', sector: 'Telecom' },
  // Automobile
  { symbol: 'M&M.NS', sector: 'Automobile & Mobility' },
  { symbol: 'TATAMOTORS.NS', sector: 'Automobile & Mobility' },
];

const COMMON_TICKER_MAP: Record<string, string> = {
  RI: 'RELIANCE.NS',
  RELIANCE: 'RELIANCE.NS',
  SBI: 'SBIN.NS',
  SBIN: 'SBIN.NS',
  ASM: 'DMART.NS',
  DMART: 'DMART.NS',
  PCJ: 'PCJEWELLER.NS',
  PCJEWELLER: 'PCJEWELLER.NS',
  TCS: 'TCS.NS',
  INFY: 'INFY.NS',
  HDFCBANK: 'HDFCBANK.NS',
  ICICIBANK: 'ICICIBANK.NS',
  WPO: 'WIPRO.NS',
  WIPRO: 'WIPRO.NS',
  ITC: 'ITC.NS',
  BHARTIARTL: 'BHARTIARTL.NS',
  KJW: 'KALYANKJIL.NS',
  AAPL: 'AAPL',
  MSFT: 'MSFT',
  GOOGL: 'GOOGL',
  AMZN: 'AMZN',
  NVDA: 'NVDA',
};

const SECTOR_KEYWORDS: Record<string, string> = {
  it: 'Information Technology',
  tech: 'Information Technology',
  technology: 'Information Technology',
  software: 'Information Technology',
  bank: 'Banking & Financial Services',
  banking: 'Banking & Financial Services',
  finance: 'Banking & Financial Services',
  financial: 'Banking & Financial Services',
  health: 'Healthcare & Pharma',
  healthcare: 'Healthcare & Pharma',
  pharma: 'Healthcare & Pharma',
  consumer: 'Consumer & Retail',
  retail: 'Consumer & Retail',
  fmcg: 'Consumer & Retail',
  commodity: 'Commodity & Jewellery',
  jewel: 'Commodity & Jewellery',
  jeweller: 'Commodity & Jewellery',
  jewellery: 'Commodity & Jewellery',
  energy: 'Energy & Conglomerate',
  power: 'Energy & Conglomerate',
  infra: 'Capital Goods & Infrastructure',
  infrastructure: 'Capital Goods & Infrastructure',
  defence: 'Defence & Aerospace',
  telecom: 'Telecom',
  auto: 'Automobile & Mobility',
};

function normalizeHoldingSector(sector?: string | null, name?: string | null): string {
  const combined = `${sector || ''} ${name || ''}`.toLowerCase();
  for (const [kw, normalized] of Object.entries(SECTOR_KEYWORDS)) {
    if (combined.includes(kw)) return normalized;
  }
  return sector || 'Diversified';
}

export class GoalRecommendationService {
  /**
   * Resolves a portfolio holding ticker or name to a verified ticker symbol
   */
  public async resolveHoldingSymbol(ticker?: string | null, name?: string | null): Promise<string | null> {
    const cleanTicker = (ticker || '').trim().toUpperCase();
    if (COMMON_TICKER_MAP[cleanTicker]) return COMMON_TICKER_MAP[cleanTicker];
    if (cleanTicker.endsWith('.NS') || cleanTicker.endsWith('.BO')) return cleanTicker;

    // Check if it's a known global/US ticker
    const US_EQUITIES = new Set(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'SPY', 'QQQ']);
    if (US_EQUITIES.has(cleanTicker)) return cleanTicker;

    // Attempt direct lookup with .NS
    if (cleanTicker) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}.NS?interval=1d&range=5d`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.ok) return `${cleanTicker}.NS`;
      } catch {}
    }

    // Attempt search resolution by name
    const query = name || ticker;
    if (query) {
      try {
        const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=3&newsCount=0`;
        const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.ok) {
          const data = (await res.json()) as any;
          const nse = data.quotes?.find((q: any) => q.symbol && (q.symbol.endsWith('.NS') || q.exchange === 'NSI'));
          if (nse) return nse.symbol;
          if (data.quotes?.[0]?.symbol) return data.quotes[0].symbol;
        }
      } catch {}
    }

    return cleanTicker ? `${cleanTicker}.NS` : null;
  }

  /**
   * Analyzes goal feasibility, audits portfolio holdings dynamically,
   * flags underperforming stocks to dump, and curates tailored replacement stocks
   * that specifically solve the portfolio's weaknesses and fill missing sectors.
   */
  public async analyzeAndRecommend(input: {
    targetAmount: number;
    targetDate: string;
    monthlyContribution: number;
    reservedCash?: number;
    currentSavings?: number;
    userId?: string;
    portfolioId?: string;
  }): Promise<GoalInvestmentPlan> {
    const targetDateObj = new Date(input.targetDate);
    const now = new Date();

    // Calculate horizon in months and years
    const diffMs = targetDateObj.getTime() - now.getTime();
    const daysRemaining = Math.max(30, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    const monthsRemaining = Math.max(1, Math.round(daysRemaining / 30.4375));
    const timeHorizonYears = Number((daysRemaining / 365.25).toFixed(1));

    const monthlyContribution = input.monthlyContribution || 0;
    const initialLumpSum = (input.reservedCash || 0) + (input.currentSavings || 0);
    const totalDeposited = initialLumpSum + (monthlyContribution * monthsRemaining);

    // Calculate required annual return (CAGR) needed
    let requiredAnnualReturnPct = 0;
    if (totalDeposited >= input.targetAmount) {
      requiredAnnualReturnPct = 0;
    } else {
      requiredAnnualReturnPct = this.calculateRequiredCAGR(
        initialLumpSum,
        monthlyContribution,
        monthsRemaining,
        input.targetAmount
      );
    }

    // Determine Risk Profile based on required return & time horizon
    let riskCategory: GoalInvestmentPlan['riskCategory'] = 'BALANCED';
    if (requiredAnnualReturnPct > 28) {
      riskCategory = 'UNREALISTIC_REQUIRED_RETURN';
    } else if (requiredAnnualReturnPct > 16 || timeHorizonYears < 2) {
      riskCategory = 'AGGRESSIVE_GROWTH';
    } else if (requiredAnnualReturnPct <= 9) {
      riskCategory = 'CONSERVATIVE';
    }

    // 1. Fetch live market benchmark (NIFTY 50)
    let niftyCurrentPrice = 24800;
    let niftyOneYearReturnPct = 14.5;
    let niftyStatus = 'Consolidating near 52-week highs with healthy long-term trend';
    try {
      const niftyQuote = await marketDataService.getQuote('^NSEI', '1y');
      niftyCurrentPrice = niftyQuote.price;
      const firstPrice = niftyQuote.historicalCloses[0]?.price || niftyCurrentPrice;
      niftyOneYearReturnPct = Number((((niftyCurrentPrice - firstPrice) / firstPrice) * 100).toFixed(2));
      if (niftyOneYearReturnPct > 15) {
        niftyStatus = 'Strong Bullish structural trend supported by domestic institutional inflows';
      } else if (niftyOneYearReturnPct < 0) {
        niftyStatus = 'Market in correction phase; presents attractive multi-year accumulation opportunity';
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to fetch NIFTY 50 quote for goal planner');
    }

    // 2. FETCH & AUDIT USER'S ACTUAL PORTFOLIO HOLDINGS FIRST
    let holdingsAudit: PortfolioHoldingAudit[] = [];
    let portfolioTotalValue = 0;
    const heldSymbolsSet = new Set<string>();
    const heldSectorsSet = new Set<string>();

    if (input.userId) {
      try {
        let holdingsRecord: any[] = [];
        if (input.portfolioId) {
          const port = await prisma.portfolioModel.findFirst({
            where: { id: input.portfolioId, userId: input.userId },
            include: { holdings: true },
          });
          if (port && port.holdings.length > 0) holdingsRecord = port.holdings;
        }

        if (holdingsRecord.length === 0) {
          const userPorts = await prisma.portfolioModel.findMany({
            where: { userId: input.userId },
            include: { holdings: true },
          });
          const withHoldings = userPorts.find((p) => p.holdings.length > 0);
          if (withHoldings) {
            holdingsRecord = withHoldings.holdings;
          }
        }

        portfolioTotalValue = holdingsRecord.reduce((acc, h) => acc + Number(h.currentValue), 0);

        if (holdingsRecord.length > 0) {
          holdingsAudit = await Promise.all(
            holdingsRecord.map(async (h) => {
              const holdingVal = Number(h.currentValue);
              const weightPct = portfolioTotalValue > 0 ? Number(((holdingVal / portfolioTotalValue) * 100).toFixed(1)) : 0;
              const resolvedSym = await this.resolveHoldingSymbol(h.ticker, h.name);
              const normalizedSector = normalizeHoldingSector(h.sector, h.name);

              if (resolvedSym) heldSymbolsSet.add(resolvedSym.toUpperCase());
              if (h.ticker) heldSymbolsSet.add(h.ticker.toUpperCase());
              heldSectorsSet.add(normalizedSector.toLowerCase());

              let oneYearReturnPct = 0;
              let volatilityPct = 22;
              let maxDrawdownPct = 15;
              let rsi14: number | null = null;
              let currentPrice = holdingVal;

              if (resolvedSym) {
                try {
                  const quote = await marketDataService.getQuote(resolvedSym, '1y');
                  currentPrice = quote.price;
                  const startPrice = quote.historicalCloses[0]?.price || quote.price;
                  oneYearReturnPct = Number((((quote.price - startPrice) / startPrice) * 100).toFixed(2));
                  const technicals = quantitativeAnalyticsService.calculateTechnicalIndicators(quote);
                  volatilityPct = technicals.annualizedVolatilityPct?.value ?? 22;
                  maxDrawdownPct = Math.abs(technicals.maxDrawdownPct?.value ?? 15);
                  rsi14 = technicals.rsi14?.value ?? null;
                } catch (e: any) {
                  logger.warn({ symbol: resolvedSym, err: e.message }, 'Could not fetch live quote for user holding');
                }
              }

              // Evaluate Performance & Dump Criteria:
              let status: PortfolioHoldingAudit['status'] = 'STABLE';
              let verdict: PortfolioHoldingAudit['verdict'] = 'HOLD_COMPOUND';
              let reason = `Holding is maintaining acceptable stability aligned with your goal horizon.`;

              if (oneYearReturnPct < -10) {
                status = 'UNDERPERFORMER';
                verdict = 'DUMP_RECOMMENDED';
                reason = `Severe negative 1-year return (${oneYearReturnPct}%) and -${maxDrawdownPct}% drawdown is actively draining your goal capital. Dump this stock and rotate capital into an outperforming sector compounder.`;
              } else if (volatilityPct > 45 && maxDrawdownPct > 35) {
                status = 'AT_RISK';
                verdict = 'DUMP_RECOMMENDED';
                reason = `Extreme historical volatility (${volatilityPct}%) and severe drawdown (-${maxDrawdownPct}%) introduce unacceptable risk to achieving your target by ${targetDateObj.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}.`;
              } else if (oneYearReturnPct < niftyOneYearReturnPct - 15) {
                status = 'UNDERPERFORMER';
                verdict = 'TRIM_OR_REPLACE';
                reason = `Lagging broader index (NIFTY ${niftyOneYearReturnPct}% vs ${oneYearReturnPct}%). Opportunity cost will hinder meeting the required CAGR of ${requiredAnnualReturnPct}%.`;
              } else if (oneYearReturnPct >= 20) {
                status = 'OUTPERFORMER';
                verdict = 'ACCUMULATE';
                reason = `Strong outperformer with +${oneYearReturnPct}% 1-year gains. Continue holding to compound wealth toward the goal.`;
              }

              return {
                holdingId: h.id,
                ticker: h.ticker || resolvedSym || 'CUSTOM',
                name: h.name,
                currentValue: holdingVal,
                weightPct,
                sector: normalizedSector,
                status,
                oneYearReturnPct,
                volatilityPct,
                maxDrawdownPct,
                rsi14,
                currentPrice,
                verdict,
                reason,
                capitalToReallocate: verdict === 'DUMP_RECOMMENDED' || verdict === 'TRIM_OR_REPLACE' ? holdingVal : 0,
              };
            })
          );
        }
      } catch (err: any) {
        logger.error({ err: err.message }, 'Failed auditing portfolio holdings for goal');
      }
    }

    const dumpList = holdingsAudit.filter((h) => h.verdict === 'DUMP_RECOMMENDED' || h.verdict === 'TRIM_OR_REPLACE');
    const healthyHoldings = holdingsAudit.filter((h) => h.verdict === 'HOLD_COMPOUND' || h.verdict === 'ACCUMULATE');
    const totalCapitalFreedFromDump = dumpList.reduce((acc, h) => acc + (h.capitalToReallocate || 0), 0);

    // 3. SCREEN & DYNAMICALLY SCORE CANDIDATES BASED ON PORTFOLIO GAPS & DUMPED STOCKS
    const analyzedStocks: Array<RecommendedStock & { score: number; portfolioRole: RecommendedStock['portfolioRole'] }> = [];

    await Promise.all(
      SCREENER_UNIVERSE.map(async (item) => {
        try {
          const quote = await marketDataService.getQuote(item.symbol, '1y');
          const technicals = quantitativeAnalyticsService.calculateTechnicalIndicators(quote);

          const startPrice = quote.historicalCloses[0]?.price || quote.price;
          const return1Y = Number((((quote.price - startPrice) / startPrice) * 100).toFixed(2));
          const vol = technicals.annualizedVolatilityPct?.value ?? 22;
          const mdd = Math.abs(technicals.maxDrawdownPct?.value ?? 15);
          const rsi = technicals.rsi14?.value ?? null;

          // Classify trend
          let trendStatus: RecommendedStock['trendStatus'] = 'MODERATE_GROWTH';
          if (return1Y > 30 && vol < 35) {
            trendStatus = 'STRONG_BULLISH';
          } else if (vol < 20 && return1Y > 8) {
            trendStatus = 'DEFENSIVE_COMPOUNDER';
          } else if (return1Y < 0 && rsi && rsi < 40) {
            trendStatus = 'RECOVERY';
          }

          // Base factor score
          let score = return1Y * 0.4 - vol * 0.2 - mdd * 0.15;
          if (riskCategory === 'CONSERVATIVE') {
            score = (vol < 22 ? 30 : 0) + return1Y * 0.25 - mdd * 0.3;
          } else if (riskCategory === 'AGGRESSIVE_GROWTH') {
            score = return1Y * 0.6 - vol * 0.1;
          }

          // --- DYNAMIC PORTFOLIO PERSONALIZATION ADJUSTMENTS ---
          let portfolioRole: RecommendedStock['portfolioRole'] = 'MOMENTUM_BOOSTER';
          let fitReason = `Solid ${item.sector} fundamental leader with ${return1Y}% 1-year momentum and controlled ${vol}% volatility.`;

          const isAlreadyHeld = heldSymbolsSet.has(item.symbol.toUpperCase());
          const isSectorHeld = Array.from(heldSectorsSet).some((s) => item.sector.toLowerCase().includes(s) || s.includes(item.sector.toLowerCase()));
          const matchingDump = dumpList.find((d) => {
            const dSec = (d.sector || '').toLowerCase();
            const iSec = item.sector.toLowerCase();
            return dSec.includes(iSec) || iSec.includes(dSec);
          });

          // Direct replacement bonus: If user has an underperformer in this sector, prioritize outperforming peer
          if (matchingDump && return1Y > matchingDump.oneYearReturnPct + 5) {
            score += 45;
            portfolioRole = 'DIRECT_REPLACEMENT';
            fitReason = `Direct upgrade for underperforming ${matchingDump.name} (${matchingDump.oneYearReturnPct}% 1Y). Replaces dragging position with stronger ${item.sector} leader.`;
          } else if (!isSectorHeld && return1Y > 0) {
            // Sector diversification bonus: Fills an unrepresented sector in user's portfolio
            score += 30;
            portfolioRole = 'DIVERSIFICATION';
            fitReason = `Fills an unhedged portfolio gap in ${item.sector}. Adds non-correlated returns with ${return1Y}% 1Y gain to protect your goal.`;
          } else if (vol < 20 && return1Y > 0) {
            portfolioRole = 'DEFENSIVE_ANCHOR';
            fitReason = `High-stability defensive compounder in ${item.sector}. Protects capital with low volatility (${vol}%) while compounding safely.`;
          }

          // Penalty if user already holds this exact stock (we want NEW accretive recommendations)
          if (isAlreadyHeld) {
            score -= 80;
          }

          analyzedStocks.push({
            symbol: quote.symbol,
            name: quote.name,
            sector: item.sector,
            price: quote.price,
            oneYearReturnPct: return1Y,
            volatilityPct: vol,
            maxDrawdownPct: mdd,
            rsi14: rsi,
            trendStatus,
            fitReason,
            suggestedAllocationPct: 0,
            targetHorizonNote: timeHorizonYears >= 3 ? 'Suitable for 3-5Y compounding' : 'Shorter horizon tactical pick',
            score,
            portfolioRole,
          });
        } catch (err: any) {
          logger.warn({ symbol: item.symbol, err: err.message }, 'Failed evaluating stock for goal screener');
        }
      })
    );

    // Sort candidates by personalized score descending
    analyzedStocks.sort((a, b) => b.score - a.score);

    // Select top 5 diversified stocks (avoiding duplicate sectors)
    const selected: RecommendedStock[] = [];
    const sectorCount: Record<string, number> = {};
    for (const stock of analyzedStocks) {
      if (selected.length >= 5) break;
      const count = sectorCount[stock.sector] || 0;
      if (count < 2) {
        selected.push(stock);
        sectorCount[stock.sector] = count + 1;
      }
    }

    const weights = [30, 25, 20, 15, 10];
    selected.forEach((s, idx) => {
      s.suggestedAllocationPct = weights[idx] || Math.round(100 / selected.length);
    });

    // 4. LINK DUMP STOCKS TO SPECIFIC TARGET REPLACEMENTS
    // Prioritize direct sector peer; if none, allocate to distinct selected replacements
    const assignedReplacements = new Set<string>();
    for (const d of dumpList) {
      const dSec = (d.sector || '').toLowerCase();
      // Try finding an unassigned sector peer first
      let peer = selected.find(
        (s) => !assignedReplacements.has(s.symbol) && (s.sector.toLowerCase().includes(dSec) || dSec.includes(s.sector.toLowerCase()))
      );
      // If not found, pick the next best unassigned replacement
      if (!peer) {
        peer = selected.find((s) => !assignedReplacements.has(s.symbol));
      }
      // Fallback to top selected
      if (!peer) {
        peer = selected[0];
      }

      if (peer) {
        assignedReplacements.add(peer.symbol);
        d.suggestedSwitchSymbol = peer.symbol;
        d.suggestedSwitchName = peer.name;
        d.reason = `${d.reason.replace(/like [^.]+\./, '')} Rotate capital directly into ${peer.name} (${peer.symbol}, +${peer.oneYearReturnPct}% 1Y).`;
      }
    }

    let strategicAdvice = `Required CAGR: ${requiredAnnualReturnPct}%.`;
    if (dumpList.length > 0) {
      strategicAdvice += ` Found ${dumpList.length} lagging stocks. Dump them to free ₹${totalCapitalFreedFromDump.toLocaleString('en-IN')} and rotate into recommended picks.`;
    } else if (holdingsAudit.length > 0) {
      strategicAdvice += ` Holdings look healthy. Deploy monthly SIP into the recommended picks.`;
    }

    return {
      targetAmount: input.targetAmount,
      targetDate: input.targetDate,
      timeHorizonYears,
      monthsRemaining,
      monthlyContribution,
      totalPlannedCapital: totalDeposited,
      wealthDeficitToCompound: Math.max(0, input.targetAmount - totalDeposited),
      requiredAnnualReturnPct,
      marketTrendSummary: {
        niftyStatus,
        niftyCurrentPrice,
        niftyOneYearReturnPct,
        macroBackdrop: `NIFTY 50 is trading at ₹${niftyCurrentPrice.toLocaleString('en-IN')} with ${niftyOneYearReturnPct}% 1-year historical return.`,
      },
      recommendedStocks: selected,
      portfolioHoldingsAudit: holdingsAudit,
      dumpList,
      healthyHoldings,
      portfolioTotalValue,
      totalCapitalFreedFromDump,
      riskCategory,
      strategicAdvice,
    };
  }

  /**
   * Internal helper to approximate required CAGR for monthly SIP + Lump sum to reach future value.
   */
  private calculateRequiredCAGR(lumpSum: number, monthly: number, months: number, futureTarget: number): number {
    if (months <= 0) return 0;

    let low = 0.0;
    let high = 1.0;
    let bestRate = 0.12;

    for (let iter = 0; iter < 40; iter++) {
      const mid = (low + high) / 2;
      const monthlyRate = Math.pow(1 + mid, 1 / 12) - 1;

      let fv = lumpSum * Math.pow(1 + monthlyRate, months);
      if (monthlyRate > 0 && monthly > 0) {
        fv += monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      } else if (monthly > 0) {
        fv += monthly * months;
      }

      if (Math.abs(fv - futureTarget) < 100) {
        bestRate = mid;
        break;
      }

      if (fv < futureTarget) {
        low = mid;
      } else {
        high = mid;
      }
      bestRate = mid;
    }

    return Number((bestRate * 100).toFixed(1));
  }
}

export const goalRecommendationService = new GoalRecommendationService();
