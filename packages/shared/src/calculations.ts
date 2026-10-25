/**
 * ShockLens — Financial Calculation Engine
 *
 * All functions are pure (no side effects, no I/O).
 * Amounts are represented as JavaScript numbers; callers must store
 * monetary values using Prisma Decimal / PostgreSQL NUMERIC to avoid
 * floating-point accumulation in the database.
 *
 * SHOCK COMBINATION RULE (documented):
 *   A holding's total shock is computed as:
 *     baseShock = equityShock  (if assetClass === 'equity')
 *     sectorShock = sectorShocks[sector] ?? 0
 *     combinedShock = (1 + baseShock) * (1 + sectorShock) - 1
 *   For fixed-income holdings, interest-rate sensitivity is:
 *     rateImpact = rateShockSensitivity * (interestRateChangeBps / 10000)
 *   The final multiplier applied to currentValue is:
 *     1 + combinedShock + rateImpact + currencyImpact
 *   This approach allows compound shocks without hidden double-counting.
 *
 * CURRENCY HANDLING:
 *   valueInPortfolioCurrency is pre-converted by the caller using
 *   user-supplied or explicitly dated demo exchange rates.
 *   Currency shocks reduce the converted value:
 *     currencyImpact = currencyShocks[holdingCurrency] ?? 0
 *
 * LIQUIDITY MODEL:
 *   A holding is accessible by goalDate if:
 *     TODAY + liquidityDays <= goalDate  (ignoring restriction multiplier)
 *   Under a liquidity shock, liquidityDays is multiplied by
 *   liquidityRestrictionMultiplier (rounded up).
 *   When a liquidationHaircut is set, liquid value = value * (1 - haircut).
 *
 * CONTRIBUTIONS:
 *   Monthly contributions are assumed to flow into cash and are fully
 *   accessible regardless of liquidity restrictions.
 *
 * INFLATION:
 *   No inflation adjustment is applied; all amounts are nominal.
 *   This is documented in the assumptions object returned with every result.
 *
 * MISSING DATA:
 *   Holdings with missing sector are excluded from sector shocks.
 *   Holdings with missing rateShockSensitivity are not affected by rate shocks.
 */

import type {
  Holding,
  FinancialGoal,
  ScenarioDefinition,
  HoldingShockResult,
  ScenarioResult,
  BreakingPointResult,
  BreakingPointStatus,
  FailureCondition,
  ExposureCluster,
  ExposureResult,
  CalculationAssumptions,
  AllocationAlternative,
} from './types';

// ============================================================
// Constants and Helpers
// ============================================================

const STANDARD_ASSUMPTIONS: CalculationAssumptions = {
  shockCombinationRule:
    'Equity and sector shocks are compounded multiplicatively: (1+equityShock)*(1+sectorShock)-1. ' +
    'Rate and currency shocks are additive to the combined equity/sector shock.',
  currencyRateSource:
    'User-provided exchange rates or explicitly dated demo rates. No live market data.',
  liquidityModel:
    'A holding is liquid if (today + liquidityDays * restrictionMultiplier) <= goalDate. ' +
    'Haircuts reduce accessible value.',
  contributionAssumption:
    'Monthly contributions are assumed constant and fully accessible from the contribution date. ' +
    'No contribution shock is applied.',
  inflationAssumption:
    'All values are nominal. No inflation adjustment is applied.',
  rateShockModel:
    'Fixed-income holdings with rateShockSensitivity use: impact = sensitivity * (bps/10000). ' +
    'Holdings without this field are unaffected by rate shocks.',
  missingDataHandling:
    'Missing sector: sector shock skipped. Missing rateShockSensitivity: rate shock skipped. ' +
    'Missing currency shock: currency shock skipped.',
};

const DISCLAIMER =
  'HYPOTHETICAL SCENARIO — NOT A PREDICTION OR GUARANTEED OUTCOME. ' +
  'Results are based on simplified models with user-supplied data and stated assumptions. ' +
  'Past performance does not guarantee future results. ' +
  'This tool does not constitute financial advice.';

/** Map liquidity period to approximate days */
export function liquidityDaysFromPeriod(period: Holding['liquidityPeriod']): number {
  switch (period) {
    case 'immediate': return 1;
    case 'short':     return 5;
    case 'medium':    return 60;
    case 'long':      return 270;
    case 'illiquid':  return 99999;
    default:          return 99999;
  }
}

