/**
 * Financial Butterfly Effect Engine
 * Quantitative Multi-Step Causal Chain & Cross-Asset Propagation Modeler
 */

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
  impactRange: [number, number]; // [min%, max%]
  confidenceScore: number; // 0 - 100%
  evidenceType: 'empirical_regression' | 'historical_correlation' | 'economic_transmission' | 'user_hypothesis';
  evidenceSummary: string;
  dataPointsCount: number;
  baselineValue?: number;
  unit?: string;
}

export interface CausalEdge {
  fromNodeId: string;
  toNodeId: string;
  relationshipName: string;
  elasticity: number; // Sensitivity coefficient (e.g. % change in target per 1% change in source)
  historicalCorrelation: number; // -1 to +1
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
  timeHorizon: string; // e.g. "1 to 3 Months (Intermediate Transmission)"
  
  // Graph representation
  nodes: CausalNode[];
  edges: CausalEdge[];

  // Aggregated Portfolio Impact
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

  // Quantitative Evidence & Explainability
  explainability: {
    conclusion: string;
    causalNarrative: string;
    methodology: string;
    coreAssumptions: string[];
    invalidationRisks: string[];
    dataFreshnessNotice: string;
    statisticalConfidenceScore: number; // out of 100
  };
}
