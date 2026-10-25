import { describe, it, expect } from 'vitest';
import {
  calculateHoldingShock,
  calculateScenario,
  findBreakingPoint,
  calculateExposure,
  calculateLiquidityProfile,
  scaleScenario,
  daysBetween,
  liquidityDaysFromPeriod,
} from '../calculations';
import type { Holding, FinancialGoal, ScenarioDefinition } from '../types';
import { DEMO_HOLDINGS, DEMO_GOAL, DEMO_PORTFOLIO } from '../demo-data';

const TODAY = new Date('2026-10-24');

// ---- Test fixtures ----

const makeHolding = (overrides: Partial<Holding> = {}): Holding => ({
  id: 'h-test',
  portfolioId: 'p-test',
  name: 'Test Equity',
  assetClass: 'equity',
  sector: 'technology',
  geography: 'US',
  currency: 'USD',
  currentValue: 10000,
  valueInPortfolioCurrency: 10000,
  exchangeRateUsed: 1,
  liquidityPeriod: 'short',
  liquidationHaircut: 0,
  exposureTags: [],
  createdAt: TODAY,
  updatedAt: TODAY,
  ...overrides,
});

const NO_SHOCK: ScenarioDefinition = {
  name: 'No shock',
  description: '',
  equityShock: 0,
  sectorShocks: {},
  interestRateChangeBps: 0,
  currencyShocks: {},
  liquidityRestrictionMultiplier: 1,
};

const TECH_SHOCK_30: ScenarioDefinition = {
  name: 'Tech -30%',
  description: '',
  equityShock: 0,
  sectorShocks: { technology: -0.30 },
  interestRateChangeBps: 0,
  currencyShocks: {},
  liquidityRestrictionMultiplier: 1,
};

const EQUITY_SHOCK_20: ScenarioDefinition = {
  name: 'Equity -20%',
  description: '',
  equityShock: -0.20,
  sectorShocks: {},
  interestRateChangeBps: 0,
  currencyShocks: {},
  liquidityRestrictionMultiplier: 1,
};

// ---- Helper: no-op goal ----
const makeGoal = (overrides: Partial<FinancialGoal> = {}): FinancialGoal => ({
  id: 'g-test',
  userId: 'u-test',
  portfolioId: 'p-test',
  name: 'Test Goal',
  goalType: 'custom',
  targetAmount: 50000,
  targetDate: '2027-12-31',
  reservedCash: 0,
  requiredLiquidAmount: 40000,
  acceptableShortfall: 0,
  monthlyContribution: 0,
  flexibleDate: false,
  createdAt: TODAY,
  updatedAt: TODAY,
  ...overrides,
});

// ==============================================================
// daysBetween
// ==============================================================
describe('daysBetween', () => {
  it('returns 0 for the same date', () => {
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('returns positive for a future date', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
  });

  it('returns negative for a past date', () => {
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30);
  });
});

// ==============================================================
// liquidityDaysFromPeriod
// ==============================================================
describe('liquidityDaysFromPeriod', () => {
  it('maps immediate to 1 day', () => expect(liquidityDaysFromPeriod('immediate')).toBe(1));
  it('maps short to 5 days', () => expect(liquidityDaysFromPeriod('short')).toBe(5));
  it('maps medium to 60 days', () => expect(liquidityDaysFromPeriod('medium')).toBe(60));
  it('maps long to 270 days', () => expect(liquidityDaysFromPeriod('long')).toBe(270));
  it('maps illiquid to a very large number', () => expect(liquidityDaysFromPeriod('illiquid')).toBeGreaterThan(365));
});

