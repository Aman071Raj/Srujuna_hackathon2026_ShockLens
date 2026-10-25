// ============================================================
// ShockLens — Shared Domain Types
// ============================================================

// ---- Asset Classification ----
export type AssetClass =
  | 'equity'
  | 'fixed_income'
  | 'real_estate'
  | 'commodity'
  | 'cash'
  | 'crypto'
  | 'alternative'
  | 'other';

export type LiquidityPeriod =
  | 'immediate'    // T+0 or same day
  | 'short'        // T+1 to T+5 (within 1 week)
  | 'medium'       // 1 week – 3 months
  | 'long'         // 3 months – 1 year
  | 'illiquid';    // > 1 year or locked

// ---- Core Domain Models ----

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  holdings: Holding[];
}

export interface Holding {
  id: string;
  portfolioId: string;
  name: string;
  ticker?: string;
  assetClass: AssetClass;
  sector?: string;
  geography?: string;
  currency: string;
  currentValue: number;     // In holding's native currency
  valueInPortfolioCurrency: number;  // Converted to portfolio base currency
  exchangeRateUsed?: number;        // rate applied (portfolioCurrency / holdingCurrency)
  liquidityPeriod: LiquidityPeriod;
  liquidationHaircut?: number;      // 0–1 fraction of value lost on forced sale
  durationYears?: number;           // For fixed-income rate sensitivity
  rateShockSensitivity?: number;    // ΔPrice / ΔRate (modified duration × value, negative)
  exposureTags?: string[];          // e.g. ["tech", "AI", "semiconductor"]
  historicalValues?: { date: string; value: number }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialGoal {
  id: string;
  userId: string;
  portfolioId?: string;
  name: string;
  goalType: GoalType;
  targetAmount: number;
  targetDate: string;           // ISO date string YYYY-MM-DD
  reservedCash: number;         // Cash already set aside for this goal
  requiredLiquidAmount: number; // Portion of target that must be accessible
  acceptableShortfall: number;  // Max tolerable shortfall (absolute)
  monthlyContribution?: number; // Optional future contributions
  flexibleDate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type GoalType =
  | 'home_down_payment'
  | 'higher_education'
  | 'retirement_withdrawal'
  | 'emergency_reserve'
  | 'custom';

// ---- Scenario Types ----

export interface ScenarioDefinition {
  name: string;
  description: string;
  equityShock: number;               // -1 to 0 (e.g. -0.30 = 30% decline)
  sectorShocks: Record<string, number>; // sector → shock fraction
  interestRateChangeBps: number;     // basis points change
  currencyShocks: Record<string, number>; // currency → shock fraction vs portfolio base
  liquidityRestrictionMultiplier: number; // 1 = no change, >1 = harder to liquidate
  customNotes?: string;
}

export const SCENARIO_PRESETS: Record<string, ScenarioDefinition> = {
  equity_decline: {
    name: 'Broad Equity Market Decline',
    description: 'A broad market selloff affecting most equity holdings.',
    equityShock: -0.30,
    sectorShocks: {},
    interestRateChangeBps: -50,  // flight to bonds
    currencyShocks: {},
    liquidityRestrictionMultiplier: 1.5,
  },
  tech_disruption: {
    name: 'Technology Sector Disruption',
    description: 'A sharp correction concentrated in technology stocks.',
    equityShock: -0.10,
    sectorShocks: { technology: -0.45, communication_services: -0.25 },
    interestRateChangeBps: 0,
    currencyShocks: {},
    liquidityRestrictionMultiplier: 1.2,
  },
  rate_increase: {
    name: 'Interest Rate Increase',
    description: 'A significant rise in interest rates affecting bonds and rate-sensitive equities.',
    equityShock: -0.08,
    sectorShocks: { real_estate: -0.20, utilities: -0.15 },
    interestRateChangeBps: 200,
    currencyShocks: {},
    liquidityRestrictionMultiplier: 1.0,
  },
  currency_depreciation: {
    name: 'Currency Depreciation',
    description: 'A significant weakening of foreign currencies relative to portfolio base.',
    equityShock: 0,
    sectorShocks: {},
    interestRateChangeBps: 0,
    currencyShocks: { USD: -0.15, EUR: -0.12, GBP: -0.18 },
    liquidityRestrictionMultiplier: 1.0,
  },
  combined_shock: {
    name: 'Combined Market and Liquidity Shock',
    description: 'A severe combined shock with equity decline, rate spike, and liquidity constraints.',
    equityShock: -0.40,
    sectorShocks: { technology: -0.55, financials: -0.35, real_estate: -0.30 },
    interestRateChangeBps: 150,
    currencyShocks: {},
    liquidityRestrictionMultiplier: 3.0,
  },
  custom: {
    name: 'Custom Scenario',
    description: 'User-defined shock parameters.',
    equityShock: 0,
    sectorShocks: {},
    interestRateChangeBps: 0,
    currencyShocks: {},
    liquidityRestrictionMultiplier: 1.0,
  },
};

// ---- Calculation Result Types ----

export interface HoldingShockResult {
  holdingId: string;
  holdingName: string;
  originalValue: number;
  shockedValue: number;
  loss: number;
  lossPercent: number;
  appliedShockPercent: number;
  isLiquidByGoalDate: boolean;
  liquidValueByGoalDate: number;
}

export interface ScenarioResult {
  originalPortfolioValue: number;
  shockedPortfolioValue: number;
  scenarioLoss: number;
  scenarioLossPercent: number;
  holdingResults: HoldingShockResult[];
  goalSurplus: number;         // positive = surplus, negative = shortfall
  accessibleValue: number;     // sum of liquid holdings after shock
  totalContributions: number;  // estimated contributions to goal date
  goalFundingStatus: 'SURPLUS' | 'SHORTFALL' | 'EXACTLY_MET';
  assumptions: CalculationAssumptions;
  disclaimer: string;
}

export interface CalculationAssumptions {
  shockCombinationRule: string;
  currencyRateSource: string;
  liquidityModel: string;
  contributionAssumption: string;
  inflationAssumption: string;
  rateShockModel: string;
  missingDataHandling: string;
}

// ---- Breaking Point Types ----

export type BreakingPointStatus =
  | 'BREAKING_POINT_FOUND'
  | 'ALREADY_BREACHED'
  | 'NOT_BREACHED_WITHIN_RANGE'
  | 'INDETERMINATE';

export type FailureCondition =
  | 'GOAL_SHORTFALL'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'MIN_PORTFOLIO_VALUE';

export interface BreakingPointResult {
  status: BreakingPointStatus;
  breakingPointShock?: number;         // fraction e.g. -0.35
  firstBreachedCondition?: FailureCondition;
  portfolioValueAtBreak?: number;
  goalSurplusAtBreak?: number;
  liquidValueAtBreak?: number;
  topContributors: HoldingShockResult[];
  searchBounds: { min: number; max: number };
  tolerance: number;
  iterationsUsed: number;
  isMonotonic: boolean;
  assumptions: CalculationAssumptions;
  diagnostics: string[];
  disclaimer: string;
}

// ---- Exposure / X-Ray Types ----

export interface ExposureCluster {
  dimension: 'sector' | 'asset_class' | 'currency' | 'geography' | 'tag';
  label: string;
  totalValue: number;
  portfolioPercent: number;
  holdingIds: string[];
  holdingNames: string[];
  warningLevel: 'none' | 'moderate' | 'high' | 'critical';
}

export interface ExposureResult {
  portfolioId: string;
  totalPortfolioValue: number;
  clusters: ExposureCluster[];
  largestCluster: ExposureCluster;
  concentrationWarnings: string[];
}

// ---- Compare Allocations Types ----

export interface AllocationAlternative {
  id: string;
  name: string;
  description: string;
  weights: AllocationWeight[];
}

export interface AllocationWeight {
  label: string;
  assetClass: AssetClass;
  sector?: string;
  liquidityPeriod: LiquidityPeriod;
  weight: number;  // 0–1, must sum to 1
}

export interface AllocationComparisonResult {
  scenario: ScenarioDefinition;
  results: {
    allocationId: string;
    allocationName: string;
    valueAfterShock: number;
    goalSurplusOrShortfall: number;
    accessibleLiquidity: number;
    largestCluster: ExposureCluster | null;
    breakingPoint: BreakingPointResult | null;
  }[];
  disclaimer: string;
}