/** Days between two ISO date strings */
export function daysBetween(from: string | Date, to: string | Date): number {
  const f = typeof from === 'string' ? new Date(from) : from;
  const t = typeof to === 'string' ? new Date(to) : to;
  return Math.floor((t.getTime() - f.getTime()) / 86_400_000);
}

// ============================================================
// Core: Per-Holding Shock Calculation
// ============================================================

export function calculateHoldingShock(
  holding: Holding,
  scenario: ScenarioDefinition,
  goalDate: string | null,
  today: Date = new Date(),
): HoldingShockResult {
  const { equityShock, sectorShocks, interestRateChangeBps, currencyShocks, liquidityRestrictionMultiplier } = scenario;
  const value = holding.valueInPortfolioCurrency;

  // Step 1: Equity + sector compounded shock
  let baseShock = 0;
  if (holding.assetClass === 'equity') {
    baseShock = equityShock;
  }
  const sectorShock = (holding.sector ? sectorShocks[holding.sector.toLowerCase()] : 0) ?? 0;
  const combinedEquitySectorShock = (1 + baseShock) * (1 + sectorShock) - 1;

  // Step 2: Rate shock for fixed-income
  let rateImpact = 0;
  if (holding.assetClass === 'fixed_income' && holding.rateShockSensitivity !== undefined) {
    rateImpact = holding.rateShockSensitivity * (interestRateChangeBps / 10_000);
    // rateShockSensitivity is already negative for duration (price falls when rates rise)
  }

  // Step 3: Currency shock
  const currencyImpact = currencyShocks[holding.currency.toUpperCase()] ?? 0;

  // Step 4: Total impact
  const totalShock = combinedEquitySectorShock + rateImpact + currencyImpact;
  // Clamp to -1 (can't lose more than you have)
  const clampedShock = Math.max(-1, totalShock);

  const shockedValue = Math.max(0, value * (1 + clampedShock));
  const loss = value - shockedValue;
  const lossPercent = value > 0 ? (loss / value) * 100 : 0;

  // Step 5: Liquidity
  const baseDays = liquidityDaysFromPeriod(holding.liquidityPeriod);
  const effectiveDays = Math.ceil(baseDays * liquidityRestrictionMultiplier);
  const todayStr = today.toISOString().slice(0, 10);
  const daysToGoal = goalDate ? daysBetween(todayStr, goalDate) : 0;
  const isLiquidByGoalDate = goalDate ? effectiveDays <= daysToGoal : holding.liquidityPeriod !== 'illiquid';

  const haircut = holding.liquidationHaircut ?? 0;
  const liquidValueByGoalDate = isLiquidByGoalDate ? shockedValue * (1 - haircut) : 0;

  return {
    holdingId: holding.id,
    holdingName: holding.name,
    originalValue: value,
    shockedValue,
    loss,
    lossPercent,
    appliedShockPercent: clampedShock * 100,
    isLiquidByGoalDate,
    liquidValueByGoalDate,
  };
}

// ============================================================
// Core: Full Portfolio Scenario Calculation
// ============================================================