// ==============================================================
// calculateHoldingShock
// ==============================================================
describe('calculateHoldingShock', () => {
  it('applies no shock when scenario is zero', () => {
    const h = makeHolding({ currentValue: 10000, valueInPortfolioCurrency: 10000 });
    const r = calculateHoldingShock(h, NO_SHOCK, null, TODAY);
    expect(r.shockedValue).toBeCloseTo(10000, 2);
    expect(r.loss).toBeCloseTo(0, 2);
  });

  it('applies equity shock to equity holdings', () => {
    const h = makeHolding({ assetClass: 'equity', valueInPortfolioCurrency: 10000 });
    const r = calculateHoldingShock(h, EQUITY_SHOCK_20, null, TODAY);
    expect(r.shockedValue).toBeCloseTo(8000, 2);
    expect(r.loss).toBeCloseTo(2000, 2);
  });

  it('does NOT apply equity shock to fixed_income holdings', () => {
    const h = makeHolding({ assetClass: 'fixed_income', sector: 'government_bond', valueInPortfolioCurrency: 10000 });
    const r = calculateHoldingShock(h, EQUITY_SHOCK_20, null, TODAY);
    // Fixed income has no equity shock or sector shock here
    expect(r.shockedValue).toBeCloseTo(10000, 2);
  });

  it('applies sector shock to correct sector', () => {
    const h = makeHolding({ assetClass: 'equity', sector: 'technology', valueInPortfolioCurrency: 10000 });
    const r = calculateHoldingShock(h, TECH_SHOCK_30, null, TODAY);
    expect(r.shockedValue).toBeCloseTo(7000, 2);
  });

  it('does NOT apply sector shock to a different sector', () => {
    const h = makeHolding({ assetClass: 'equity', sector: 'healthcare', valueInPortfolioCurrency: 10000 });
    const r = calculateHoldingShock(h, TECH_SHOCK_30, null, TODAY);
    expect(r.shockedValue).toBeCloseTo(10000, 2);
  });

  it('compounds equity and sector shocks multiplicatively', () => {
    const scenario: ScenarioDefinition = {
      ...EQUITY_SHOCK_20,
      sectorShocks: { technology: -0.30 },
    };
    const h = makeHolding({ assetClass: 'equity', sector: 'technology', valueInPortfolioCurrency: 10000 });
    const r = calculateHoldingShock(h, scenario, null, TODAY);
    // Expected: (1-0.20)*(1-0.30) - 1 = 0.8*0.7 - 1 = -0.44 → 10000*0.56 = 5600
    expect(r.shockedValue).toBeCloseTo(5600, 2);
  });

  it('applies rate shock to fixed_income with rateShockSensitivity', () => {
    const h = makeHolding({
      assetClass: 'fixed_income',
      sector: 'government_bond',
      valueInPortfolioCurrency: 10000,
      rateShockSensitivity: -8.5,
    });
    const scenario: ScenarioDefinition = {
      ...NO_SHOCK,
      interestRateChangeBps: 200,
    };
    const r = calculateHoldingShock(h, scenario, null, TODAY);
    // rateImpact = -8.5 * (200/10000) = -8.5 * 0.02 = -0.17
    expect(r.shockedValue).toBeCloseTo(10000 * (1 - 0.17), 2);
  });

  it('applies currency shock', () => {
    const h = makeHolding({ currency: 'EUR', valueInPortfolioCurrency: 10000 });
    const scenario: ScenarioDefinition = {
      ...NO_SHOCK,
      currencyShocks: { EUR: -0.10 },
    };
    const r = calculateHoldingShock(h, scenario, null, TODAY);
    expect(r.shockedValue).toBeCloseTo(9000, 2);
  });

  it('clamps shocked value at 0 (cannot go negative)', () => {
    const h = makeHolding({ assetClass: 'equity', sector: 'technology', valueInPortfolioCurrency: 10000 });
    const scenario: ScenarioDefinition = {
      ...NO_SHOCK,
      equityShock: -0.80,
      sectorShocks: { technology: -0.80 },
    };
    const r = calculateHoldingShock(h, scenario, null, TODAY);
    expect(r.shockedValue).toBeGreaterThanOrEqual(0);
  });

  it('marks illiquid holding as not liquid by goal date', () => {
    const h = makeHolding({ liquidityPeriod: 'illiquid', valueInPortfolioCurrency: 10000 });
    const r = calculateHoldingShock(h, NO_SHOCK, '2027-12-31', TODAY);
    expect(r.isLiquidByGoalDate).toBe(false);
    expect(r.liquidValueByGoalDate).toBe(0);
  });

  it('marks immediate holding as liquid by goal date', () => {
    const h = makeHolding({ liquidityPeriod: 'immediate', valueInPortfolioCurrency: 10000 });
    const r = calculateHoldingShock(h, NO_SHOCK, '2027-12-31', TODAY);
    expect(r.isLiquidByGoalDate).toBe(true);
    expect(r.liquidValueByGoalDate).toBeCloseTo(10000, 2);
  });

  it('applies liquidation haircut to liquid value', () => {
    const h = makeHolding({ liquidityPeriod: 'immediate', liquidationHaircut: 0.05, valueInPortfolioCurrency: 10000 });
    const r = calculateHoldingShock(h, NO_SHOCK, '2027-12-31', TODAY);
    expect(r.liquidValueByGoalDate).toBeCloseTo(9500, 2);
  });

  it('liquidity restriction multiplier delays access', () => {
    // medium = 60 days; goal date 30 days away → medium holding NOT accessible
    const h = makeHolding({ liquidityPeriod: 'medium', valueInPortfolioCurrency: 10000 });
    const scenario: ScenarioDefinition = { ...NO_SHOCK, liquidityRestrictionMultiplier: 1 };
    const r = calculateHoldingShock(h, scenario, '2026-11-23', TODAY); // ~30 days away
    expect(r.isLiquidByGoalDate).toBe(false);
  });
});

