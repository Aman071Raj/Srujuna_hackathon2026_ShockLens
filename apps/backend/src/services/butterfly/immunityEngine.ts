import { getAllMacroBaselines } from './marketData';

export interface HedgeOption {
  id: string;
  name: string;
  ticker: string;
  instrumentType: 'ETF' | 'COMMODITY' | 'DEFENSIVE_STOCK' | 'TREASURY';
  recommendedAllocationPct: number;
  recommendedAmount: number;
  hedgeReason: string;
  expectedProtectionPct: number; // Downside reduction (e.g. 45%)
  riskMitigated: string; // e.g. "Crude spike & Rupee depreciation"
}

export interface ImmunityResult {
  currentDownsideAtRisk: number; // ₹ at risk under current live conditions
  protectedDownsideValue: number; // ₹ at risk after applying recommended immunity
  overallRiskReductionPct: number; // e.g. 62%
  primaryVulnerability: string;
  budgetAllocated: number;
  recommendedHedges: HedgeOption[];
}

export async function calculateShockImmunity(
  holdings: Array<{
    id: string;
    name: string;
    ticker?: string;
    assetClass: string;
    sector?: string;
    valueInPortfolioCurrency: number;
  }>,
  budgetAmount: number, // additional capital or rebalance amount to invest (e.g. ₹5000 or ₹25000)
): Promise<ImmunityResult> {
  const baselines = await getAllMacroBaselines();

  const totalPortfolioValue = holdings.reduce((s, h) => s + (Number(h.valueInPortfolioCurrency) || 0), 0);
  const baselineCrude = baselines['CL=F']?.changePercent || 10;
  const baselineUsdInr = baselines['INR=X']?.latestPrice || 84;

  // 1. Analyze sector exposures to find vulnerability
  let techExposure = 0;
  let consumerExposure = 0;
  let bankExposure = 0;
  let energyExposure = 0;

  for (const h of holdings) {
    const val = Number(h.valueInPortfolioCurrency) || 0;
    const s = (h.sector || '').toLowerCase();
    const ac = (h.assetClass || '').toLowerCase();

    if (s.includes('tech') || s.includes('it') || ac === 'alternative') techExposure += val;
    else if (s.includes('consumer') || s.includes('auto') || s.includes('fmcg')) consumerExposure += val;
    else if (s.includes('bank') || s.includes('finan')) bankExposure += val;
    else if (s.includes('energy') || s.includes('oil')) energyExposure += val;
  }

  // Current downside estimation
  const effectiveBudget = budgetAmount > 0 ? budgetAmount : Math.max(5000, Math.round(totalPortfolioValue * 0.15));
  const estimatedLossWithoutHedge = Math.round(totalPortfolioValue * 0.145); // default base risk ~14.5%

  const hedges: HedgeOption[] = [];

  // Determine top vulnerability
  let primaryVulnerability = 'Market Volatility & Beta Sensitivity';

  if (techExposure / (totalPortfolioValue || 1) > 0.3) {
    primaryVulnerability = 'High Tech / Growth Exposure to Global Interest-Rate Pressures';
  } else if (consumerExposure / (totalPortfolioValue || 1) > 0.25) {
    primaryVulnerability = 'Consumer Margin Pressure from Rising Input Costs & Crude Volatility';
  } else if (bankExposure / (totalPortfolioValue || 1) > 0.35) {
    primaryVulnerability = 'Banking Margin Squeeze from Higher Bond Yields';
  }

  // Construct defensive hedges based on market indicators & holdings
  // A. Gold Hedge (Universal Safe Haven / Rupee Depreciation Defense)
  const goldAmount = Math.round(effectiveBudget * 0.40);
  hedges.push({
    id: 'h-gold',
    name: 'Nippon India ETF Gold BeES',
    ticker: 'GOLDBEES.NS',
    instrumentType: 'COMMODITY',
    recommendedAllocationPct: 40,
    recommendedAmount: goldAmount,
    hedgeReason: 'Negative correlation to equity drawdowns. Absorbs rupee depreciation and flight-to-safety capital.',
    expectedProtectionPct: 55,
    riskMitigated: 'Currency Depreciation & Global Geopolitical Volatility',
  });

  // B. Defensive Large-Cap / Cash & Liquid Instrument
  const liquidAmount = Math.round(effectiveBudget * 0.35);
  hedges.push({
    id: 'h-liquid',
    name: 'Nippon India Liquid ETF (Cash Equivalents)',
    ticker: 'LIQUIDBEES.NS',
    instrumentType: 'TREASURY',
    recommendedAllocationPct: 35,
    recommendedAmount: liquidAmount,
    hedgeReason: 'Zero equity volatility buffer. Provides dry powder with daily dividend compounding at RBI repo rates.',
    expectedProtectionPct: 75,
    riskMitigated: 'Sudden Liquidity Freezes & High Valuation Market Drawdowns',
  });

  // C. Energy & Crude Inflation Hedge or Low-Beta Dividend Defense
  const energyAmount = effectiveBudget - goldAmount - liquidAmount;
  if (energyExposure < totalPortfolioValue * 0.10) {
    hedges.push({
      id: 'h-energy',
      name: 'Reliance Industries / CPSE Energy ETF',
      ticker: 'CPSEETF.NS',
      instrumentType: 'ETF',
      recommendedAllocationPct: 25,
      recommendedAmount: energyAmount,
      hedgeReason: 'Acts as a natural operational hedge when crude oil and refining margins surge.',
      expectedProtectionPct: 48,
      riskMitigated: 'Crude Oil Benchmarks Rising Above $90/bbl',
    });
  } else {
    hedges.push({
      id: 'h-pharma',
      name: 'Nippon India Pharma ETF',
      ticker: 'PHARMABEES.NS',
      instrumentType: 'DEFENSIVE_STOCK',
      recommendedAllocationPct: 25,
      recommendedAmount: energyAmount,
      hedgeReason: 'Inelastic demand sector with low beta. Historically out-performs during broad market corrections.',
      expectedProtectionPct: 52,
      riskMitigated: 'Broad Market Slowdown & Domestic Demand Slump',
    });
  }

  // The more protection capital (hedge budget) the investor allocates relative to their portfolio risk,
  // the more of that downside loss is cushioned/absorbed.
  // Full hedge ratio = effectiveBudget / estimatedLossWithoutHedge
  const coverageRatio = Math.min(1.0, effectiveBudget / (estimatedLossWithoutHedge || 1));
  
  // Dynamic risk reduction scales with coverage ratio (e.g. from 20% up to 92%)
  const overallRiskReductionPct = Math.min(95, Math.round(coverageRatio * 85 + 10));
  
  // Protected downside directly decreases as hedge capital increases
  const protectedDownsideValue = Math.max(0, Math.round(estimatedLossWithoutHedge * (1 - overallRiskReductionPct / 100)));

  return {
    currentDownsideAtRisk: estimatedLossWithoutHedge,
    protectedDownsideValue,
    overallRiskReductionPct,
    primaryVulnerability,
    budgetAllocated: effectiveBudget,
    recommendedHedges: hedges,
  };
}