export function calculateScenario(
  holdings: Holding[],
  goal: FinancialGoal | null,
  scenario: ScenarioDefinition,
  today: Date = new Date(),
): ScenarioResult {
  const goalDate = goal?.targetDate ?? null;

  const holdingResults = holdings.map(h =>
    calculateHoldingShock(h, scenario, goalDate, today),
  );

  const originalPortfolioValue = holdingResults.reduce((s, r) => s + r.originalValue, 0);
  const shockedPortfolioValue = holdingResults.reduce((s, r) => s + r.shockedValue, 0);
  const scenarioLoss = originalPortfolioValue - shockedPortfolioValue;
  const scenarioLossPercent = originalPortfolioValue > 0
    ? (scenarioLoss / originalPortfolioValue) * 100
    : 0;

  // Accessible value: sum of liquid holdings' liquid value
  const accessibleValue = holdingResults.reduce((s, r) => s + r.liquidValueByGoalDate, 0);

  // Contributions: monthly * months to goal date (nominal, no discounting)
  let totalContributions = 0;
  if (goal?.monthlyContribution && goal.targetDate) {
    const todayStr = today.toISOString().slice(0, 10);
    const months = daysBetween(todayStr, goal.targetDate) / 30.44;
    totalContributions = Math.max(0, goal.monthlyContribution * months);
  }

  // Reserved cash: counted once toward accessible value if not already in holdings
  // To prevent double-counting, reserved cash is treated as supplementary
  // (it is assumed NOT already included in holdings' valueInPortfolioCurrency)
  const reservedCash = goal?.reservedCash ?? 0;

  // Goal surplus/shortfall
  let goalSurplus = 0;
  let goalFundingStatus: ScenarioResult['goalFundingStatus'] = 'EXACTLY_MET';
  if (goal) {
    const totalAccessible = accessibleValue + totalContributions + reservedCash;
    goalSurplus = totalAccessible - goal.targetAmount;
    if (goalSurplus > 0.01) goalFundingStatus = 'SURPLUS';
    else if (goalSurplus < -0.01) goalFundingStatus = 'SHORTFALL';
    else goalFundingStatus = 'EXACTLY_MET';
  }

  return {
    originalPortfolioValue,
    shockedPortfolioValue,
    scenarioLoss,
    scenarioLossPercent,
    holdingResults,
    goalSurplus,
    accessibleValue,
    totalContributions,
    goalFundingStatus,
    assumptions: STANDARD_ASSUMPTIONS,
    disclaimer: DISCLAIMER,
  };
}

// ============================================================
// Reverse Stress Test — Breaking Point Engine
// ============================================================

/**
 * Builds a ScenarioDefinition scaled by a shock multiplier.
 * multiplier = 0 → no shock; multiplier = 1 → full shock as defined.
 * For the equity-shock family, the multiplier scales equityShock and sectorShocks.
 */
export function scaleScenario(
  baseScenario: ScenarioDefinition,
  multiplier: number,
): ScenarioDefinition {
  const scaledSectorShocks: Record<string, number> = {};
  for (const [k, v] of Object.entries(baseScenario.sectorShocks)) {
    scaledSectorShocks[k] = v * multiplier;
  }
  const scaledCurrencyShocks: Record<string, number> = {};
  for (const [k, v] of Object.entries(baseScenario.currencyShocks)) {
    scaledCurrencyShocks[k] = v * multiplier;
  }
  return {
    ...baseScenario,
    equityShock: baseScenario.equityShock * multiplier,
    sectorShocks: scaledSectorShocks,
    interestRateChangeBps: baseScenario.interestRateChangeBps * multiplier,
    currencyShocks: scaledCurrencyShocks,
    liquidityRestrictionMultiplier:
      1 + (baseScenario.liquidityRestrictionMultiplier - 1) * multiplier,
  };
}

/** Evaluate whether a threshold is breached at a given shock level */
function evaluateThresholds(
  result: ScenarioResult,
  goal: FinancialGoal | null,
  failureConditions: FailureCondition[],
  minPortfolioValueThreshold: number,
  liquidityThreshold: number,
): { breached: boolean; condition: FailureCondition | null } {
  for (const condition of failureConditions) {
    if (condition === 'GOAL_SHORTFALL' && goal) {
      if (result.goalSurplus < 0) return { breached: true, condition };
    }
    if (condition === 'INSUFFICIENT_LIQUIDITY') {
      if (result.accessibleValue < liquidityThreshold) return { breached: true, condition };
    }
    if (condition === 'MIN_PORTFOLIO_VALUE') {
      if (result.shockedPortfolioValue < minPortfolioValueThreshold) return { breached: true, condition };
    }
  }
  return { breached: false, condition: null };
}

export interface BreakingPointInput {
  holdings: Holding[];
  goal: FinancialGoal | null;
  baseScenario: ScenarioDefinition;
  minShockMultiplier?: number;  // 0 to 1 range of the baseScenario
  maxShockMultiplier?: number;
  failureConditions: FailureCondition[];
  minPortfolioValueThreshold?: number;
  liquidityThreshold?: number;
  tolerance?: number;           // stopping criterion (fraction of shock range)
  maxIterations?: number;
  today?: Date;
}