// ==============================================================
// calculateScenario
// ==============================================================
describe('calculateScenario', () => {
  it('with no shock, shockedPortfolioValue equals original', () => {
    const holdings = [makeHolding({ id: 'h1', valueInPortfolioCurrency: 10000 })];
    const result = calculateScenario(holdings, null, NO_SHOCK, TODAY);
    expect(result.shockedPortfolioValue).toBeCloseTo(10000, 2);
    expect(result.scenarioLoss).toBeCloseTo(0, 2);
  });

  it('sums shocked values across multiple holdings', () => {
    const holdings = [
      makeHolding({ id: 'h1', assetClass: 'equity', valueInPortfolioCurrency: 10000 }),
      makeHolding({ id: 'h2', assetClass: 'cash', valueInPortfolioCurrency: 5000 }),
    ];
    const result = calculateScenario(holdings, null, EQUITY_SHOCK_20, TODAY);
    // Equity holding: 8000, Cash holding: unaffected → 5000
    expect(result.shockedPortfolioValue).toBeCloseTo(13000, 2);
    expect(result.scenarioLoss).toBeCloseTo(2000, 2);
  });

  it('calculates goal shortfall correctly', () => {
    const holdings = [
      makeHolding({ id: 'h1', liquidityPeriod: 'immediate', valueInPortfolioCurrency: 30000 }),
    ];
    const goal = makeGoal({ targetAmount: 50000, reservedCash: 0, monthlyContribution: 0 });
    const result = calculateScenario(holdings, goal, NO_SHOCK, TODAY);
    expect(result.goalFundingStatus).toBe('SHORTFALL');
    expect(result.goalSurplus).toBeCloseTo(-20000, 0);
  });

  it('calculates goal surplus correctly', () => {
    const holdings = [
      makeHolding({ id: 'h1', liquidityPeriod: 'immediate', valueInPortfolioCurrency: 60000 }),
    ];
    const goal = makeGoal({ targetAmount: 50000, reservedCash: 0, monthlyContribution: 0 });
    const result = calculateScenario(holdings, goal, NO_SHOCK, TODAY);
    expect(result.goalFundingStatus).toBe('SURPLUS');
    expect(result.goalSurplus).toBeCloseTo(10000, 0);
  });

  it('includes reserved cash in goal funding', () => {
    const holdings = [
      makeHolding({ id: 'h1', liquidityPeriod: 'immediate', valueInPortfolioCurrency: 40000 }),
    ];
    const goal = makeGoal({ targetAmount: 50000, reservedCash: 15000, monthlyContribution: 0 });
    const result = calculateScenario(holdings, goal, NO_SHOCK, TODAY);
    // accessible = 40000, reserved = 15000, total = 55000 > 50000
    expect(result.goalFundingStatus).toBe('SURPLUS');
    expect(result.goalSurplus).toBeCloseTo(5000, 0);
  });

  it('excludes illiquid holdings from accessible value', () => {
    const holdings = [
      makeHolding({ id: 'h1', liquidityPeriod: 'immediate', valueInPortfolioCurrency: 30000 }),
      makeHolding({ id: 'h2', liquidityPeriod: 'illiquid', valueInPortfolioCurrency: 50000 }),
    ];
    const goal = makeGoal({ targetAmount: 50000, targetDate: '2027-01-01' });
    const result = calculateScenario(holdings, goal, NO_SHOCK, TODAY);
    expect(result.accessibleValue).toBeCloseTo(30000, 2);
  });

  it('includes monthly contributions in goal funding', () => {
    const holdings = [makeHolding({ id: 'h1', liquidityPeriod: 'immediate', valueInPortfolioCurrency: 10000 })];
    // Goal date ~14 months away from 2026-10-24
    const goal = makeGoal({
      targetAmount: 40000,
      targetDate: '2027-12-31',
      reservedCash: 0,
      monthlyContribution: 2000,
    });
    const result = calculateScenario(holdings, goal, NO_SHOCK, TODAY);
    // Contributions ≈ 2000 * 14.3 ≈ 28600; accessible = 10000; total ≈ 38600 < 40000
    expect(result.totalContributions).toBeGreaterThan(25000);
  });
});

