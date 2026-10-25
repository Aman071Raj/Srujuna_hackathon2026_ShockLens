/**
 * PortfolioIQ Copilot Reasoning & Orchestration Service
 * Upgraded with:
 * - Dynamic Intent Routing (Handles arbitrary custom financial questions)
 * - Universe Historical Stock Performance Ranking
 * - Multi-Stock Comparison Tool
 * - News & Event Impact Retrieval
 * - Strict Financial Safety & Non-Categorical Decision Neutrality
 */
import { marketDataService, MarketQuote } from './marketDataService';
import { quantitativeAnalyticsService, TechnicalIndicators, StockComparisonResult } from './quantitativeAnalyticsService';
import { copilotIntentRouter } from './copilotIntentRouter';
import { marketResearchToolService, RankedStockItem, NewsSnippet } from './marketResearchToolService';
import { logger } from '../logger';

export interface ChatRequest {
  message: string;
  portfolioId?: string;
  userId?: string;
  portfolioContext?: {
    name: string;
    totalValue: number;
    currency: string;
    holdings: Array<{
      id: string;
      name: string;
      ticker?: string;
      assetClass: string;
      sector?: string;
      valueInPortfolioCurrency: number;
    }>;
  };
}

export interface StructuredChatResponse {
  summaryPoints: string[];
  detailedAnalysis?: {
    type: 'STOCK_QUOTE' | 'STOCK_SWITCH' | 'SCENARIO_SIMULATION' | 'MACRO_SECTOR' | 'PORTFOLIO_AUDIT' | 'HISTORICAL_RANKING' | 'MULTI_COMPARE' | 'EVENT_NEWS' | 'EDUCATIONAL';
    quote?: MarketQuote;
    technicals?: TechnicalIndicators;
    switchComparison?: StockComparisonResult;
    rankingResult?: {
      items: RankedStockItem[];
      periodLabel: string;
      coverageNote: string;
    };
    multiCompareResult?: Array<{
      symbol: string;
      name: string;
      price: number;
      returnPct: number;
      volatilityPct: number;
      sessionDate: string;
    }>;
    newsSnippets?: NewsSnippet[];
    simulation?: any;
    macroSnapshot?: any;
    assumptions?: string[];
    sources: string[];
    asOf: string;
    freshnessLabel: string;
    validationWarnings?: string[];
  };
  recommendedPrompts?: string[];
}

export class PortfolioIQCopilotService {
  public async handleUserQuery(req: ChatRequest): Promise<StructuredChatResponse> {
    const rawQuery = req.message.trim();
    const holdings = req.portfolioContext?.holdings || [];
    const portfolioName = req.portfolioContext?.name || 'Your Portfolio';

    // ── Intent Router Evaluation ──
    const parsedIntent = copilotIntentRouter.parse(rawQuery);

    switch (parsedIntent.taskType) {
      case 'GREETING':
        return this.handleGreeting();

      case 'HISTORICAL_RANKING':
        return this.handleHistoricalRanking(parsedIntent.entities);

      case 'MULTI_STOCK_COMPARE':
        return this.handleMultiStockCompare(parsedIntent.entities.compareSymbols || []);

      case 'STOCK_SWITCH_COMPARISON': {
        const pair = parsedIntent.entities.switchPair;
        if (pair?.from && pair?.to) {
          return this.handleStockSwitch(pair.from, pair.to, holdings);
        }
        return this.handleAmbiguousClarification(rawQuery);
      }

      case 'EVENT_NEWS_IMPACT':
        return this.handleEventNewsImpact(parsedIntent.entities.eventStockOrTopic || rawQuery);

      case 'PORTFOLIO_STRESS_TEST': {
        const shockPct = parsedIntent.entities.scenarioShockPct ?? -10;
        return this.handleScenarioShock(shockPct, holdings, portfolioName);
      }

      case 'SECTOR_MACRO_ANALYSIS':
        return this.handleMacroAndSectorIntelligence(parsedIntent.entities.macroOrSectorTopic || rawQuery);

      case 'PORTFOLIO_AUDIT':
        return this.handlePortfolioAudit(holdings, portfolioName);

      case 'EDUCATIONAL':
        return this.handleEducation(parsedIntent.entities.educationalTopic || rawQuery);

      case 'SINGLE_STOCK_PRICE': {
        const sym = parsedIntent.entities.singleStockQuery || rawQuery;
        return this.handleSingleStockIntelligence(sym, holdings);
      }

      case 'AMBIGUOUS_CLARIFICATION':
      default: {
        // Try searching as a stock ticker first
        const resolved = await marketDataService.resolveSymbol(rawQuery);
        if (resolved.length > 0) {
          return this.handleSingleStockIntelligence(resolved[0].symbol, holdings);
        }
        return this.handleAmbiguousClarification(rawQuery);
      }
    }
  }

