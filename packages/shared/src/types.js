"use strict";
// ============================================================
// ShockLens — Shared Domain Types
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCENARIO_PRESETS = void 0;
exports.SCENARIO_PRESETS = {
    equity_decline: {
        name: 'Broad Equity Market Decline',
        description: 'A broad market selloff affecting most equity holdings.',
        equityShock: -0.30,
        sectorShocks: {},
        interestRateChangeBps: -50, // flight to bonds
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
//# sourceMappingURL=types.js.map