export function findBreakingPoint(input: BreakingPointInput): BreakingPointResult {
  const {
    holdings,
    goal,
    baseScenario,
    minShockMultiplier = 0,
    maxShockMultiplier = 1,
    failureConditions,
    minPortfolioValueThreshold = 0,
    liquidityThreshold = 0,
    tolerance = 0.001,
    maxIterations = 60,
    today = new Date(),
  } = input;

  const diagnostics: string[] = [];

  // Step 1: Baseline check (no shock)
  const baselineScenario = scaleScenario(baseScenario, minShockMultiplier);
  const baselineResult = calculateScenario(holdings, goal, baselineScenario, today);
  const baselineCheck = evaluateThresholds(
    baselineResult, goal, failureConditions, minPortfolioValueThreshold, liquidityThreshold,
  );

  if (baselineCheck.breached) {
    diagnostics.push(`Already breached at shock multiplier=${minShockMultiplier} (baseline). Condition: ${baselineCheck.condition}`);
    return {
      status: 'ALREADY_BREACHED',
      firstBreachedCondition: baselineCheck.condition ?? undefined,
      portfolioValueAtBreak: baselineResult.shockedPortfolioValue,
      goalSurplusAtBreak: baselineResult.goalSurplus,
      liquidValueAtBreak: baselineResult.accessibleValue,
      topContributors: baselineResult.holdingResults
        .sort((a, b) => b.loss - a.loss)
        .slice(0, 5),
      searchBounds: { min: minShockMultiplier, max: maxShockMultiplier },
      tolerance,
      iterationsUsed: 1,
      isMonotonic: true,
      assumptions: STANDARD_ASSUMPTIONS,
      diagnostics,
      disclaimer: DISCLAIMER,
    };
  }

  // Step 2: Check whether max shock breaches
  const maxScenario = scaleScenario(baseScenario, maxShockMultiplier);
  const maxResult = calculateScenario(holdings, goal, maxScenario, today);
  const maxCheck = evaluateThresholds(
    maxResult, goal, failureConditions, minPortfolioValueThreshold, liquidityThreshold,
  );

  if (!maxCheck.breached) {
    diagnostics.push(`No breach found at maximum shock multiplier=${maxShockMultiplier}.`);
    return {
      status: 'NOT_BREACHED_WITHIN_RANGE',
      portfolioValueAtBreak: maxResult.shockedPortfolioValue,
      goalSurplusAtBreak: maxResult.goalSurplus,
      liquidValueAtBreak: maxResult.accessibleValue,
      topContributors: maxResult.holdingResults
        .sort((a, b) => b.loss - a.loss)
        .slice(0, 5),
      searchBounds: { min: minShockMultiplier, max: maxShockMultiplier },
      tolerance,
      iterationsUsed: 2,
      isMonotonic: true,
      assumptions: STANDARD_ASSUMPTIONS,
      diagnostics,
      disclaimer: DISCLAIMER,
    };
  }

  // Step 3: Verify approximate monotonicity with 10-point scan
  const SCAN_POINTS = 10;
  const step = (maxShockMultiplier - minShockMultiplier) / SCAN_POINTS;
  let prevBreached = false;
  let isMonotonic = true;
  let nonMonotonicPoints: string[] = [];

  for (let i = 0; i <= SCAN_POINTS; i++) {
    const m = minShockMultiplier + i * step;
    const s = scaleScenario(baseScenario, m);
    const r = calculateScenario(holdings, goal, s, today);
    const c = evaluateThresholds(r, goal, failureConditions, minPortfolioValueThreshold, liquidityThreshold);
    if (i > 0 && !prevBreached && c.breached) {
      // first crossing found — this is expected for monotonic
    }
    if (i > 0 && prevBreached && !c.breached) {
      isMonotonic = false;
      nonMonotonicPoints.push(`multiplier=${m.toFixed(3)}`);
    }
    prevBreached = c.breached;
  }

  if (!isMonotonic) {
    diagnostics.push(`Non-monotonic behavior detected at: ${nonMonotonicPoints.join(', ')}. Using bounded scan result.`);
  }

  // Step 4: Binary search for the crossing point
  let lo = minShockMultiplier;
  let hi = maxShockMultiplier;
  let iterations = 2 + SCAN_POINTS + 1;
  let finalResult: ScenarioResult = maxResult;
  let finalCondition: FailureCondition | null = maxCheck.condition;

  while (hi - lo > tolerance && iterations < maxIterations) {
    const mid = (lo + hi) / 2;
    const midScenario = scaleScenario(baseScenario, mid);
    const midResult = calculateScenario(holdings, goal, midScenario, today);
    const midCheck = evaluateThresholds(
      midResult, goal, failureConditions, minPortfolioValueThreshold, liquidityThreshold,
    );
    if (midCheck.breached) {
      hi = mid;
      finalResult = midResult;
      finalCondition = midCheck.condition;
    } else {
      lo = mid;
    }
    iterations++;
  }

  // The breaking point shock is hi (first confirmed breach)
  // Convert multiplier back to actual shock value for the equity shock family
  const breakingPointShock = baseScenario.equityShock * hi;
  diagnostics.push(`Binary search converged after ${iterations} iterations. Multiplier=${hi.toFixed(4)}`);

  return {
    status: 'BREAKING_POINT_FOUND',
    breakingPointShock,
    firstBreachedCondition: finalCondition ?? undefined,
    portfolioValueAtBreak: finalResult.shockedPortfolioValue,
    goalSurplusAtBreak: finalResult.goalSurplus,
    liquidValueAtBreak: finalResult.accessibleValue,
    topContributors: finalResult.holdingResults
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 5),
    searchBounds: { min: minShockMultiplier, max: maxShockMultiplier },
    tolerance,
    iterationsUsed: iterations,
    isMonotonic,
    assumptions: STANDARD_ASSUMPTIONS,
    diagnostics,
    disclaimer: DISCLAIMER,
  };
}