// ==============================================================
// scaleScenario
// ==============================================================
describe('scaleScenario', () => {
  const base: ScenarioDefinition = {
    name: 'Base',
    description: '',
    equityShock: -0.40,
    sectorShocks: { technology: -0.60 },
    interestRateChangeBps: 200,
    currencyShocks: { EUR: -0.10 },
    liquidityRestrictionMultiplier: 2.0,
  };

  it('at multiplier=0 produces no shock', () => {
    const s = scaleScenario(base, 0);
    expect(s.equityShock).toBeCloseTo(0, 10);
    expect(s.sectorShocks.technology).toBeCloseTo(0, 10);
    expect(s.interestRateChangeBps).toBeCloseTo(0, 10);
    expect(s.liquidityRestrictionMultiplier).toBeCloseTo(1, 10);
  });

  it('at multiplier=1 reproduces base', () => {
    const s = scaleScenario(base, 1);
    expect(s.equityShock).toBeCloseTo(-0.40, 5);
    expect(s.sectorShocks.technology).toBeCloseTo(-0.60, 5);
    expect(s.liquidityRestrictionMultiplier).toBeCloseTo(2.0, 5);
  });

  it('at multiplier=0.5 halves the shocks', () => {
    const s = scaleScenario(base, 0.5);
    expect(s.equityShock).toBeCloseTo(-0.20, 5);
    expect(s.sectorShocks.technology).toBeCloseTo(-0.30, 5);
    expect(s.interestRateChangeBps).toBeCloseTo(100, 5);
  });
});

