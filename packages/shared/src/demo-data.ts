/**
 * ShockLens Demo Data — Fictional sample portfolio for hackathon demonstrations.
 *
 * Story: Priya wants to save $180,000 for a home down payment by December 2026.
 * Her portfolio looks diversified but Portfolio X-Ray reveals heavy tech exposure.
 */

import type { Holding, FinancialGoal, Portfolio, User } from './types';

const NOW = new Date('2026-10-24');

export const DEMO_USER: Omit<User, 'createdAt' | 'updatedAt'> = {
  id: 'demo-user-001',
  email: 'priya.demo@shocklens.example',
  name: 'Priya (Demo)',
};

export const DEMO_PORTFOLIO: Omit<Portfolio, 'holdings' | 'createdAt' | 'updatedAt'> = {
  id: 'demo-portfolio-001',
  userId: 'demo-user-001',
  name: "Priya's Growth Portfolio",
  description: 'Demo portfolio — all data is fictional and for illustration only.',
  currency: 'USD',
};

/**
 * Exchange rates used (dated 2026-10-24 — fictional demo rates):
 * EUR/USD = 1.08
 * GBP/USD = 1.27
 * All other holdings already in USD.
 */
export const DEMO_HOLDINGS: Holding[] = [
  {
    id: 'h-001',
    portfolioId: 'demo-portfolio-001',
    name: 'S&P 500 Index Fund',
    ticker: 'SPY',
    assetClass: 'equity',
    sector: 'diversified',
    geography: 'US',
    currency: 'USD',
    currentValue: 45000,
    valueInPortfolioCurrency: 45000,
    exchangeRateUsed: 1,
    liquidityPeriod: 'short',
    liquidationHaircut: 0,
    exposureTags: ['us_equity', 'index'],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'h-002',
    portfolioId: 'demo-portfolio-001',
    name: 'Nasdaq Technology ETF',
    ticker: 'QQQ',
    assetClass: 'equity',
    sector: 'technology',
    geography: 'US',
    currency: 'USD',
    currentValue: 38000,
    valueInPortfolioCurrency: 38000,
    exchangeRateUsed: 1,
    liquidityPeriod: 'short',
    liquidationHaircut: 0,
    exposureTags: ['tech', 'us_equity', 'AI', 'semiconductor'],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'h-003',
    portfolioId: 'demo-portfolio-001',
    name: 'Cloud Infrastructure Corp',
    ticker: 'CIC',
    assetClass: 'equity',
    sector: 'technology',
    geography: 'US',
    currency: 'USD',
    currentValue: 22000,
    valueInPortfolioCurrency: 22000,
    exchangeRateUsed: 1,
    liquidityPeriod: 'short',
    liquidationHaircut: 0,
    exposureTags: ['tech', 'cloud', 'AI'],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'h-004',
    portfolioId: 'demo-portfolio-001',
    name: 'European Blue Chip Fund',
    ticker: 'EBC',
    assetClass: 'equity',
    sector: 'diversified',
    geography: 'EU',
    currency: 'EUR',
    currentValue: 18520,           // EUR
    valueInPortfolioCurrency: 20002, // USD (×1.08)
    exchangeRateUsed: 1.08,
    liquidityPeriod: 'medium',
    liquidationHaircut: 0.01,
    exposureTags: ['eu_equity', 'index'],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'h-005',
    portfolioId: 'demo-portfolio-001',
    name: 'Semiconductor Innovators Fund',
    ticker: 'SEMI',
    assetClass: 'equity',
    sector: 'technology',
    geography: 'Global',
    currency: 'USD',
    currentValue: 15000,
    valueInPortfolioCurrency: 15000,
    exchangeRateUsed: 1,
    liquidityPeriod: 'short',
    liquidationHaircut: 0,
    exposureTags: ['tech', 'semiconductor', 'AI'],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'h-006',
    portfolioId: 'demo-portfolio-001',
    name: '10-Year Treasury Bond',
    ticker: 'TLT',
    assetClass: 'fixed_income',
    sector: 'government_bond',
    geography: 'US',
    currency: 'USD',
    currentValue: 20000,
    valueInPortfolioCurrency: 20000,
    exchangeRateUsed: 1,
    liquidityPeriod: 'short',
    liquidationHaircut: 0,
    durationYears: 8.5,
    rateShockSensitivity: -8.5,  // Modified duration ≈ 8.5; per 100bps rate rise, ~8.5% price drop
    exposureTags: ['bonds', 'safe_haven'],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'h-007',
    portfolioId: 'demo-portfolio-001',
    name: 'Real Estate Investment Trust',
    ticker: 'REIT',
    assetClass: 'real_estate',
    sector: 'real_estate',
    geography: 'US',
    currency: 'USD',
    currentValue: 12000,
    valueInPortfolioCurrency: 12000,
    exchangeRateUsed: 1,
    liquidityPeriod: 'medium',
    liquidationHaircut: 0.02,
    exposureTags: ['real_estate', 'rate_sensitive'],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'h-008',
    portfolioId: 'demo-portfolio-001',
    name: 'Venture Tech Fund (Locked)',
    ticker: undefined,
    assetClass: 'alternative',
    sector: 'technology',
    geography: 'US',
    currency: 'USD',
    currentValue: 18000,
    valueInPortfolioCurrency: 18000,
    exchangeRateUsed: 1,
    liquidityPeriod: 'illiquid',
    liquidationHaircut: 0.20,
    exposureTags: ['tech', 'vc', 'illiquid', 'AI'],
    notes: 'Locked until Q2 2028. Cannot be liquidated for goal.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'h-009',
    portfolioId: 'demo-portfolio-001',
    name: 'Money Market Fund',
    ticker: 'MMF',
    assetClass: 'cash',
    sector: 'cash',
    geography: 'US',
    currency: 'USD',
    currentValue: 8000,
    valueInPortfolioCurrency: 8000,
    exchangeRateUsed: 1,
    liquidityPeriod: 'immediate',
    liquidationHaircut: 0,
    exposureTags: ['cash', 'safe_haven'],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'h-010',
    portfolioId: 'demo-portfolio-001',
    name: 'UK Dividend ETF',
    ticker: 'UKDV',
    assetClass: 'equity',
    sector: 'financials',
    geography: 'UK',
    currency: 'GBP',
    currentValue: 7874,           // GBP
    valueInPortfolioCurrency: 9998, // USD (×1.27)
    exchangeRateUsed: 1.27,
    liquidityPeriod: 'medium',
    liquidationHaircut: 0.01,
    exposureTags: ['uk_equity', 'dividend'],
    createdAt: NOW,
    updatedAt: NOW,
  },
];

// Total portfolio value in USD: 45000 + 38000 + 22000 + 20002 + 15000 + 20000 + 12000 + 18000 + 8000 + 9998 = $208,000

export const DEMO_GOAL: FinancialGoal = {
  id: 'demo-goal-001',
  userId: 'demo-user-001',
  portfolioId: 'demo-portfolio-001',
  name: 'Home Down Payment',
  goalType: 'home_down_payment',
  targetAmount: 180000,
  targetDate: '2026-12-31',
  reservedCash: 5000,     // Already set aside separately
  requiredLiquidAmount: 170000,
  acceptableShortfall: 10000,
  monthlyContribution: 2000,
  flexibleDate: false,
  createdAt: NOW,
  updatedAt: NOW,
};

/** Summary figures for quick display */
export const DEMO_SUMMARY = {
  totalValue: 208000,
  goalTarget: 180000,
  reservedCash: 5000,
  demoRates: {
    'EUR/USD': 1.08,
    'GBP/USD': 1.27,
    rateDate: '2026-10-24 (fictional demo rates)',
  },
  techExposureUSD: 38000 + 22000 + 15000 + 18000, // = $93,000 = 44.7%
  techExposurePercent: 44.7,
};
