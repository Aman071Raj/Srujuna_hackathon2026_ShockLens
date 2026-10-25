import { z } from 'zod';

// ---- Auth Schemas ----
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
}).refine(data => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, { message: 'currentPassword is required to set a new password' });

// ---- Portfolio Schemas ----
export const CreatePortfolioSchema = z.object({
  name: z.string().min(1, 'Portfolio name is required').max(100),
  description: z.string().max(500).optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').toUpperCase(),
});

export const UpdatePortfolioSchema = CreatePortfolioSchema.partial();

// ---- Holding Schemas ----
export const AssetClassEnum = z.enum([
  'equity', 'fixed_income', 'real_estate', 'commodity',
  'cash', 'crypto', 'alternative', 'other',
]);

export const LiquidityPeriodEnum = z.enum([
  'immediate', 'short', 'medium', 'long', 'illiquid',
]);

export const HistoricalValueSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  value: z.number().nonnegative(),
});

export const CreateHoldingSchema = z.object({
  name: z.string().min(1, 'Holding name is required').max(200),
  ticker: z.string().max(20).optional(),
  assetClass: AssetClassEnum,
  sector: z.string().max(100).optional(),
  geography: z.string().max(100).optional(),
  currency: z.string().length(3).toUpperCase(),
  currentValue: z.number().positive('Current value must be positive'),
  exchangeRateUsed: z.number().positive().optional(),
  liquidityPeriod: LiquidityPeriodEnum,
  liquidationHaircut: z.number().min(0).max(1).optional(),
  durationYears: z.number().nonnegative().optional(),
  rateShockSensitivity: z.number().optional(),
  exposureTags: z.array(z.string().max(50)).max(20).optional(),
  historicalValues: z.array(HistoricalValueSchema).optional(),
  notes: z.string().max(1000).optional(),
});

export const UpdateHoldingSchema = CreateHoldingSchema.partial();

// ---- Goal Schemas ----
export const GoalTypeEnum = z.enum([
  'home_down_payment', 'higher_education', 'retirement_withdrawal',
  'emergency_reserve', 'custom',
]);

export const CreateGoalSchema = z.object({
  portfolioId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  goalType: GoalTypeEnum,
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reservedCash: z.number().nonnegative().default(0),
  requiredLiquidAmount: z.number().nonnegative(),
  acceptableShortfall: z.number().nonnegative().default(0),
  monthlyContribution: z.number().nonnegative().optional(),
  flexibleDate: z.boolean().default(false),
});

export const UpdateGoalSchema = CreateGoalSchema.partial();

// ---- Scenario Schemas ----
export const ScenarioDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(''),
  equityShock: z.number().min(-1).max(1),
  sectorShocks: z.record(z.string(), z.number().min(-1).max(1)).default({}),
  interestRateChangeBps: z.number().min(-1000).max(5000),
  currencyShocks: z.record(z.string(), z.number().min(-1).max(1)).default({}),
  liquidityRestrictionMultiplier: z.number().min(1).max(100).default(1),
  customNotes: z.string().max(1000).optional(),
});

// ---- Analysis Schemas ----
export const ExposureAnalysisRequestSchema = z.object({
  portfolioId: z.string().uuid(),
});

export const ScenarioAnalysisRequestSchema = z.object({
  portfolioId: z.string().uuid(),
  goalId: z.string().uuid().optional(),
  scenario: ScenarioDefinitionSchema,
});

export const BreakingPointRequestSchema = z.object({
  portfolioId: z.string().uuid(),
  goalId: z.string().uuid().optional(),
  shockFamily: z.enum(['equity', 'tech_sector', 'interest_rate', 'currency', 'combined', 'custom']),
  customScenarioBase: ScenarioDefinitionSchema.optional(),
  minShock: z.number().min(-1).max(0).default(-1),
  maxShock: z.number().min(-1).max(0).default(0),
  failureConditions: z.array(z.enum([
    'GOAL_SHORTFALL', 'INSUFFICIENT_LIQUIDITY', 'MIN_PORTFOLIO_VALUE',
  ])).min(1),
  minPortfolioValueThreshold: z.number().nonnegative().optional(),
  liquidityThreshold: z.number().nonnegative().optional(),
  tolerance: z.number().positive().default(0.001),
});

export const CompareAllocationsRequestSchema = z.object({
  portfolioId: z.string().uuid(),
  goalId: z.string().uuid().optional(),
  scenario: ScenarioDefinitionSchema,
  alternatives: z.array(z.object({
    id: z.string(),
    name: z.string().min(1),
    description: z.string().optional().default(''),
    weights: z.array(z.object({
      label: z.string(),
      assetClass: AssetClassEnum,
      sector: z.string().optional(),
      liquidityPeriod: LiquidityPeriodEnum,
      weight: z.number().min(0).max(1),
    })).min(1),
  })).min(1).max(5),
}).refine(data => {
  return data.alternatives.every(alt => {
    const sum = alt.weights.reduce((s, w) => s + w.weight, 0);
    return Math.abs(sum - 1) < 0.001;
  });
}, { message: 'Each allocation\'s weights must sum to 1.0' });

export const CreateReportSchema = z.object({
  portfolioId: z.string().uuid(),
  goalId: z.string().uuid().optional(),
  scenarioAnalysisId: z.string().uuid().optional(),
  breakingPointAnalysisId: z.string().uuid().optional(),
  includeComparison: z.boolean().default(false),
  title: z.string().min(1).max(200).optional(),
});

// ---- CSV Import Types ----
export const CsvHoldingRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ticker: z.string().optional(),
  assetClass: AssetClassEnum,
  sector: z.string().optional(),
  geography: z.string().optional(),
  currency: z.string().length(3).toUpperCase(),
  currentValue: z.preprocess(v => Number(v), z.number().positive()),
  liquidityPeriod: LiquidityPeriodEnum,
  liquidationHaircut: z.preprocess(v => v === '' ? undefined : Number(v), z.number().min(0).max(1).optional()),
  exposureTags: z.string().optional().transform(v => v ? v.split('|').map(t => t.trim()).filter(Boolean) : []),
  notes: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreatePortfolioInput = z.infer<typeof CreatePortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof UpdatePortfolioSchema>;
export type CreateHoldingInput = z.infer<typeof CreateHoldingSchema>;
export type UpdateHoldingInput = z.infer<typeof UpdateHoldingSchema>;
export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;
export type ScenarioDefinitionInput = z.infer<typeof ScenarioDefinitionSchema>;
export type ScenarioAnalysisRequest = z.infer<typeof ScenarioAnalysisRequestSchema>;
export type BreakingPointRequest = z.infer<typeof BreakingPointRequestSchema>;
export type CompareAllocationsRequest = z.infer<typeof CompareAllocationsRequestSchema>;
export type CsvHoldingRow = z.infer<typeof CsvHoldingRowSchema>;
