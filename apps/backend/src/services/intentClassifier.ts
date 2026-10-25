/**
 * Intent Classifier for PortfolioIQ Copilot
 * Accurately categorizes queries before making API calls or executing financial tools.
 */
export type CopilotIntent =
  | 'GREETING'
  | 'SINGLE_STOCK_PRICE'
  | 'STOCK_SWITCH_COMPARISON'
  | 'PORTFOLIO_STRESS_TEST'
  | 'SECTOR_MACRO_ANALYSIS'
  | 'PORTFOLIO_AUDIT'
  | 'GENERAL_INVESTMENT_EDUCATION'
  | 'AMBIGUOUS_CLARIFICATION'
  | 'UNSUPPORTED';

export interface ClassifiedIntent {
  intent: CopilotIntent;
  confidence: number;
  extractedEntities: {
    singleStockQuery?: string;
    switchPair?: { from: string; to: string };
    scenarioShockPct?: number;
    sectorOrMacroTerm?: string;
  };
}

const GREETING_PATTERNS = [
  /^(hi|hii|hiii|hello|hey|heyy|greetings|good\s+(morning|afternoon|evening)|namaste)\b/i,
  /^who\s+are\s+you\b/i,
  /^what\s+can\s+you\s+do\b/i,
  /^help\b/i,
];

const STOCK_SWITCH_PATTERNS = [
  /switch\s+(?:my\s+)?(.+?)\s+(?:shares\s+)?(?:to|for|into)\s+(.+)/i,
  /replace\s+(.+?)\s+with\s+(.+)/i,
  /compare\s+(.+?)\s+(?:and|with|to)\s+(.+)/i,
  /should\s+i\s+(?:sell|switch)\s+(.+?)\s+(?:and|to)\s+buy\s+(.+)/i,
];

const SCENARIO_STRESS_PATTERNS = [
  /what\s+happens\s+(?:to\s+my\s+portfolio\s+)?if\s+nifty\s+falls\s+([0-9]+)%?/i,
  /nifty\s+(?:crash|falls|drops|correction)\s+([0-9]+)%?/i,
  /simulate\s+([0-9]+)%\s+crash/i,
  /stress\s+test/i,
  /if\s+market\s+(?:falls|crashes|drops)/i,
];

const SECTOR_MACRO_PATTERNS = [
  /which\s+sector/i,
  /sector\s+(?:outlook|attractive|performance|rotation)/i,
  /brent\s+crude/i,
  /crude\s+oil/i,
  /usd\s*\/?\s*inr/i,
  /rbi\s+(?:policy|rate)/i,
  /macro\s+(?:outlook|backdrop|environment)/i,
  /gold\s+(?:rates|price)/i,
];

const PORTFOLIO_PATTERNS = [
  /my\s+portfolio/i,
  /my\s+holdings/i,
  /analyze\s+my\s+portfolio/i,
  /portfolio\s+risk/i,
  /portfolio\s+concentration/i,
];

export class IntentClassifier {
  public classify(rawQuery: string): ClassifiedIntent {
    const text = rawQuery.trim();
    const lower = text.toLowerCase();

    // 1. Strict Greeting Check
    for (const pat of GREETING_PATTERNS) {
      if (pat.test(lower)) {
        // If it's a short greeting like "hii", "hello", return GREETING immediately
        if (text.split(/\s+/).length <= 4) {
          return { intent: 'GREETING', confidence: 0.99, extractedEntities: {} };
        }
      }
    }

    // 2. Stock Switch Comparison
    for (const pat of STOCK_SWITCH_PATTERNS) {
      const match = text.match(pat);
      if (match && match[1] && match[2]) {
        const from = match[1].replace(/shares|stocks|holding/gi, '').trim();
        const to = match[2].replace(/shares|stocks|holding/gi, '').trim();
        return {
          intent: 'STOCK_SWITCH_COMPARISON',
          confidence: 0.95,
          extractedEntities: { switchPair: { from, to } },
        };
      }
    }

    // Heuristic switch pair check (e.g. "HDFC Bank to ICICI Bank")
    if (lower.includes('switch') || lower.includes('compare')) {
      if (lower.includes('hdfc') && lower.includes('icici')) {
        return {
          intent: 'STOCK_SWITCH_COMPARISON',
          confidence: 0.9,
          extractedEntities: { switchPair: { from: 'HDFC Bank', to: 'ICICI Bank' } },
        };
      }
      if (lower.includes('tcs') && lower.includes('infy')) {
        return {
          intent: 'STOCK_SWITCH_COMPARISON',
          confidence: 0.9,
          extractedEntities: { switchPair: { from: 'TCS', to: 'Infosys' } },
        };
      }
    }

    // 3. Scenario / Market Crash Stress Testing
    for (const pat of SCENARIO_STRESS_PATTERNS) {
      const match = text.match(pat);
      if (match) {
        const shockNum = match[1] ? parseInt(match[1], 10) : 10;
        return {
          intent: 'PORTFOLIO_STRESS_TEST',
          confidence: 0.95,
          extractedEntities: { scenarioShockPct: -Math.abs(shockNum) },
        };
      }
    }

    // 4. Sector & Macroeconomic Analysis
    for (const pat of SECTOR_MACRO_PATTERNS) {
      if (pat.test(lower)) {
        return {
          intent: 'SECTOR_MACRO_ANALYSIS',
          confidence: 0.9,
          extractedEntities: { sectorOrMacroTerm: text },
        };
      }
    }

    // 5. Portfolio Audit
    for (const pat of PORTFOLIO_PATTERNS) {
      if (pat.test(lower)) {
        return {
          intent: 'PORTFOLIO_AUDIT',
          confidence: 0.9,
          extractedEntities: {},
        };
      }
    }

    // 6. Single Stock Price / Analysis
    const stopWords = [
      'what', 'is', 'the', 'tell', 'me', 'about', 'how', 'price', 'share',
      'stock', 'today', 'live', 'analyze', 'analysis', 'of', 'in', 'outlook',
      'current', 'market', 'give', 'check', 'show', 'rate', 'target', 'quote',
    ];

    const words = text
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => !stopWords.includes(w.toLowerCase()) && w.length >= 2);

    if (words.length > 0 && words.length <= 4) {
      return {
        intent: 'SINGLE_STOCK_PRICE',
        confidence: 0.85,
        extractedEntities: { singleStockQuery: words.join(' ') },
      };
    }

    // 7. General Education / Guidance
    if (lower.includes('what is rsi') || lower.includes('what is pe') || lower.includes('explain volatility')) {
      return {
        intent: 'GENERAL_INVESTMENT_EDUCATION',
        confidence: 0.85,
        extractedEntities: {},
      };
    }

    return {
      intent: 'AMBIGUOUS_CLARIFICATION',
      confidence: 0.5,
      extractedEntities: {},
    };
  }
}

export const intentClassifier = new IntentClassifier();