  /**
   * 1. Greeting
   */
  private handleGreeting(): StructuredChatResponse {
    return {
      summaryPoints: [
        "Hi! I'm **PortfolioIQ Copilot**.",
        "Ask me about any stock price (*\"Tata Motors share price\"*), historical rankings (*\"Top 10 shares by 1-year returns\"*), comparisons (*\"Compare Suzlon and IRFC\"*), sector macro trends, or portfolio crash simulations.",
      ],
      recommendedPrompts: [
        'Give me the top 10 shares in the stock market based on high returns over 1 year',
        'What is Suzlon current price?',
        'Compare Suzlon, IRFC and Tata Power',
        'Should I switch HDFC Bank to ICICI Bank?',
        'What happens to my portfolio if NIFTY falls 10%?',
      ],
    };
  }

  /**
   * 2. Historical Stock Performance Ranking (e.g. "top 10 shares by 1-year returns")
   */
  private async handleHistoricalRanking(entities: {
    rankingPeriod?: '6M' | '1Y' | '3Y' | '5Y';
    rankingCount?: number;
    rankingOrder?: 'TOP' | 'BOTTOM';
  }): Promise<StructuredChatResponse> {
    const period = entities.rankingPeriod || '1Y';
    const count = entities.rankingCount || 10;
    const order = entities.rankingOrder || 'TOP';

    const ranking = await marketResearchToolService.getHistoricalUniverseRanking({
      period,
      count,
      order,
    });

    const items = ranking.items;
    if (items.length === 0) {
      return {
        summaryPoints: [
          `⚠️ Unable to retrieve historical prices for the requested ${period} period.`,
          `Please check connectivity to the market data feed.`,
        ],
      };
    }

    const leadersText = items
      .slice(0, 3)
      .map((it) => `**${it.name}** (\`${it.symbol}\`: **${it.returnPct >= 0 ? '+' : ''}${it.returnPct}%**)`)
      .join(', ');

    const bullet1 = `**${ranking.periodLabel} Performance Leaders (NSE Large/Mid-Cap)**: Top performers include ${leadersText}.`;
    const bullet2 = `**Price & Returns Universe**: Evaluated ${ranking.evaluatedCount} key Indian equities over trailing daily market closes (as of session date ${ranking.asOf}). Complete breakdown of all ${items.length} rankings is available below.`;
    const bullet3 = `**Analytical Neutrality Note**: Historical price returns do not guarantee or predict future returns. Dividends are excluded from price return metrics.`;

    return {
      summaryPoints: [bullet1, bullet2, bullet3],
      detailedAnalysis: {
        type: 'HISTORICAL_RANKING',
        rankingResult: {
          items: ranking.items,
          periodLabel: ranking.periodLabel,
          coverageNote: ranking.coverageNote,
        },
        assumptions: [
          `Calculated as ((latestPrice - startPrice) / startPrice) * 100 over ${ranking.periodLabel}.`,
          ranking.coverageNote,
          'Dividends and corporate spinoff adjustments may vary by security.',
        ],
        sources: ['Yahoo Finance Market Data API', 'NSE India Official Closes'],
        asOf: ranking.asOf,
        freshnessLabel: `Verified ${ranking.asOf} Session Tape`,
      },
      recommendedPrompts: [
        `Analyze ${items[0]?.symbol || 'top stock'} technicals`,
        `Compare ${items[0]?.symbol || 'Stock 1'} and ${items[1]?.symbol || 'Stock 2'}`,
        `Which sector looks attractive now?`,
      ],
    };
  }

