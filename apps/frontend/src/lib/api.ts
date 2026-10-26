/**
 * API client for ShockLens backend.
 * All requests go through /api (proxied by Vite to localhost:4000).
 */

import { supabase, usesSupabaseAuth } from './supabase';
import { DEMO_USER, DEMO_PORTFOLIO, DEMO_HOLDINGS, DEMO_GOAL } from '@shocklens/shared';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const isGuestSession = () => sessionStorage.getItem('shocklens_guest') === 'true';

export const enableGuestMode = () => {
  sessionStorage.setItem('shocklens_guest', 'true');
};

export const disableGuestMode = () => {
  sessionStorage.removeItem('shocklens_guest');
};

const GUEST_PORTFOLIO = {
  ...DEMO_PORTFOLIO,
  holdings: DEMO_HOLDINGS,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

const GUEST_GOAL = {
  ...DEMO_GOAL,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  if (isGuestSession()) {
    if (path === '/auth/me') {
      return { user: { ...DEMO_USER, createdAt: '2026-01-01T00:00:00.000Z' } } as unknown as T;
    }
    if (path === '/auth/logout') {
      disableGuestMode();
      return { message: 'Logged out successfully' } as unknown as T;
    }
    if (path === '/portfolios') {
      return { portfolios: [GUEST_PORTFOLIO] } as unknown as T;
    }
    if (path.startsWith('/portfolios/')) {
      return { portfolio: GUEST_PORTFOLIO } as unknown as T;
    }
    if (path === '/goals') {
      return { goals: [GUEST_GOAL] } as unknown as T;
    }
    if (path.startsWith('/goals/')) {
      return { goal: GUEST_GOAL } as unknown as T;
    }
    if (path === '/butterfly/baselines') {
      return {
        timestamp: new Date().toISOString(),
        baselines: {
          'CL=F': { symbol: 'CL=F', name: 'Brent Crude Oil', category: 'commodity', latestPrice: 74.2, previousClose: 73.8, change: 0.4, changePercent: 0.54, unit: 'USD/bbl', isLive: true, dataSource: 'Yahoo Finance' },
          'INR=X': { symbol: 'INR=X', name: 'USD / INR Spot', category: 'currency', latestPrice: 84.1, previousClose: 84.05, change: 0.05, changePercent: 0.06, unit: 'INR', isLive: true, dataSource: 'Yahoo Finance' },
          '^TNX': { symbol: '^TNX', name: 'US 10-Year Yield', category: 'rates', latestPrice: 4.24, previousClose: 4.21, change: 0.03, changePercent: 0.71, unit: '%', isLive: true, dataSource: 'Yahoo Finance' },
          '^NSEI': { symbol: '^NSEI', name: 'Nifty 50', category: 'index', latestPrice: 24350, previousClose: 24200, change: 150, changePercent: 0.62, unit: 'pts', isLive: true, dataSource: 'NSE' },
        },
      } as unknown as T;
    }
  }

  const headers = new Headers();
  if (body) headers.set('Content-Type', 'application/json');
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(`Could not read your Supabase session: ${error.message}`);
    if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (path === '/auth/me' && isGuestSession()) {
      return { user: { ...DEMO_USER, createdAt: '2026-01-01T00:00:00.000Z' } } as unknown as T;
    }
    throw new Error('Could not reach the ShockLens API. Please use Demo Guest Access or start the backend.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = (data as { error?: string }).error ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

const get = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body);
const patch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body);
const del = <T>(path: string) => request<T>('DELETE', path);

// ---- Auth ----
export const auth = {
  register: async (input: { email: string; password: string; name: string }) => {
    if (!supabase) return post<{ user: { id: string; email: string; name: string }; confirmationRequired?: false }>('/auth/register', input);
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: { name: input.name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Supabase created no user. Check the project Auth settings and try again.');
    if (!data.session) {
      return {
        user: { id: data.user.id, email: data.user.email ?? input.email, name: input.name },
        confirmationRequired: true as const,
      };
    }
    const profile = await get<{ user: { id: string; email: string; name: string; createdAt: string } }>('/auth/me');
    return { user: profile.user, confirmationRequired: false as const };
  },
  login: async (input: { email: string; password: string }) => {
    if (!supabase) return post<{ user: { id: string; email: string; name: string } }>('/auth/login', input);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('Sign-in completed without a session. Check your email confirmation settings.');
    const profile = await get<{ user: { id: string; email: string; name: string; createdAt: string } }>('/auth/me');
    return { user: profile.user };
  },
  logout: async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      try { await post<{ message: string }>('/auth/logout'); } catch { /* Supabase sign-out is authoritative. */ }
      return { message: 'Logged out successfully' };
    }
    return post<{ message: string }>('/auth/logout');
  },
  me: () => get<{ user: { id: string; email: string; name: string; createdAt: string } }>('/auth/me'),
  updateProfile: async (input: Record<string, string>) => {
    if (!supabase) return patch<{ user: { id: string; email: string; name: string } }>('/auth/profile', input);
    const attributes: { password?: string; data?: Record<string, string> } = {};
    if (input.newPassword) attributes.password = input.newPassword;
    if (input.name) attributes.data = { name: input.name };
    if (Object.keys(attributes).length > 0) {
      const { error } = await supabase.auth.updateUser(attributes);
      if (error) throw new Error(error.message);
    }
    if (input.name) return patch<{ user: { id: string; email: string; name: string } }>('/auth/profile', { name: input.name });
    return get<{ user: { id: string; email: string; name: string } }>('/auth/me');
  },
};

