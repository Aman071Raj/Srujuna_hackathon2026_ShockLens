/**
 * Comprehensive Intent Router for PortfolioIQ Copilot
 * Accurately interprets natural-language financial requests across 12 distinct task types.
 */

export type CopilotTaskType =
  | 'GREETING'
  | 'HISTORICAL_RANKING'
  | 'MULTI_STOCK_COMPARE'
  | 'STOCK_SWITCH_COMPARISON'
  | 'EVENT_NEWS_IMPACT'
  | 'SECTOR_MACRO_ANALYSIS'
  | 'PORTFOLIO_STRESS_TEST'
  | 'PORTFOLIO_AUDIT'
  | 'EDUCATIONAL'
  | 'SINGLE_STOCK_PRICE'
  | 'AMBIGUOUS_CLARIFICATION';

export interface ParsedCopilotIntent {
  taskType: CopilotTaskType;
  confidence: number;
  entities: {
    rankingUniverse?: string;
    rankingPeriod?: '6M' | '1Y' | '3Y' | '5Y';
    rankingCount?: number;
    rankingOrder?: 'TOP' | 'BOTTOM';
    compareSymbols?: string[];
    switchPair?: { from: string; to: string };
    eventStockOrTopic?: string;
    singleStockQuery?: string;
    scenarioShockPct?: number;
    macroOrSectorTopic?: string;
    educationalTopic?: string;
  };
}