// ============================================================
// Exposure / X-Ray Analysis
// ============================================================

const CONCENTRATION_THRESHOLDS = {
  none: 0.20,
  moderate: 0.35,
  high: 0.50,
  critical: 0.70,
};

function warningLevel(pct: number): ExposureCluster['warningLevel'] {
  if (pct >= CONCENTRATION_THRESHOLDS.critical) return 'critical';
  if (pct >= CONCENTRATION_THRESHOLDS.high) return 'high';
  if (pct >= CONCENTRATION_THRESHOLDS.moderate) return 'moderate';
  return 'none';
}

export function calculateExposure(holdings: Holding[]): ExposureResult {
  if (holdings.length === 0) {
    return {
      portfolioId: '',
      totalPortfolioValue: 0,
      clusters: [],
      largestCluster: {
        dimension: 'asset_class',
        label: 'No holdings',
        totalValue: 0,
        portfolioPercent: 0,
        holdingIds: [],
        holdingNames: [],
        warningLevel: 'none',
      },
      concentrationWarnings: [],
    };
  }

  const totalValue = holdings.reduce((s, h) => s + h.valueInPortfolioCurrency, 0);
  const clusters: ExposureCluster[] = [];

  const buildClusters = (
    dimension: ExposureCluster['dimension'],
    getKey: (h: Holding) => string | undefined,
  ): void => {
    const groups: Map<string, Holding[]> = new Map();
    for (const h of holdings) {
      const key = getKey(h) ?? 'Other';
      const arr = groups.get(key) ?? [];
      arr.push(h);
      groups.set(key, arr);
    }
    for (const [label, group] of groups) {
      const tv = group.reduce((s, h) => s + h.valueInPortfolioCurrency, 0);
      const pct = totalValue > 0 ? tv / totalValue : 0;
      clusters.push({
        dimension,
        label,
        totalValue: tv,
        portfolioPercent: pct,
        holdingIds: group.map(h => h.id),
        holdingNames: group.map(h => h.name),
        warningLevel: warningLevel(pct),
      });
    }
  };

  buildClusters('asset_class', h => h.assetClass);
  buildClusters('sector', h => h.sector);
  buildClusters('currency', h => h.currency);
  buildClusters('geography', h => h.geography);

  // Tag-based exposure
  const tagGroups: Map<string, Holding[]> = new Map();
  for (const h of holdings) {
    for (const tag of h.exposureTags ?? []) {
      const arr = tagGroups.get(tag) ?? [];
      arr.push(h);
      tagGroups.set(tag, arr);
    }
  }
  for (const [tag, group] of tagGroups) {
    const tv = group.reduce((s, h) => s + h.valueInPortfolioCurrency, 0);
    const pct = totalValue > 0 ? tv / totalValue : 0;
    if (pct >= 0.10) {  // Only show tags with ≥10% overlap
      clusters.push({
        dimension: 'tag',
        label: `#${tag}`,
        totalValue: tv,
        portfolioPercent: pct,
        holdingIds: group.map(h => h.id),
        holdingNames: group.map(h => h.name),
        warningLevel: warningLevel(pct),
      });
    }
  }

  const sorted = [...clusters].sort((a, b) => b.portfolioPercent - a.portfolioPercent);
  const largest = sorted[0] ?? clusters[0];

  const warnings: string[] = [];
  for (const c of clusters) {
    if (c.warningLevel === 'critical') {
      warnings.push(`CRITICAL: ${c.label} (${c.dimension}) represents ${(c.portfolioPercent * 100).toFixed(1)}% of portfolio value.`);
    } else if (c.warningLevel === 'high') {
      warnings.push(`HIGH: ${c.label} (${c.dimension}) represents ${(c.portfolioPercent * 100).toFixed(1)}% of portfolio value.`);
    }
  }

  return {
    portfolioId: holdings[0]?.portfolioId ?? '',
    totalPortfolioValue: totalValue,
    clusters: sorted,
    largestCluster: largest,
    concentrationWarnings: warnings,
  };
}