  /**
   * 3. Multi-Stock Comparison
   */
  private async handleMultiStockCompare(symbols: string[]): Promise<StructuredChatResponse> {
    const results = await marketResearchToolService.compareMultipleStocks(symbols, '1y');
    if (results.length === 0) {
      return {
        summaryPoints: [
          `⚠️ Unable to retrieve verified quotes for the requested comparison list (${symbols.join(', ')}).`,
          `Please verify ticker names on NSE/BSE.`,
        ],
      };
    }

    const best = [...results].sort((a, b) => b.returnPct - a.returnPct)[0];
    const lowestVol = [...results].sort((a, b) => a.volatilityPct - b.volatilityPct)[0];

    const bullet1 = `**Multi-Stock Comparison (1-Year Trailing)**: Comparing ${results.map((r) => `**${r.name}** (₹${r.price})`).join(' vs ')}.`;
    const bullet2 = `**Performance & Volatility Highlights**: Highest trailing return: **${best.name}** (**${best.returnPct >= 0 ? '+' : ''}${best.returnPct}%**); Lowest annualized volatility: **${lowestVol.name}** (**${lowestVol.volatilityPct}%**).`;
    const bullet3 = `**Assessment**: Higher returns in cyclical stocks frequently coincide with higher annualized drawdowns. Diversification requires low cross-correlation.`;

    return {
      summaryPoints: [bullet1, bullet2, bullet3],
      detailedAnalysis: {
        type: 'MULTI_COMPARE',
        multiCompareResult: results,
        assumptions: [
          'Calculated from identical trailing daily close periods.',
          'Annualized volatility computed using standard daily return standard deviation scaled by sqrt(252).',
        ],
        sources: ['Yahoo Finance Market Data API', 'Quantitative Analytics Engine'],
        asOf: results[0]?.sessionDate || new Date().toISOString().split('T')[0],
        freshnessLabel: 'Verified Aligned Historical Closes',
      },
      recommendedPrompts: [
        `Should I switch ${results[0]?.symbol} to ${results[1]?.symbol}?`,
        `What happens to my portfolio if NIFTY falls 10%?`,
      ],
    };
  }

