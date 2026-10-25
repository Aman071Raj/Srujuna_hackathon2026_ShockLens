"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvHoldingRowSchema = exports.CreateReportSchema = exports.CompareAllocationsRequestSchema = exports.BreakingPointRequestSchema = exports.ScenarioAnalysisRequestSchema = exports.ExposureAnalysisRequestSchema = exports.ScenarioDefinitionSchema = exports.UpdateGoalSchema = exports.CreateGoalSchema = exports.GoalTypeEnum = exports.UpdateHoldingSchema = exports.CreateHoldingSchema = exports.HistoricalValueSchema = exports.LiquidityPeriodEnum = exports.AssetClassEnum = exports.UpdatePortfolioSchema = exports.CreatePortfolioSchema = exports.UpdateProfileSchema = exports.LoginSchema = exports.RegisterSchema = void 0;
const zod_1 = require("zod");
// ---- Auth Schemas ----
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    name: zod_1.z.string().min(1, 'Name is required').max(100),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.UpdateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    email: zod_1.z.string().email().optional(),
    currentPassword: zod_1.z.string().optional(),
    newPassword: zod_1.z.string().min(8).optional(),
}).refine(data => {
    if (data.newPassword && !data.currentPassword) {
        return false;
    }
    return true;
}, { message: 'currentPassword is required to set a new password' });
// ---- Portfolio Schemas ----
exports.CreatePortfolioSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Portfolio name is required').max(100),
    description: zod_1.z.string().max(500).optional(),
    currency: zod_1.z.string().length(3, 'Currency must be a 3-letter ISO code').toUpperCase(),
});
exports.UpdatePortfolioSchema = exports.CreatePortfolioSchema.partial();
// ---- Holding Schemas ----
exports.AssetClassEnum = zod_1.z.enum([
    'equity', 'fixed_income', 'real_estate', 'commodity',
    'cash', 'crypto', 'alternative', 'other',
]);
exports.LiquidityPeriodEnum = zod_1.z.enum([
    'immediate', 'short', 'medium', 'long', 'illiquid',
]);
exports.HistoricalValueSchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    value: zod_1.z.number().nonnegative(),
});
exports.CreateHoldingSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Holding name is required').max(200),
    ticker: zod_1.z.string().max(20).optional(),
    assetClass: exports.AssetClassEnum,
    sector: zod_1.z.string().max(100).optional(),
    geography: zod_1.z.string().max(100).optional(),
    currency: zod_1.z.string().length(3).toUpperCase(),
    currentValue: zod_1.z.number().positive('Current value must be positive'),
    exchangeRateUsed: zod_1.z.number().positive().optional(),
    liquidityPeriod: exports.LiquidityPeriodEnum,
    liquidationHaircut: zod_1.z.number().min(0).max(1).optional(),
    durationYears: zod_1.z.number().nonnegative().optional(),
    rateShockSensitivity: zod_1.z.number().optional(),
    exposureTags: zod_1.z.array(zod_1.z.string().max(50)).max(20).optional(),
    historicalValues: zod_1.z.array(exports.HistoricalValueSchema).optional(),
    notes: zod_1.z.string().max(1000).optional(),
});
exports.UpdateHoldingSchema = exports.CreateHoldingSchema.partial();
// ---- Goal Schemas ----
exports.GoalTypeEnum = zod_1.z.enum([
    'home_down_payment', 'higher_education', 'retirement_withdrawal',
    'emergency_reserve', 'custom',
]);
exports.CreateGoalSchema = zod_1.z.object({
    portfolioId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(1).max(200),
    goalType: exports.GoalTypeEnum,
    targetAmount: zod_1.z.number().positive('Target amount must be positive'),
    targetDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    reservedCash: zod_1.z.number().nonnegative().default(0),
    requiredLiquidAmount: zod_1.z.number().nonnegative(),
    acceptableShortfall: zod_1.z.number().nonnegative().default(0),
    monthlyContribution: zod_1.z.number().nonnegative().optional(),
    flexibleDate: zod_1.z.boolean().default(false),
});
exports.UpdateGoalSchema = exports.CreateGoalSchema.partial();
// ---- Scenario Schemas ----
exports.ScenarioDefinitionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(1000).optional().default(''),
    equityShock: zod_1.z.number().min(-1).max(1),
    sectorShocks: zod_1.z.record(zod_1.z.string(), zod_1.z.number().min(-1).max(1)).default({}),
    interestRateChangeBps: zod_1.z.number().min(-1000).max(5000),
    currencyShocks: zod_1.z.record(zod_1.z.string(), zod_1.z.number().min(-1).max(1)).default({}),
    liquidityRestrictionMultiplier: zod_1.z.number().min(1).max(100).default(1),
    customNotes: zod_1.z.string().max(1000).optional(),
});
// ---- Analysis Schemas ----
exports.ExposureAnalysisRequestSchema = zod_1.z.object({
    portfolioId: zod_1.z.string().uuid(),
});
exports.ScenarioAnalysisRequestSchema = zod_1.z.object({
    portfolioId: zod_1.z.string().uuid(),
    goalId: zod_1.z.string().uuid().optional(),
    scenario: exports.ScenarioDefinitionSchema,
});
exports.BreakingPointRequestSchema = zod_1.z.object({
    portfolioId: zod_1.z.string().uuid(),
    goalId: zod_1.z.string().uuid().optional(),
    shockFamily: zod_1.z.enum(['equity', 'tech_sector', 'interest_rate', 'currency', 'combined', 'custom']),
    customScenarioBase: exports.ScenarioDefinitionSchema.optional(),
    minShock: zod_1.z.number().min(-1).max(0).default(-1),
    maxShock: zod_1.z.number().min(-1).max(0).default(0),
    failureConditions: zod_1.z.array(zod_1.z.enum([
        'GOAL_SHORTFALL', 'INSUFFICIENT_LIQUIDITY', 'MIN_PORTFOLIO_VALUE',
    ])).min(1),
    minPortfolioValueThreshold: zod_1.z.number().nonnegative().optional(),
    liquidityThreshold: zod_1.z.number().nonnegative().optional(),
    tolerance: zod_1.z.number().positive().default(0.001),
});
exports.CompareAllocationsRequestSchema = zod_1.z.object({
    portfolioId: zod_1.z.string().uuid(),
    goalId: zod_1.z.string().uuid().optional(),
    scenario: exports.ScenarioDefinitionSchema,
    alternatives: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string().min(1),
        description: zod_1.z.string().optional().default(''),
        weights: zod_1.z.array(zod_1.z.object({
            label: zod_1.z.string(),
            assetClass: exports.AssetClassEnum,
            sector: zod_1.z.string().optional(),
            liquidityPeriod: exports.LiquidityPeriodEnum,
            weight: zod_1.z.number().min(0).max(1),
        })).min(1),
    })).min(1).max(5),
}).refine(data => {
    return data.alternatives.every(alt => {
        const sum = alt.weights.reduce((s, w) => s + w.weight, 0);
        return Math.abs(sum - 1) < 0.001;
    });
}, { message: 'Each allocation\'s weights must sum to 1.0' });
exports.CreateReportSchema = zod_1.z.object({
    portfolioId: zod_1.z.string().uuid(),
    goalId: zod_1.z.string().uuid().optional(),
    scenarioAnalysisId: zod_1.z.string().uuid().optional(),
    breakingPointAnalysisId: zod_1.z.string().uuid().optional(),
    includeComparison: zod_1.z.boolean().default(false),
    title: zod_1.z.string().min(1).max(200).optional(),
});
// ---- CSV Import Types ----
exports.CsvHoldingRowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    ticker: zod_1.z.string().optional(),
    assetClass: exports.AssetClassEnum,
    sector: zod_1.z.string().optional(),
    geography: zod_1.z.string().optional(),
    currency: zod_1.z.string().length(3).toUpperCase(),
    currentValue: zod_1.z.preprocess(v => Number(v), zod_1.z.number().positive()),
    liquidityPeriod: exports.LiquidityPeriodEnum,
    liquidationHaircut: zod_1.z.preprocess(v => v === '' ? undefined : Number(v), zod_1.z.number().min(0).max(1).optional()),
    exposureTags: zod_1.z.string().optional().transform(v => v ? v.split('|').map(t => t.trim()).filter(Boolean) : []),
    notes: zod_1.z.string().optional(),
});
//# sourceMappingURL=schemas.js.map