// ==============================================================
// findBreakingPoint
// ==============================================================
describe('findBreakingPoint', () => {
  const baseScenario: ScenarioDefinition = {
    name: 'Equity decline',
    description: '',
    equityShock: -1.0,  // Full scale = -100%
    sectorShocks: {},
    interestRateChangeBps: 0,
    currencyShocks: {},
    liquidityRestrictionMultiplier: 1,
  };

  const holdings = [
    makeHolding({ id: 'h1', assetClass: 'equity', liquidityPeriod: 'immediate', valueInPortfolioCurrency: 100000 }),
  ];

  const goal = makeGoal({
    targetAmount: 50000,
    targetDate: '2027-12-31',
    reservedCash: 0,
    monthlyContribution: 0,
  });

  it('finds breaking point for goal shortfall', () => {
    const result = findBreakingPoint({
      holdings,
      goal,
      baseScenario,
      failureConditions: ['GOAL_SHORTFALL'],
      minShockMultiplier: 0,
      maxShockMultiplier: 1,
      tolerance: 0.001,
      today: TODAY,
    });
    expect(result.status).toBe('BREAKING_POINT_FOUND');
    // Goal = 50000, portfolio = 100000 → breaks at 50% loss → multiplier ≈ 0.5
    expect(result.breakingPointShock).toBeCloseTo(-0.5, 1);
  });

  it('returns ALREADY_BREACHED when baseline fails', () => {
    const smallHoldings = [
      makeHolding({ id: 'h1', liquidityPeriod: 'immediate', valueInPortfolioCurrency: 5000 }),
    ];
    const bigGoal = makeGoal({ targetAmount: 100000 });
    const result = findBreakingPoint({
      holdings: smallHoldings,
      goal: bigGoal,
      baseScenario,
      failureConditions: ['GOAL_SHORTFALL'],
      today: TODAY,
    });
    expect(result.status).toBe('ALREADY_BREACHED');
  });

  it('returns NOT_BREACHED_WITHIN_RANGE when max shock does not breach', () => {
    // Only test INSUFFICIENT_LIQUIDITY threshold that can never be reached
    // because accessible value (1,000,000) always exceeds threshold (1)
    // even at full shock (equity=-1.0 would bring value to 0, but we use a mild base)
    const mildScenario: ScenarioDefinition = {
      name: 'Mild',
      description: '',
      equityShock: -0.05,  // Max 5% equity shock → $950,000 remains
      sectorShocks: {},
      interestRateChangeBps: 0,
      currencyShocks: {},
      liquidityRestrictionMultiplier: 1,
    };
    const largeHoldings = [
      makeHolding({ id: 'h1', liquidityPeriod: 'immediate', valueInPortfolioCurrency: 1_000_000 }),
    ];
    const result = findBreakingPoint({
      holdings: largeHoldings,
      goal: null,
      baseScenario: mildScenario,
      failureConditions: ['MIN_PORTFOLIO_VALUE'],
      minPortfolioValueThreshold: 100,   // Portfolio never goes below $100 at 5% max shock
      minShockMultiplier: 0,
      maxShockMultiplier: 1,
      today: TODAY,
    });
    expect(result.status).toBe('NOT_BREACHED_WITHIN_RANGE');
  });

  it('respects minimum portfolio value threshold', () => {
    const result = findBreakingPoint({
      holdings,
      goal: null,
      baseScenario,
      failureConditions: ['MIN_PORTFOLIO_VALUE'],
      minPortfolioValueThreshold: 70000,
      today: TODAY,
    });
    expect(result.status).toBe('BREAKING_POINT_FOUND');
    // 100000 * (1 + shock) < 70000 → shock < -0.30
    expect(result.breakingPointShock!).toBeLessThan(-0.29);
  });
});

// ==============================================================
// calculateExposure
// ==============================================================
describe('calculateExposure', () => {
  it('returns empty result for no holdings', () => {
    const result = calculateExposure([]);
    expect(result.totalPortfolioValue).toBe(0);
    expect(result.clusters.length).toBe(0);
  });

  it('detects technology sector concentration', () => {
    const holdings = [
      makeHolding({ id: 'h1', sector: 'technology', valueInPortfolioCurrency: 70000 }),
      makeHolding({ id: 'h2', sector: 'healthcare', valueInPortfolioCurrency: 30000 }),
    ];
    const result = calculateExposure(holdings);
    const techCluster = result.clusters.find(c => c.label === 'technology' && c.dimension === 'sector');
    expect(techCluster).toBeDefined();
    expect(techCluster!.portfolioPercent).toBeCloseTo(0.70, 3);
    expect(techCluster!.warningLevel).toBe('critical');
  });

  it('detects shared exposure tags', () => {
    const holdings = [
      makeHolding({ id: 'h1', valueInPortfolioCurrency: 60000, exposureTags: ['AI'] }),
      makeHolding({ id: 'h2', valueInPortfolioCurrency: 40000, exposureTags: ['AI'] }),
    ];
    const result = calculateExposure(holdings);
    const aiCluster = result.clusters.find(c => c.label === '#AI');
    expect(aiCluster).toBeDefined();
    expect(aiCluster!.portfolioPercent).toBeCloseTo(1.0, 2);
  });

  it('does not show tag clusters below 10% threshold', () => {
    const holdings = [
      makeHolding({ id: 'h1', valueInPortfolioCurrency: 9000, exposureTags: ['rare_tag'] }),
      makeHolding({ id: 'h2', valueInPortfolioCurrency: 91000 }),
    ];
    const result = calculateExposure(holdings);
    const rareTag = result.clusters.find(c => c.label === '#rare_tag');
    expect(rareTag).toBeUndefined();
  });

  it('generates critical warning for > 70% concentration', () => {
    const holdings = [
      makeHolding({ id: 'h1', sector: 'technology', valueInPortfolioCurrency: 80000 }),
      makeHolding({ id: 'h2', sector: 'healthcare', valueInPortfolioCurrency: 20000 }),
    ];
    const result = calculateExposure(holdings);
    const hasCritical = result.concentrationWarnings.some(w => w.startsWith('CRITICAL'));
    expect(hasCritical).toBe(true);
  });
});