  /**
   * 4. Stock Switch Comparison
   */
  private async handleStockSwitch(
    fromQuery: string,
    toQuery: string,
    holdings: Array<any>,
  ): Promise<StructuredChatResponse> {
    try {
      const fromQuotes = await marketDataService.resolveSymbol(fromQuery);
      const toQuotes = await marketDataService.resolveSymbol(toQuery);

      const fromSymbol = fromQuotes[0]?.symbol || marketDataService.normalizeSymbol(fromQuery);
      const toSymbol = toQuotes[0]?.symbol || marketDataService.normalizeSymbol(toQuery);

      const [quoteA, quoteB] = await Promise.all([
        marketDataService.getQuote(fromSymbol, '1y'),
        marketDataService.getQuote(toSymbol, '1y'),
      ]);

      const comparison = quantitativeAnalyticsService.compareStocks(quoteA, quoteB, holdings);

      const signA = (comparison.currentStock.changePercent ?? 0) >= 0 ? '+' : '';
      const signB = (comparison.targetStock.changePercent ?? 0) >= 0 ? '+' : '';

      const bullet1 = `**Evidence Comparison**: **${quoteA.name}** (₹${quoteA.price.toLocaleString('en-IN')}, ${signA}${comparison.currentStock.changePercent ?? 'N/A'}%) vs **${quoteB.name}** (₹${quoteB.price.toLocaleString('en-IN')}, ${signB}${comparison.targetStock.changePercent ?? 'N/A'}%). 1Y Returns: **${comparison.currentStock.oneYearReturnPct ?? 'N/A'}%** vs **${comparison.targetStock.oneYearReturnPct ?? 'N/A'}%**; Annualized Volatility: **${comparison.currentStock.annualizedVolatilityPct ?? 'N/A'}%** vs **${comparison.targetStock.annualizedVolatilityPct ?? 'N/A'}%**.`;

      const bullet2 = `**Portfolio Impact**: Replacing ${quoteA.symbol} with ${quoteB.symbol} shifts volatility by **${(comparison.portfolioImpact.volatilityChangeDelta ?? 0) > 0 ? '+' : ''}${comparison.portfolioImpact.volatilityChangeDelta ?? 'N/A'}%** with cross-correlation **${comparison.historicalCorrelation ?? 'N/A'}** (estimated rebalancing friction / STT: ~₹${comparison.portfolioImpact.hypotheticalEstimatedTaxOrFriction.toLocaleString('en-IN')}).`;

      const bullet3 = `**Assessment & Limitations**: ${comparison.portfolioImpact.tradeEvaluation} Caveat: ${comparison.portfolioImpact.keyRisks[0] || 'Historical return outperformance does not forecast future results.'} Disclosed lookback: ${comparison.dateRangeEvaluated.from} to ${comparison.dateRangeEvaluated.to}.`;

      return {
        summaryPoints: [bullet1, bullet2, bullet3],
        detailedAnalysis: {
          type: 'STOCK_SWITCH',
          switchComparison: comparison,
          assumptions: [
            `Empirical daily price series compared over aligned dates: ${comparison.dateRangeEvaluated.from} to ${comparison.dateRangeEvaluated.to}.`,
            'Assumes full position reallocation with ~0.2% total execution & tax friction.',
            comparison.portfolioImpact.isPersonalizedPortfolio
              ? 'Calculated using your actual recorded portfolio allocation.'
              : 'General comparison (connect portfolio holdings to view personalized capital-weighted impact).',
          ],
          sources: [quoteA.dataSource, 'Quantitative Analytics Engine (Deterministic)'],
          asOf: quoteA.timestamp,
          freshnessLabel: quoteA.freshnessStatus === 'REAL_TIME' ? 'Verified Market Feeds' : `${quoteA.sessionDate} Closes`,
        },
        recommendedPrompts: [
          `Analyze ${quoteB.name} technicals`,
          `What happens to my portfolio if NIFTY falls 10%?`,
          `Which sector looks attractive now?`,
        ],
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to compute stock switch');
      return {
        summaryPoints: [
          `⚠️ Unable to complete switch comparison between "${fromQuery}" and "${toQuery}".`,
          `Please verify that both tickers correspond to listed securities (e.g. "HDFC Bank", "ICICI Bank").`,
        ],
      };
    }
  }

  /**
   * 5. News & Event Impact
   */
  private async handleEventNewsImpact(topic: string): Promise<StructuredChatResponse> {
    const snippets = await marketResearchToolService.getRecentVerifiedNews(topic);

    // Also fetch macro/stock if applicable
    let stockQuote: MarketQuote | undefined;
    const resolved = await marketDataService.resolveSymbol(topic);
    if (resolved.length > 0) {
      try {
        stockQuote = await marketDataService.getQuote(resolved[0].symbol, '1mo');
      } catch {}
    }

    const priceContext = stockQuote
      ? ` **${stockQuote.name}** (\`${stockQuote.symbol}\`) is trading at **₹${stockQuote.price}** (${(stockQuote.changePercent ?? 0) >= 0 ? '+' : ''}${stockQuote.changePercent}% on ${stockQuote.sessionDate}).`
      : '';

    const newsPoints = snippets.length > 0
      ? snippets.map((s) => `• ${s.snippet}`).join('\n')
      : '• No breaking regulatory filings or substantiated corporate notices found on tape today.';

    const bullet1 = `**Market Context on "${topic}"**:${priceContext}`;
    const bullet2 = `**Recent Press & News Filings**:\n${newsPoints}`;
    const bullet3 = `**Causality Caution**: Short-term equity price swings reflect a blend of broader index liquidity, institutional rebalancing, and macro risk-off sentiment. News headlines should not be assumed as the sole causal driver.`;

    return {
      summaryPoints: [bullet1, bullet2, bullet3],
      detailedAnalysis: {
        type: 'EVENT_NEWS',
        quote: stockQuote,
        newsSnippets: snippets,
        assumptions: ['News headlines indexed from verified press feeds. Causality between headlines and daily volatility is not guaranteed.'],
        sources: ['Financial Press Feed Indexer', stockQuote ? stockQuote.dataSource : 'Exchange Tape'],
        asOf: stockQuote?.sessionDate || new Date().toISOString().split('T')[0],
        freshnessLabel: 'Recent Press Coverage',
      },
      recommendedPrompts: [
        `Analyze ${topic} technicals`,
        `What happens to my portfolio if NIFTY falls 10%?`,
        `Which sector looks attractive now?`,
      ],
    };
  }

  /**
   * 6. Scenario Stress Testing
   */
  private async handleScenarioShock(
    shockPct: number,
    holdings: Array<any>,
    portfolioName: string,
  ): Promise<StructuredChatResponse> {
    if (holdings.length === 0) {
      return {
        summaryPoints: [
          `**Portfolio Empty**: No holdings found in **${portfolioName}**.`,
          `To run a personalized stress test, connect or add your equity and mutual fund holdings in the **My Portfolio** tab.`,
        ],
        recommendedPrompts: [
          'Give me the top 10 shares in the stock market based on high returns over 1 year',
          'Which sector looks attractive now?',
        ],
      };
    }

    const simulation = quantitativeAnalyticsService.simulateShock(holdings, {
      type: 'NIFTY_DROP',
      shockPercent: shockPct,
    });

    const highBetaAssets = simulation.holdingBreakdown
      .filter((h) => h.sensitivityApplied >= 1.0)
      .map((h) => h.name)
      .slice(0, 2)
      .join(', ');

    const bullet1 = `**Quantified Impact**: A **${shockPct}% drop in NIFTY** reduces **${portfolioName}** from **₹${simulation.originalValue.toLocaleString('en-IN')}** to **₹${simulation.shockedValue.toLocaleString('en-IN')}** (Estimated change: **-₹${Math.abs(simulation.rupeeImpact).toLocaleString('en-IN')}** or **${simulation.percentageImpact}%**).`;
    const bullet2 = `**Primary Contributors**: Cyclical holdings (${highBetaAssets || 'equities'}) generate the greatest drawdown due to high market beta sensitivities.`;
    const bullet3 = `**Assumptions & Limitations**: Simulates instant index drawdown based on baseline sector beta. Historical correlations can decouple during extreme liquidity events.`;

    return {
      summaryPoints: [bullet1, bullet2, bullet3],
      detailedAnalysis: {
        type: 'SCENARIO_SIMULATION',
        simulation,
        assumptions: simulation.assumptions,
        sources: ['ShockLens Stress Lab', 'Yahoo Finance Market Data API'],
        asOf: new Date().toISOString(),
        freshnessLabel: 'Quantified Simulation',
      },
      recommendedPrompts: [
        'How does crude oil impact my portfolio?',
        'Should I switch to defensive stocks?',
        'Analyze top portfolio risk',
      ],
    };
  }

  /**
   * 7. Sector and Macroeconomic Analysis
   */
  private async handleMacroAndSectorIntelligence(topic: string): Promise<StructuredChatResponse> {
    const macro = await marketDataService.getMacroSnapshot();

    const signNifty = (macro.nifty.changePercent ?? 0) >= 0 ? '+' : '';
    const signBank = (macro.bankNifty.changePercent ?? 0) >= 0 ? '+' : '';

    const bullet1 = `**Verified Macro Tape**: NIFTY is at **${macro.nifty.price.toLocaleString('en-IN')}** (${signNifty}${macro.nifty.changePercent ?? 'N/A'}% as of ${macro.nifty.sessionDate}), NIFTY Bank at **${macro.bankNifty.price.toLocaleString('en-IN')}** (${signBank}${macro.bankNifty.changePercent ?? 'N/A'}%), Brent Crude at **$${macro.crude.price}/bbl**, and USD/INR at **₹${macro.usdinr.price}**.`;
    const bullet2 = `**Macroeconomic Transmission**: Rising crude oil ($${macro.crude.price}/bbl) inflates industrial raw material costs, directly exerting pressure on margins for Auto, Paints, and Chemicals. Conversely, defensive sectors (**Pharma & FMCG**) display lower elasticity to crude shocks.`;
    const bullet3 = `**Uncertainty & Assessment**: Currency volatility (USD/INR at ₹${macro.usdinr.price}) creates import inflation risks for capital expenditure; no sector offers guaranteed alpha under elevated macro dispersion.`;

    return {
      summaryPoints: [bullet1, bullet2, bullet3],
      detailedAnalysis: {
        type: 'MACRO_SECTOR',
        macroSnapshot: macro,
        assumptions: [
          'All benchmark prices retrieved dynamically from official exchange tapes and continuous contracts.',
          'Sector sensitivity derived from historical gross margin exposure to crude and FX movements.',
        ],
        sources: [macro.nifty.dataSource, 'NSE / BSE Official Tape'],
        asOf: macro.timestamp,
        freshnessLabel: `${macro.nifty.sessionDate} Market Session`,
      },
      recommendedPrompts: [
        'Give me the top 10 shares in the stock market based on high returns over 1 year',
        'Analyze HDFC Bank',
        'What happens to my portfolio if NIFTY falls 10%?',
      ],
    };
  }

  /**
   * 8. Portfolio Audit
   */
  private handlePortfolioAudit(holdings: Array<any>, portfolioName: string): StructuredChatResponse {
    if (holdings.length === 0) {
      return {
        summaryPoints: [
          `**No Active Holdings**: Portfolio **"${portfolioName}"** contains no assets.`,
          `Add your holdings in **My Portfolio** to view verified risk metrics, concentration alerts, and scenario simulations.`,
        ],
      };
    }

    const totalVal = holdings.reduce((s, h) => s + (h.valueInPortfolioCurrency || 0), 0);
    const sorted = [...holdings].sort((a, b) => b.valueInPortfolioCurrency - a.valueInPortfolioCurrency);
    const top = sorted[0];
    const topConcentration = totalVal > 0 ? ((top.valueInPortfolioCurrency / totalVal) * 100).toFixed(1) : '0';

    const bullet1 = `**Portfolio Snapshot**: **${portfolioName}** consists of **${holdings.length} securities** with a total valuation of **₹${totalVal.toLocaleString('en-IN')}**.`;
    const bullet2 = `**Concentration Profile**: Largest single position is **${top.name}** at **${topConcentration}%** weight. Portfolios with >30% weight in a single holding experience higher idiosyncratic risk.`;
    const bullet3 = `**Actionable Stress Test**: Simulate a **-10% NIFTY crash** to inspect capital drawdown across individual positions.`;

    return {
      summaryPoints: [bullet1, bullet2, bullet3],
      detailedAnalysis: {
        type: 'PORTFOLIO_AUDIT',
        assumptions: ['Concentration evaluated on current market value weights.'],
        sources: ['User Database Portfolio State'],
        asOf: new Date().toISOString(),
        freshnessLabel: 'Active Holdings',
      },
      recommendedPrompts: [
        'What happens to my portfolio if NIFTY falls 10%?',
        'Which sector looks attractive now?',
      ],
    };
  }

  /**
   * 9. Educational Guidance
   */
  private handleEducation(topic: string): StructuredChatResponse {
    const lower = topic.toLowerCase();
    let explanation = '';

    if (lower.includes('rsi')) {
      explanation = `**Relative Strength Index (RSI)**: Measures the velocity and magnitude of recent price movements over 14 trading sessions using Wilder's smoothing. Readings above 70 indicate that the security is trading near the upper boundary of its recent range (often labeled overbought), while readings below 30 indicate oversold territory. RSI = 100 occurs mathematically when no downward closes occurred across the period.`;
    } else if (lower.includes('beta')) {
      explanation = `**Beta (β)**: Measures the systemic covariance of a security relative to a benchmark (e.g. NIFTY 50). A beta of 1.2 implies that the security has historically experienced 20% larger swings than the index, while a beta of 0.65 suggests defensive, non-cyclical resilience.`;
    } else if (lower.includes('drawdown')) {
      explanation = `**Maximum Drawdown**: Measures the largest percentage drop from a peak to a trough before a new peak is reached over a historical window. It quantifies historical tail risk and capital loss rather than typical day-to-day volatility.`;
    } else if (lower.includes('index fund') || lower.includes('individual stock')) {
      explanation = `**Index Funds vs Individual Stocks**: An index fund (e.g. NIFTY 50 ETF) provides instant exposure across 50 diversified sector leaders, virtually eliminating company-specific bankruptcy risk. Individual stocks allow targeted capital allocation but require managing idiosyncratic earnings and governance risks.`;
    } else {
      explanation = `**Quantitative Investment Metrics**: Financial metrics such as RSI, Annualized Volatility (Standard Deviation × √252), and Maximum Drawdown should be evaluated alongside fundamental balance-sheet leverage, operating margins, and macroeconomic sensitivity.`;
    }

    return {
      summaryPoints: [
        explanation,
        `**Educational Principle**: No technical indicator or valuation metric functions as a guaranteed standalone signal. Robust portfolio construction prioritizes asset allocation, diversification, and liquidity.`,
      ],
      detailedAnalysis: {
        type: 'EDUCATIONAL',
        sources: ['Quantitative Financial Mathematics Standards'],
        asOf: new Date().toISOString(),
        freshnessLabel: 'Educational Reference',
      },
      recommendedPrompts: [
        'Give me the top 10 shares in the stock market based on high returns over 1 year',
        'What is Suzlon current price?',
        'What happens to my portfolio if NIFTY falls 10%?',
      ],
    };
  }

  /**
   * 10. Single Stock Price & Technical Intelligence
   */
  private async handleSingleStockIntelligence(
    queryText: string,
    holdings: Array<any>,
  ): Promise<StructuredChatResponse> {
    try {
      let targetSymbol = queryText.toUpperCase().trim();
      const resolvedList = await marketDataService.resolveSymbol(queryText);
      if (resolvedList.length > 0) {
        targetSymbol = resolvedList[0].symbol;
      }

      const quote = await marketDataService.getQuote(targetSymbol, '1y');
      const technicals = quantitativeAnalyticsService.calculateTechnicalIndicators(quote);

      const inHolding = holdings.find((h) =>
        quote.symbol.toUpperCase().includes((h.ticker || '').toUpperCase().replace('.NS', '').replace('.BO', '')) ||
        quote.name.toLowerCase().includes(h.name.toLowerCase().split(' ')[0]),
      );
      const portfolioNote = inHolding
        ? ` (In your portfolio: ₹${inHolding.valueInPortfolioCurrency.toLocaleString('en-IN')})`
        : '';

      const sign = (quote.changePercent ?? 0) >= 0 ? '+' : '';
      const moveStr = quote.changePercent !== null ? ` (${sign}${quote.changePercent}% on ${quote.sessionDate})` : '';
      const dayRangeStr = quote.dayLow && quote.dayHigh ? ` • Day Range: ₹${quote.dayLow} – ₹${quote.dayHigh}` : '';

      const bullet1 = `**Price & Tape**: **${quote.name}** (\`${quote.symbol}\` on ${quote.exchange})${portfolioNote} is at **₹${quote.price.toLocaleString('en-IN')}**${moveStr}${dayRangeStr}. [${quote.freshnessNote}]`;

      const rsiStr = technicals.rsi14 ? `${technicals.rsi14.value} (${technicals.rsi14.method})` : 'N/A';
      const volStr = technicals.annualizedVolatilityPct ? `${technicals.annualizedVolatilityPct.value}%` : 'N/A';
      const mddStr = technicals.maxDrawdownPct ? `-${technicals.maxDrawdownPct.value}%` : 'N/A';
      const supportStr = technicals.supportEstimate ? `₹${technicals.supportEstimate.value}` : 'N/A';
      const resistanceStr = technicals.resistanceEstimate ? `₹${technicals.resistanceEstimate.value}` : 'N/A';

      const bullet2 = `**Quantitative Metrics**: 14-Period RSI: **${rsiStr}** • 252-Day Annualized Volatility: **${volStr}** • 1Y Max Drawdown: **${mddStr}** • 60-Day Support/Resistance: **${supportStr} / ${resistanceStr}**.`;
      const bullet3 = `**Context**: Evaluated across ${technicals.dataObservations} historical trading sessions (${technicals.startDate} to ${technicals.endDate}). Past price action does not guarantee future performance.`;

      return {
        summaryPoints: [bullet1, bullet2, bullet3],
        detailedAnalysis: {
          type: 'STOCK_QUOTE',
          quote,
          technicals,
          assumptions: [
            'All technical indicators (RSI-14, Volatility, Max Drawdown) computed deterministically from verified historical daily closes.',
            technicals.rsi14 ? technicals.rsi14.method : 'RSI methodology: Wilder smoothing over 14 periods.',
            technicals.annualizedVolatilityPct ? `Annualized Volatility factor: sqrt(252) over ${technicals.annualizedVolatilityPct.lookbackDays} daily returns.` : '',
          ].filter(Boolean),
          sources: [quote.dataSource, `${quote.exchange} Tape`],
          asOf: quote.timestamp,
          freshnessLabel: quote.freshnessStatus === 'REAL_TIME' ? 'Verified Live Tape' : quote.freshnessNote,
          validationWarnings: quote.validationWarnings,
        },
        recommendedPrompts: [
          `Should I switch ${quote.name} to another stock?`,
          `What happens to my portfolio if NIFTY falls 10%?`,
          `Which sector looks attractive now?`,
        ],
      };
    } catch (err: any) {
      logger.warn({ err: err.message, query: queryText }, 'Stock intelligence lookup error');
      return {
        summaryPoints: [
          `⚠️ **Data Notice for "${queryText}"**: Unable to retrieve verified exchange records.`,
          `Please provide the official NSE/BSE ticker (e.g. \`SUZLON.NS\`, \`IRFC.NS\`, \`TMCV.NS\`) or check the company spelling.`,
        ],
      };
    }
  }

  /**
   * Ambiguous Fallback
   */
  private handleAmbiguousClarification(rawQuery: string): StructuredChatResponse {
    return {
      summaryPoints: [
        `I couldn't identify the specific security or financial analysis requested in *"${rawQuery}"*.`,
        `You can ask for performance rankings (*"Top 10 shares by 1-year returns"*), compare stocks (*"Compare Suzlon and IRFC"*), check live prices (*"What is Suzlon current price?"*), or stress test (*"What happens if NIFTY falls 10%?"*).`,
      ],
      recommendedPrompts: [
        'Give me the top 10 shares in the stock market based on high returns over 1 year',
        'What is Suzlon current price?',
        'Compare Suzlon, IRFC and Tata Power',
        'Should I switch HDFC Bank to ICICI Bank?',
        'What happens to my portfolio if NIFTY falls 10%?',
      ],
    };
  }
}

export const portfolioIQCopilotService = new PortfolioIQCopilotService();
