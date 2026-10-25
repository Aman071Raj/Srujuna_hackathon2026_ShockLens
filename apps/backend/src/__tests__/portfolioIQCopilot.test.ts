import { describe, it, expect } from 'vitest';
import { CopilotIntentRouter } from '../services/copilotIntentRouter';
import { MarketResearchToolService } from '../services/marketResearchToolService';
import { PortfolioIQCopilotService } from '../services/portfolioIQCopilotService';

describe('CopilotIntentRouter — Broad Custom Natural Language Questions', () => {
  const router = new CopilotIntentRouter();

  it('routes "Give me the top 10 shares in the stock market based on high returns from 1 year" to HISTORICAL_RANKING', () => {
    const res = router.parse('Give me the top 10 shares in the stock market based on high returns from 1 year.');
    expect(res.taskType).toBe('HISTORICAL_RANKING');
    expect(res.entities.rankingPeriod).toBe('1Y');
    expect(res.entities.rankingCount).toBe(10);
  });

  it('routes "Which NIFTY 50 stocks performed best over the past six months?" to 6M ranking', () => {
    const res = router.parse('Which NIFTY 50 stocks performed best over the past six months?');
    expect(res.taskType).toBe('HISTORICAL_RANKING');
    expect(res.entities.rankingPeriod).toBe('6M');
  });

  it('routes "Compare Suzlon, IRFC and Tata Power" to MULTI_STOCK_COMPARE', () => {
    const res = router.parse('Compare Suzlon, IRFC and Tata Power');
    expect(res.taskType).toBe('MULTI_STOCK_COMPARE');
    expect(res.entities.compareSymbols?.length).toBeGreaterThanOrEqual(3);
  });

  it('routes "Why did Tata Motors fall today?" to EVENT_NEWS_IMPACT', () => {
    const res = router.parse('Why did Tata Motors fall today?');
    expect(res.taskType).toBe('EVENT_NEWS_IMPACT');
    expect(res.entities.eventStockOrTopic).toContain('Tata Motors');
  });

  it('routes "Explain RSI, beta and maximum drawdown" to EDUCATIONAL', () => {
    const res = router.parse('Explain RSI, beta and maximum drawdown using an Indian stock example.');
    expect(res.taskType).toBe('EDUCATIONAL');
  });

  it('routes "Explain the impact of rising crude oil prices on Indian companies" to SECTOR_MACRO_ANALYSIS', () => {
    const res = router.parse('Explain the impact of rising crude oil prices on Indian companies.');
    expect(res.taskType).toBe('SECTOR_MACRO_ANALYSIS');
  });
});

describe('MarketResearchToolService — Deterministic Universe Ranking', () => {
  const researchService = new MarketResearchToolService();

  it('calculates historical rankings across broad Indian universe from actual tape closes', async () => {
    const result = await researchService.getHistoricalUniverseRanking({
      period: '1Y',
      count: 10,
      order: 'TOP',
    });

    expect(result.items.length).toBe(10);
    expect(result.evaluatedCount).toBeGreaterThan(15);
    expect(result.items[0].currentPrice).toBeGreaterThan(0);
    expect(result.items[0].startingPrice).toBeGreaterThan(0);
    // Descending order check
    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i - 1].returnPct).toBeGreaterThanOrEqual(result.items[i].returnPct);
    }
  });

  it('compares multiple stocks over aligned periods without fabricating returns', async () => {
    const res = await researchService.compareMultipleStocks(['Suzlon', 'IRFC', 'Tata Power'], '1y');
    expect(res.length).toBe(3);
    for (const item of res) {
      expect(item.price).toBeGreaterThan(0);
      expect(item.sessionDate).toBeDefined();
    }
  });
});

describe('PortfolioIQCopilotService Acceptance Tests (Custom Questions & Upgraded AI)', () => {
  const copilot = new PortfolioIQCopilotService();

  it('Test 1: "Hi" returns greeting without requesting stock data or mock cards', async () => {
    const res = await copilot.handleUserQuery({ message: 'Hi' });
    expect(res.summaryPoints[0]).toContain("Hi! I'm **PortfolioIQ Copilot**");
    expect(res.detailedAnalysis).toBeUndefined();
  });

  it('Test 2: "Give me the top 10 shares in the stock market based on high returns over 1 year." returns ranked table', async () => {
    const res = await copilot.handleUserQuery({
      message: 'Give me the top 10 shares in the stock market based on high returns over 1 year.',
    });
    expect(res.summaryPoints[0]).toContain('Trailing 1Y Performance Leaders');
    expect(res.detailedAnalysis?.type).toBe('HISTORICAL_RANKING');
    expect(res.detailedAnalysis?.rankingResult?.items.length).toBe(10);
    expect(res.detailedAnalysis?.rankingResult?.items[0].symbol).toBeDefined();
  });

  it('Test 3: "Compare Suzlon, IRFC and Tata Power" executes multi-stock comparison', async () => {
    const res = await copilot.handleUserQuery({
      message: 'Compare Suzlon, IRFC and Tata Power',
    });
    expect(res.summaryPoints[0]).toContain('Multi-Stock Comparison');
    expect(res.detailedAnalysis?.type).toBe('MULTI_COMPARE');
    expect(res.detailedAnalysis?.multiCompareResult?.length).toBe(3);
  });

  it('Test 4: "Why did Tata Motors fall today?" retrieves market price context and press filings without inventing false causes', async () => {
    const res = await copilot.handleUserQuery({
      message: 'Why did Tata Motors fall today?',
    });
    expect(res.summaryPoints[0]).toContain('Tata Motors');
    expect(res.summaryPoints[2]).toContain('Causality Caution');
    expect(res.detailedAnalysis?.type).toBe('EVENT_NEWS');
  });

  it('Test 5: "Explain the impact of rising crude oil prices on Indian companies" executes macro analysis', async () => {
    const res = await copilot.handleUserQuery({
      message: 'Explain the impact of rising crude oil prices on Indian companies',
    });
    expect(res.summaryPoints[1]).toContain('crude oil');
    expect(res.detailedAnalysis?.macroSnapshot).toBeDefined();
  });

  it('Test 6: "Explain RSI, beta and maximum drawdown using an Indian stock example." returns educational answer', async () => {
    const res = await copilot.handleUserQuery({
      message: 'Explain RSI, beta and maximum drawdown using an Indian stock example.',
    });
    expect(res.summaryPoints[0]).toContain('Relative Strength Index');
    expect(res.detailedAnalysis?.type).toBe('EDUCATIONAL');
  });

  it('Test 7: "What happens to my portfolio if NIFTY falls 10%?" runs quantified stress test', async () => {
    const res = await copilot.handleUserQuery({
      message: 'What happens to my portfolio if NIFTY falls 10%?',
      portfolioContext: {
        name: 'Growth Alpha',
        totalValue: 500000,
        currency: 'INR',
        holdings: [
          { id: 'h1', name: 'Tata Motors', assetClass: 'equity', sector: 'automobile', valueInPortfolioCurrency: 300000 },
          { id: 'h2', name: 'Liquid Cash', assetClass: 'cash', sector: 'cash', valueInPortfolioCurrency: 200000 },
        ],
      },
    });
    expect(res.summaryPoints[0]).toContain('-10% drop in NIFTY');
    expect(res.detailedAnalysis?.simulation.rupeeImpact).toBeLessThan(0);
  });
});