export class CopilotIntentRouter {
  public parse(input: string): ParsedCopilotIntent {
    const raw = input.trim();
    const lower = raw.toLowerCase();

    // ── 1. Greeting ──
    const greetingMatch = lower.match(/^(hi|hii|hiii|hello|hey|heyy|greetings|namaste|good\s+(morning|afternoon|evening))\b/i);
    if (greetingMatch && raw.split(/\s+/).length <= 4) {
      return { taskType: 'GREETING', confidence: 0.99, entities: {} };
    }

    // ── 2. Historical Stock Performance Ranking (e.g. "top 10 shares in stock market based on high returns over 1 year") ──
    const isRankingQuery =
      lower.includes('top') ||
      lower.includes('best performing') ||
      lower.includes('performed best') ||
      lower.includes('highest return') ||
      lower.includes('lowest return') ||
      lower.includes('worst performing') ||
      lower.includes('performed worst') ||
      lower.includes('rank') ||
      lower.includes('leaders');

    if (
      isRankingQuery &&
      (lower.includes('return') || lower.includes('gain') || lower.includes('share') || lower.includes('stock') || lower.includes('nifty'))
    ) {
      let count = 10;
      const countMatch = lower.match(/(?:top|best|first)\s+([0-9]+)/i);
      if (countMatch && countMatch[1]) {
        count = Math.min(25, Math.max(3, parseInt(countMatch[1], 10)));
      }

      let period: '6M' | '1Y' | '3Y' | '5Y' = '1Y';
      if (lower.includes('6 month') || lower.includes('six month')) period = '6M';
      else if (lower.includes('3 year') || lower.includes('three year')) period = '3Y';
      else if (lower.includes('5 year') || lower.includes('five year')) period = '5Y';

      const order: 'TOP' | 'BOTTOM' = lower.includes('worst') || lower.includes('lowest') ? 'BOTTOM' : 'TOP';

      return {
        taskType: 'HISTORICAL_RANKING',
        confidence: 0.95,
        entities: {
          rankingCount: count,
          rankingPeriod: period,
          rankingOrder: order,
          rankingUniverse: lower.includes('nifty 50') ? 'NIFTY50' : 'NSE_UNIVERSE',
        },
      };
    }

    // ── 3. Multi-Stock or Sector Comparison (e.g. "Compare Suzlon, IRFC and Tata Power") ──
    if (lower.includes('compare') || lower.includes('versus') || lower.includes(' vs ')) {
      // Check if it is a stock switch inquiry first
      if (lower.includes('switch') || lower.includes('replace') || lower.includes('should i switch')) {
        const switchMatch = lower.match(/switch\s+(?:my\s+)?(.+?)\s+(?:shares\s+)?(?:to|for|into)\s+(.+)/i);
        if (switchMatch && switchMatch[1] && switchMatch[2]) {
          return {
            taskType: 'STOCK_SWITCH_COMPARISON',
            confidence: 0.95,
            entities: {
              switchPair: {
                from: switchMatch[1].replace(/shares|stocks|holding/gi, '').trim(),
                to: switchMatch[2].replace(/shares|stocks|holding/gi, '').trim(),
              },
            },
          };
        }
      }

      // Extract list of candidates separated by comma, 'and', 'vs'
      const cleanedAfterCompare = lower
        .replace(/compare|between|the\s+returns\s+of|the\s+performance\s+of|over\s+[0-9]+\s+(?:years|months)/gi, '')
        .trim();

      const candidates = cleanedAfterCompare
        .split(/,|\band\b|\bvs\b|\bversus\b/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2);

      if (candidates.length >= 2) {
        return {
          taskType: 'MULTI_STOCK_COMPARE',
          confidence: 0.9,
          entities: { compareSymbols: candidates.slice(0, 5) },
        };
      }
    }

    // ── 4. News / Why did a stock move / Event Impact (e.g. "Why did Tata Motors fall today?", "Why are banking stocks down?") ──
    if (
      lower.includes('why did') ||
      lower.includes('why is') ||
      lower.includes('why are') ||
      lower.includes('reason for') ||
      lower.includes('news on') ||
      lower.includes('fell today') ||
      lower.includes('down today') ||
      lower.includes('crash today')
    ) {
      const subject = raw
        .replace(/why\s+did|why\s+is|why\s+are|what\s+happened\s+to|news\s+on|fall\s+today|fell\s+today|down\s+today|crash\s+today/gi, '')
        .replace(/[?.,]/g, '')
        .trim();

      return {
        taskType: 'EVENT_NEWS_IMPACT',
        confidence: 0.9,
        entities: { eventStockOrTopic: subject || raw },
      };
    }

    // ── 5. Scenario Stress Testing (e.g. "What happens if NIFTY falls 10%?", "How would a 10% NIFTY decline affect my portfolio?") ──
    const scenarioMatch = lower.match(/nifty\s+(?:falls?|drops?|crash(?:es)?|decline)\s*(?:by\s*)?([0-9]+)%?/i) ||
      lower.match(/([0-9]+)%\s*(?:nifty\s+)?(?:decline|fall|crash|drop)/i) ||
      lower.match(/what\s+if\s+nifty\s+falls?\s+([0-9]+)%?/i);

    if (scenarioMatch) {
      const pct = scenarioMatch[1] ? parseInt(scenarioMatch[1], 10) : 10;
      return {
        taskType: 'PORTFOLIO_STRESS_TEST',
        confidence: 0.95,
        entities: { scenarioShockPct: -Math.abs(pct) },
      };
    }

    // ── 6. Sector and Macroeconomic Analysis (e.g. "crude oil impact on Indian companies", "which sector looks attractive") ──
    if (
      lower.includes('crude') ||
      lower.includes('oil') ||
      lower.includes('usd/inr') ||
      lower.includes('usdinr') ||
      lower.includes('rbi') ||
      lower.includes('inflation') ||
      lower.includes('sector') ||
      lower.includes('macro') ||
      lower.includes('gold and equities')
    ) {
      return {
        taskType: 'SECTOR_MACRO_ANALYSIS',
        confidence: 0.9,
        entities: { macroOrSectorTopic: raw },
      };
    }

    // ── 7. Portfolio Audit / Risks ──
    if (
      lower.includes('my portfolio') ||
      lower.includes('my holdings') ||
      lower.includes('drawdown of my portfolio') ||
      lower.includes('contributed most to my')
    ) {
      return {
        taskType: 'PORTFOLIO_AUDIT',
        confidence: 0.9,
        entities: {},
      };
    }

    // ── 8. Educational & Conceptual Explanations ──
    if (
      lower.includes('explain') ||
      lower.includes('what is rsi') ||
      lower.includes('what is beta') ||
      lower.includes('what is max drawdown') ||
      lower.includes('difference between index fund') ||
      lower.includes('concept') ||
      lower.includes('how does pe ratio work')
    ) {
      return {
        taskType: 'EDUCATIONAL',
        confidence: 0.9,
        entities: { educationalTopic: raw },
      };
    }

    // ── 9. Single Stock Price / Analysis Fallback ──
    const stopWords = [
      'what', 'is', 'the', 'tell', 'me', 'about', 'how', 'price', 'share',
      'stock', 'today', 'live', 'analyze', 'analysis', 'of', 'in', 'outlook',
      'current', 'market', 'give', 'check', 'show', 'rate', 'target', 'quote',
    ];

    const words = raw
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => !stopWords.includes(w.toLowerCase()) && w.length >= 2);

    if (words.length > 0 && words.length <= 4) {
      return {
        taskType: 'SINGLE_STOCK_PRICE',
        confidence: 0.85,
        entities: { singleStockQuery: words.join(' ') },
      };
    }

    return {
      taskType: 'AMBIGUOUS_CLARIFICATION',
      confidence: 0.5,
      entities: {},
    };
  }
}

export const copilotIntentRouter = new CopilotIntentRouter();