export { usesSupabaseAuth };

// ---- Portfolios ----
export const portfolios = {
  list: () => get<{ portfolios: unknown[] }>('/portfolios'),
  get: (id: string) => get<{ portfolio: unknown }>(`/portfolios/${id}`),
  create: (data: { name: string; description?: string; currency: string }) =>
    post<{ portfolio: unknown }>('/portfolios', data),
  update: (id: string, data: Record<string, unknown>) =>
    patch<{ portfolio: unknown }>(`/portfolios/${id}`, data),
  delete: (id: string) => del<{ message: string }>(`/portfolios/${id}`),
  addHolding: (portfolioId: string, data: Record<string, unknown>) =>
    post<{ holding: unknown }>(`/portfolios/${portfolioId}/holdings`, data),
  csvTemplate: () => fetch(`${BASE}/portfolios/csv-template/download`, { credentials: 'include' }),
  importCsv: async (portfolioId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/portfolios/${portfolioId}/import`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json();
  },
};

// ---- Holdings ----
export const holdings = {
  update: (id: string, data: Record<string, unknown>) =>
    patch<{ holding: unknown }>(`/holdings/${id}`, data),
  delete: (id: string) => del<{ message: string }>(`/holdings/${id}`),
};

// ---- Goals ----
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
  portfolioHoldingsAudit?: PortfolioHoldingAudit[];
  dumpList?: PortfolioHoldingAudit[];
  healthyHoldings?: PortfolioHoldingAudit[];
  portfolioTotalValue?: number;
  totalCapitalFreedFromDump?: number;
  riskCategory: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE_GROWTH' | 'UNREALISTIC_REQUIRED_RETURN';
  strategicAdvice: string;
}

export const goals = {
  list: () => get<{ goals: unknown[] }>('/goals'),
  create: (data: Record<string, unknown>) => post<{ goal: unknown }>('/goals', data),
  update: (id: string, data: Record<string, unknown>) => patch<{ goal: unknown }>(`/goals/${id}`, data),
  delete: (id: string) => del<{ message: string }>(`/goals/${id}`),
  recommendInvestments: (data: {
    targetAmount: number;
    targetDate: string;
    monthlyContribution: number;
    reservedCash?: number;
    currentSavings?: number;
    portfolioId?: string;
  }) => post<{ recommendation: GoalInvestmentPlan }>('/goals/recommend-investments', data),
};

// ---- Analysis ----
export const analysis = {
  exposure: (portfolioId: string) =>
    post<{ result: unknown }>('/analysis/exposure', { portfolioId }),
  scenario: (data: { portfolioId: string; goalId?: string; scenario: unknown }) =>
    post<{ result: unknown }>('/analysis/scenario', data),
  compare: (data: Record<string, unknown>) =>
    post<{ result: unknown }>('/analysis/compare', data),
};

// ---- Reports ----
export const reports = {
  list: () => get<{ reports: unknown[] }>('/reports'),
  create: (data: Record<string, unknown>) => post<{ report: unknown }>('/reports', data),
  get: (id: string) => get<{ report: unknown }>(`/reports/${id}`),
  download: (id: string) => fetch(`${BASE}/reports/${id}/download`, { credentials: 'include' }),
};

// ---- Indian Stock Market & Switch Analysis ----
export interface StockQuote {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  previousClose: number;
  volume: number;
  oneMonthReturn: number;
  sixMonthReturn: number;
  oneYearReturn: number;
  volatility: number;
  history: { date: string; price: number; volume: number }[];
}

export interface StockSwitchAnalysis {
  investmentAmount: number;
  recommendation: 'STRONG_SWITCH' | 'CONSIDER_SWITCH' | 'HOLD_CURRENT' | 'NEUTRAL';
  verdict: string;
  strategy: string;
  reasonings: string[];
  comparison: {
    currentStock: StockQuote;
    targetStock: StockQuote;
    currentUnits: number;
    targetUnits: number;
    timeline: {
      date: string;
      currentStockPrice: number;
      targetStockPrice: number;
      currentNormalized: number;
      targetNormalized: number;
    }[];
  };
}

export const stocks = {
  search: (query: string) =>
    get<{ results: { symbol: string; name: string; exchange: string }[] }>(`/stocks/search?q=${encodeURIComponent(query)}`),
  getQuote: (symbol: string) =>
    get<{ stock: StockQuote }>(`/stocks/quote/${encodeURIComponent(symbol)}`),
  compareAndSwitch: (data: { currentSymbol: string; targetSymbol: string; investmentAmount: number }) =>
    post<StockSwitchAnalysis>('/stocks/compare-and-switch', data),
};

// ---- Financial Butterfly Effect Engine ----
export interface MacroIndicator {
  symbol: string;
  name: string;
  category: 'commodity' | 'currency' | 'index' | 'rates';
  latestPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  unit: string;
  timestamp: string;
  isRealTime: boolean;
}

export interface CausalNode {
  id: string;
  name: string;
  stage: 'trigger' | 'macro_factor' | 'transmission' | 'sector' | 'stock' | 'portfolio';
  category: string;
  expectedDirection: 'positive' | 'negative' | 'neutral';
  estimatedImpactPct: number;
  impactRange: [number, number];
  confidenceScore: number;
  evidenceType: string;
  evidenceSummary: string;
  dataPointsCount: number;
  baselineValue?: number;
  unit?: string;
}

export interface CausalEdge {
  fromNodeId: string;
  toNodeId: string;
  relationshipName: string;
  elasticity: number;
  historicalCorrelation: number;
  lagDays: number;
  economicRationale: string;
  empiricalBasis: string;
}

export interface HoldingImpact {
  holdingId: string;
  holdingName: string;
  ticker: string;
  assetClass: string;
  sector: string;
  currentValue: number;
  portfolioWeightPct: number;
  betaToScenario: number;
  estimatedReturnPct: number;
  estimatedMonetaryImpact: number;
  bestCaseMonetary: number;
  adverseCaseMonetary: number;
  transmissionPath: string[];
  historicalConfidence: number;
  isStaleOrSimulated: boolean;
}

export interface ButterflyAnalysisResult {
  scenarioId: string;
  scenarioName: string;
  triggerDescription: string;
  isHypothetical: boolean;
  baselineTimestamp: string;
  macroBaseline: Record<string, MacroIndicator>;
  timeHorizon: string;
  nodes: CausalNode[];
  edges: CausalEdge[];
  portfolioSummary: {
    portfolioName: string;
    totalValueBefore: number;
    estimatedValueAfter: number;
    netMonetaryImpact: number;
    netPercentageImpact: number;
    adverseCaseLoss: number;
    bestCaseGain: number;
    positiveHoldingsCount: number;
    negativeHoldingsCount: number;
    topRiskContributor: string;
    hedgingBenefit: string;
    concentrationWarning?: string;
  };
  holdingImpacts: HoldingImpact[];
  sectorBreakdown: {
    sector: string;
    allocatedValue: number;
    weightPct: number;
    estimatedReturnPct: number;
    netImpact: number;
    direction: 'positive' | 'negative' | 'neutral';
  }[];
  explainability: {
    conclusion: string;
    causalNarrative: string;
    methodology: string;
    coreAssumptions: string[];
    invalidationRisks: string[];
    dataFreshnessNotice: string;
    statisticalConfidenceScore: number;
  };
  contagionPaths?: Array<{
    holdingId: string;
    holdingName: string;
    ticker: string;
    sector: string;
    standardBetaImpactPct: number;
    contagionAmplifiedImpactPct: number;
    hiddenRiskDelta: number;
    isNonObviousVictim: boolean;
    hops: Array<{
      hopNumber: number;
      trigger: string;
      transmission: string;
      estimatedImpactPct: number;
      lagDays: number;
      hopType: 'direct' | 'indirect' | 'demand_side' | 'credit_channel' | 'sentiment';
    }>;
    worstCaseContagionPct: number;
    bestCaseContagionPct: number;
    hedgeRecommendation?: string;
  }>;
}

export const butterfly = {
  getBaselines: () =>
    get<{ timestamp: string; baselines: Record<string, MacroIndicator> }>('/butterfly/baselines'),
  getRealtimeAnalysis: (portfolioId?: string) =>
    get<{ result: ButterflyAnalysisResult & { activeRealtimeRisks: string[] } }>(
      `/butterfly/realtime-analysis${portfolioId ? `?portfolioId=${encodeURIComponent(portfolioId)}` : ''}`
    ),
  simulate: (data: {
    scenarioType: string;
    shockMagnitudePct: number;
    customTriggerName?: string;
    portfolioId?: string;
  }) => post<{ result: ButterflyAnalysisResult }>('/butterfly/simulate', data),
  getShockImmunity: (data: { portfolioId?: string; budgetAmount?: number }) =>
    post<{
      result: {
        currentDownsideAtRisk: number;
        protectedDownsideValue: number;
        overallRiskReductionPct: number;
        primaryVulnerability: string;
        budgetAllocated: number;
        recommendedHedges: Array<{
          id: string;
          name: string;
          ticker: string;
          instrumentType: string;
          recommendedAllocationPct: number;
          recommendedAmount: number;
          hedgeReason: string;
          expectedProtectionPct: number;
          riskMitigated: string;
        }>;
      };
    }>('/butterfly/shock-immunity', data),
};

export interface CopilotChatResponse {
  summaryPoints: string[];
  detailedAnalysis?: {
    type: 'STOCK_QUOTE' | 'STOCK_SWITCH' | 'SCENARIO_SIMULATION' | 'MACRO_SECTOR' | 'PORTFOLIO_AUDIT' | 'HISTORICAL_RANKING' | 'MULTI_COMPARE' | 'EVENT_NEWS' | 'EDUCATIONAL';
    quote?: {
      symbol: string;
      name: string;
      exchange: string;
      currency: string;
      price: number;
      change: number;
      changePercent: number;
      open: number;
      dayHigh: number;
      dayLow: number;
      previousClose: number;
      volume: number;
      fiftyTwoWeekHigh: number;
      fiftyTwoWeekLow: number;
      timestamp: string;
      isRealTime: boolean;
      dataSource: string;
      historicalCloses: { date: string; price: number; volume: number }[];
    };
    technicals?: {
      rsi14: number | null;
      sma20: number | null;
      sma50: number | null;
      sma200: number | null;
      annualizedVolatilityPct: number;
      maxDrawdownPct: number;
      supportEstimate: number | null;
      resistanceEstimate: number | null;
    };
    switchComparison?: any;
    simulation?: any;
    macroSnapshot?: any;
    assumptions?: string[];
    sources: string[];
    asOf: string;
    freshnessLabel: string;
  };
  recommendedPrompts?: string[];
}

export const copilot = {
  chat: (data: { message: string; portfolioId?: string }) =>
    post<CopilotChatResponse>('/copilot/chat', data),
};