// ============================================================
// Liquidity Summary (without scenario)
// ============================================================

export function calculateLiquidityProfile(
  holdings: Holding[],
  goal: FinancialGoal | null,
  today: Date = new Date(),
): {
  totalValue: number;
  liquidByGoalDate: number;
  illiquid: number;
  liquidPercent: number;
  breakdown: {
    period: Holding['liquidityPeriod'];
    totalValue: number;
    isAccessibleByGoal: boolean;
  }[];
} {
  const goalDate = goal?.targetDate ?? null;
  const todayStr = today.toISOString().slice(0, 10);
  const daysToGoal = goalDate ? daysBetween(todayStr, goalDate) : Infinity;

  let totalValue = 0;
  let liquidByGoalDate = 0;

  const periodMap: Map<Holding['liquidityPeriod'], { total: number; accessible: boolean }> = new Map();

  for (const h of holdings) {
    const v = h.valueInPortfolioCurrency;
    totalValue += v;
    const days = liquidityDaysFromPeriod(h.liquidityPeriod);
    const accessible = days <= daysToGoal;
    if (accessible) {
      const haircut = h.liquidationHaircut ?? 0;
      liquidByGoalDate += v * (1 - haircut);
    }
    const existing = periodMap.get(h.liquidityPeriod) ?? { total: 0, accessible };
    periodMap.set(h.liquidityPeriod, { total: existing.total + v, accessible });
  }

  const breakdown = Array.from(periodMap.entries()).map(([period, data]) => ({
    period,
    totalValue: data.total,
    isAccessibleByGoal: data.accessible,
  }));

  return {
    totalValue,
    liquidByGoalDate,
    illiquid: totalValue - liquidByGoalDate,
    liquidPercent: totalValue > 0 ? (liquidByGoalDate / totalValue) * 100 : 0,
    breakdown,
  };
}

// ============================================================
// Alternative Allocation Comparison
// ============================================================

/**
 * Simulates scenario results for a hypothetical allocation by scaling
 * the actual portfolio's total value across the given weight structure.
 * This is explicitly an approximation — individual security selection
 * is not modeled. Returns labeled approximations clearly.
 */
export function compareAllocation(
  portfolioTotalValue: number,
  alternative: AllocationAlternative,
  goal: FinancialGoal | null,
  scenario: ScenarioDefinition,
  today: Date = new Date(),
): ScenarioResult {
  // Create synthetic holdings from allocation weights
  const syntheticHoldings: Holding[] = alternative.weights.map((w, i) => ({
    id: `synthetic-${alternative.id}-${i}`,
    portfolioId: `synthetic-${alternative.id}`,
    name: w.label,
    assetClass: w.assetClass,
    sector: w.sector,
    geography: undefined,
    currency: 'USD',
    currentValue: portfolioTotalValue * w.weight,
    valueInPortfolioCurrency: portfolioTotalValue * w.weight,
    exchangeRateUsed: 1,
    liquidityPeriod: w.liquidityPeriod,
    liquidationHaircut: 0,
    exposureTags: [],
    createdAt: today,
    updatedAt: today,
  }));

  return calculateScenario(syntheticHoldings, goal, scenario, today);
}