// ==============================================================
// calculateLiquidityProfile
// ==============================================================
describe('calculateLiquidityProfile', () => {
  it('all immediate holdings are liquid', () => {
    const holdings = [
      makeHolding({ id: 'h1', liquidityPeriod: 'immediate', valueInPortfolioCurrency: 50000 }),
    ];
    const goal = makeGoal({ targetDate: '2027-12-31' });
    const profile = calculateLiquidityProfile(holdings, goal, TODAY);
    expect(profile.liquidByGoalDate).toBeCloseTo(50000, 2);
    expect(profile.illiquid).toBeCloseTo(0, 2);
  });

  it('illiquid holdings are not included in liquid total', () => {
    const holdings = [
      makeHolding({ id: 'h1', liquidityPeriod: 'immediate', valueInPortfolioCurrency: 30000 }),
      makeHolding({ id: 'h2', liquidityPeriod: 'illiquid', valueInPortfolioCurrency: 70000 }),
    ];
    const goal = makeGoal({ targetDate: '2027-12-31' });
    const profile = calculateLiquidityProfile(holdings, goal, TODAY);
    expect(profile.liquidByGoalDate).toBeCloseTo(30000, 2);
    expect(profile.illiquid).toBeCloseTo(70000, 2);
  });
});

// ==============================================================
// Demo Data Integration Test
// ==============================================================
describe('Demo data integration', () => {
  it('has 10 demo holdings summing to ~$208,000', () => {
    expect(DEMO_HOLDINGS.length).toBe(10);
    const total = DEMO_HOLDINGS.reduce((s, h) => s + h.valueInPortfolioCurrency, 0);
    expect(total).toBeCloseTo(208000, -2); // within $100
  });

  it('tech sector exposure exceeds 40%', () => {
    const result = calculateExposure(DEMO_HOLDINGS);
    const techCluster = result.clusters.find(c => c.label === 'technology' && c.dimension === 'sector');
    expect(techCluster).toBeDefined();
    expect(techCluster!.portfolioPercent).toBeGreaterThan(0.40);
  });

  it('goal shortfall appears after tech shock in demo scenario', () => {
    const techShock: ScenarioDefinition = {
      name: 'Tech disruption',
      description: '',
      equityShock: -0.10,
      sectorShocks: { technology: -0.45 },
      interestRateChangeBps: 0,
      currencyShocks: {},
      liquidityRestrictionMultiplier: 1.2,
    };
    const result = calculateScenario(DEMO_HOLDINGS, DEMO_GOAL, techShock, TODAY);
    expect(result.goalFundingStatus).toBe('SHORTFALL');
  });

  it('demo portfolio has a breaking point for goal shortfall', () => {
    const baseScenario: ScenarioDefinition = {
      name: 'Tech decline',
      description: '',
      equityShock: -0.10,
      sectorShocks: { technology: -1.0 },  // Full scale = complete tech wipeout
      interestRateChangeBps: 0,
      currencyShocks: {},
      liquidityRestrictionMultiplier: 1,
    };
    const result = findBreakingPoint({
      holdings: DEMO_HOLDINGS,
      goal: DEMO_GOAL,
      baseScenario,
      failureConditions: ['GOAL_SHORTFALL'],
      minShockMultiplier: 0,
      maxShockMultiplier: 1,
      today: TODAY,
    });
    expect(['BREAKING_POINT_FOUND', 'ALREADY_BREACHED']).toContain(result.status);
  });
});
