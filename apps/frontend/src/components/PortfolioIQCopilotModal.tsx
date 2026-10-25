import { useState, useRef, useEffect } from 'react';
import { copilot, type CopilotChatResponse } from '../lib/api';
import { getStoredPortfolioId } from '../lib/useActivePortfolio';
import { formatCurrency, formatPercent } from '../lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  summaryPoints?: string[];
  detailedAnalysis?: CopilotChatResponse['detailedAnalysis'];
  recommendedPrompts?: string[];
  timestamp: string;
}

const INITIAL_PROMPTS = [
  'What is Suzlon current price?',
  'Analyze IRFC',
  'Should I switch HDFC Bank to ICICI Bank?',
  'What happens to my portfolio if NIFTY falls 10%?',
  'Which sector looks attractive now?',
];

export default function PortfolioIQCopilotModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAnalysisMap, setShowAnalysisMap] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      summaryPoints: [
        '**PortfolioIQ Financial Intelligence Engine Active**: Real-time market quotes, quantitative analytics, and actual portfolio stress testing.',
        '**Verified Architecture**: Deterministic RSI, drawdowns, and beta modeling using authorized market data feeds.',
        '**Ask any decision**: Test single stock quotes (*"What is Suzlon current price?"*), compare switches (*"Should I switch HDFC Bank to ICICI Bank?"*), or assess crashes (*"What happens if NIFTY falls 10%?"*).',
      ],
      recommendedPrompts: INITIAL_PROMPTS,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      summaryPoints: [textToSend],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput('');
    setLoading(true);

    try {
      const activePortId = getStoredPortfolioId() || undefined;
      const res = await copilot.chat({
        message: textToSend,
        portfolioId: activePortId,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        summaryPoints: res.summaryPoints,
        detailedAnalysis: res.detailedAnalysis,
        recommendedPrompts: res.recommendedPrompts,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        sender: 'assistant',
        summaryPoints: [
          '⚠️ **Service Unavailable**: Unable to connect to the PortfolioIQ market data server.',
          'Please ensure the backend service is running and configured with live market access.',
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const toggleAnalysis = (msgId: string) => {
    setShowAnalysisMap((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[90vh] max-h-[820px] bg-white border-3 border-black shadow-neo-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-yellow border-b-3 border-black px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black text-yellow flex items-center justify-center border-2 border-black font-mono font-black text-xs shadow-neo-xs">
              IQ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-black text-base uppercase tracking-tight text-black">
                  PortfolioIQ Copilot
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 border border-emerald-600 text-emerald-900 font-mono text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live Market Feeds
                </span>
              </div>
              <p className="font-mono text-[10px] text-black/70 font-bold uppercase tracking-wider">
                NSE/BSE Real-Time Data • Quantitative Analytics • Portfolio Shock Lab
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 bg-white hover:bg-black hover:text-white text-black border-2 border-black font-mono font-black text-sm flex items-center justify-center transition-colors shadow-neo-xs"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#FAF8F5]">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            const showAnalysis = showAnalysisMap[m.id];
            const analysis = m.detailedAnalysis;

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[94%] sm:max-w-[85%] p-4 border-2 border-black shadow-neo-xs leading-relaxed text-xs md:text-sm ${
                    isUser
                      ? 'bg-yellow text-black font-bold'
                      : 'bg-white text-black'
                  }`}
                >
                  {/* Summary Bullets */}
                  <div className="space-y-2">
                    {m.summaryPoints?.map((pt, idx) => {
                      // Render Markdown bold highlights cleanly
                      const parts = pt.split(/(\*\*.*?\*\*|\`.*?\`)/g);
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          {!isUser && <span className="text-black font-black mt-0.5">•</span>}
                          <div>
                            {parts.map((part, pIdx) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return (
                                  <strong key={pIdx} className="font-black text-black">
                                    {part.slice(2, -2)}
                                  </strong>
                                );
                              }
                              if (part.startsWith('`') && part.endsWith('`')) {
                                return (
                                  <code
                                    key={pIdx}
                                    className="px-1 py-0.5 bg-black/10 font-mono text-xs font-bold"
                                  >
                                    {part.slice(1, -1)}
                                  </code>
                                );
                              }
                              return <span key={pIdx}>{part}</span>;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Show Analysis Toggle */}
                  {analysis && (
                    <div className="mt-3 pt-3 border-t-2 border-black/10">
                      <button
                        type="button"
                        onClick={() => toggleAnalysis(m.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow/20 hover:bg-yellow border border-black font-mono text-[11px] font-black uppercase tracking-wider transition-colors"
                      >
                        <span>{showAnalysis ? '▲ Hide Analysis & Math' : '▼ Show Analysis & Verified Data'}</span>
                        <span className="text-[9px] bg-black text-white px-1 py-0.2">
                          {analysis.freshnessLabel}
                        </span>
                      </button>

                      {/* Expandable Analysis Drawer */}
                      {showAnalysis && (
                        <div className="mt-3 p-3 bg-muted/30 border border-black text-xs font-mono space-y-3 animate-in fade-in duration-150">
                          {/* Stock Quote & Technicals Breakdown */}
                          {analysis.type === 'STOCK_QUOTE' && analysis.quote && (
                            <div>
                              <div className="flex items-center justify-between pb-1 mb-2 border-b border-black/20">
                                <span className="font-bold text-black uppercase">
                                  {analysis.quote.name} ({analysis.quote.symbol})
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {analysis.quote.exchange} • {analysis.quote.currency}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                <div className="bg-white p-2 border border-black/40">
                                  <span className="block text-[9px] uppercase text-muted-foreground">Live Price</span>
                                  <span className="font-bold text-sm">₹{analysis.quote.price}</span>
                                </div>
                                <div className="bg-white p-2 border border-black/40">
                                  <span className="block text-[9px] uppercase text-muted-foreground">14-Day RSI</span>
                                  <span className="font-bold text-sm">{analysis.technicals?.rsi14 ?? 'N/A'}</span>
                                </div>
                                <div className="bg-white p-2 border border-black/40">
                                  <span className="block text-[9px] uppercase text-muted-foreground">Ann. Volatility</span>
                                  <span className="font-bold text-sm">{analysis.technicals?.annualizedVolatilityPct}%</span>
                                </div>
                                <div className="bg-white p-2 border border-black/40">
                                  <span className="block text-[9px] uppercase text-muted-foreground">1Y Max Drawdown</span>
                                  <span className="font-bold text-sm text-red-600">-{analysis.technicals?.maxDrawdownPct}%</span>
                                </div>
                              </div>

                              {/* Interactive Historical Closes Chart */}
                              {analysis.quote.historicalCloses.length > 0 && (
                                <div className="h-36 w-full bg-white p-2 border border-black/40">
                                  <p className="text-[9px] uppercase font-bold text-black/60 mb-1">
                                    Historical Price Trajectory (1-Year Closes)
                                  </p>
                                  <ResponsiveContainer width="100%" height="85%">
                                    <LineChart data={analysis.quote.historicalCloses.slice(-60)}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                                      <XAxis dataKey="date" hide />
                                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9 }} width={45} />
                                      <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', fontSize: 10 }}
                                        formatter={(val: any) => [`₹${val}`, 'Close Price']}
                                      />
                                      <Line type="monotone" dataKey="price" stroke="#000" strokeWidth={2} dot={false} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Stock Switch Comparison Table */}
                          {analysis.type === 'STOCK_SWITCH' && analysis.switchComparison && (
                            <div>
                              <div className="font-bold uppercase mb-2 pb-1 border-b border-black/20">
                                Quantified Rebalancing Analysis
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="border-b border-black">
                                      <th className="py-1">Metric</th>
                                      <th className="py-1">{analysis.switchComparison.currentStock.symbol} (Current)</th>
                                      <th className="py-1">{analysis.switchComparison.targetStock.symbol} (Target)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-black/10">
                                    <tr>
                                      <td className="py-1 text-muted-foreground">1-Year Return</td>
                                      <td className="py-1 font-bold">{analysis.switchComparison.currentStock.oneYearReturnPct}%</td>
                                      <td className="py-1 font-bold text-emerald-700">{analysis.switchComparison.targetStock.oneYearReturnPct}%</td>
                                    </tr>
                                    <tr>
                                      <td className="py-1 text-muted-foreground">Annualized Volatility</td>
                                      <td className="py-1">{analysis.switchComparison.currentStock.annualizedVolatilityPct}%</td>
                                      <td className="py-1">{analysis.switchComparison.targetStock.annualizedVolatilityPct}%</td>
                                    </tr>
                                    <tr>
                                      <td className="py-1 text-muted-foreground">Max Drawdown</td>
                                      <td className="py-1 text-red-600">-{analysis.switchComparison.currentStock.maxDrawdownPct}%</td>
                                      <td className="py-1 text-red-600">-{analysis.switchComparison.targetStock.maxDrawdownPct}%</td>
                                    </tr>
                                    <tr>
                                      <td className="py-1 text-muted-foreground">14-Day RSI</td>
                                      <td className="py-1">{analysis.switchComparison.currentStock.rsi14 ?? 'N/A'}</td>
                                      <td className="py-1">{analysis.switchComparison.targetStock.rsi14 ?? 'N/A'}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-2 text-[10px] text-muted-foreground">
                                Cross-Asset Correlation: <strong>{analysis.switchComparison.historicalCorrelation}</strong>
                              </div>
                            </div>
                          )}

                          {/* Scenario Simulation Breakdown */}
                          {analysis.type === 'SCENARIO_SIMULATION' && analysis.simulation && (
                            <div>
                              <div className="font-bold uppercase mb-2 pb-1 border-b border-black/20">
                                Holding Stress-Test Contribution
                              </div>
                              <div className="space-y-1.5">
                                {analysis.simulation.holdingBreakdown.map((h: any) => (
                                  <div key={h.id} className="flex items-center justify-between bg-white p-1.5 border border-black/20 text-[11px]">
                                    <div>
                                      <span className="font-bold">{h.name}</span>
                                      <span className="text-[9px] text-muted-foreground ml-1.5">
                                        (Beta: {h.sensitivityApplied} • {h.rationale})
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-bold text-red-600">₹{h.delta.toLocaleString('en-IN')}</span>
                                      <span className="block text-[9px] text-muted-foreground">₹{h.shockedValue.toLocaleString('en-IN')}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Historical Universe Ranking Table */}
                          {analysis.type === 'HISTORICAL_RANKING' && (analysis as any).rankingResult && (
                            <div>
                              <div className="flex items-center justify-between pb-1 mb-2 border-b border-black/20">
                                <span className="font-bold text-black uppercase">
                                  {(analysis as any).rankingResult.periodLabel} Return Rankings
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {(analysis as any).rankingResult.coverageNote}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="border-b border-black bg-yellow/20">
                                      <th className="py-1 px-1.5">#</th>
                                      <th className="py-1 px-1.5">Security</th>
                                      <th className="py-1 px-1.5">Start Price</th>
                                      <th className="py-1 px-1.5">Current Price</th>
                                      <th className="py-1 px-1.5 text-right">Return (%)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-black/10">
                                    {(analysis as any).rankingResult.items.map((it: any) => (
                                      <tr key={it.symbol} className="hover:bg-white/60">
                                        <td className="py-1 px-1.5 font-mono font-bold">{it.rank}</td>
                                        <td className="py-1 px-1.5 font-bold">
                                          {it.name} <span className="text-muted-foreground font-mono text-[9px]">({it.symbol})</span>
                                        </td>
                                        <td className="py-1 px-1.5 font-mono">₹{it.startingPrice}</td>
                                        <td className="py-1 px-1.5 font-mono font-bold">₹{it.currentPrice}</td>
                                        <td className={`py-1 px-1.5 font-mono font-black text-right ${it.returnPct >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                          {it.returnPct >= 0 ? '+' : ''}{it.returnPct}%
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Multi-Stock Compare Table */}
                          {analysis.type === 'MULTI_COMPARE' && (analysis as any).multiCompareResult && (
                            <div>
                              <div className="font-bold uppercase mb-2 pb-1 border-b border-black/20">
                                Multi-Asset Trajectory Comparison
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="border-b border-black bg-yellow/20">
                                      <th className="py-1 px-1.5">Asset</th>
                                      <th className="py-1 px-1.5">Price</th>
                                      <th className="py-1 px-1.5">1-Year Trailing Return</th>
                                      <th className="py-1 px-1.5 text-right">Ann. Volatility</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-black/10">
                                    {(analysis as any).multiCompareResult.map((st: any) => (
                                      <tr key={st.symbol} className="hover:bg-white/60">
                                        <td className="py-1 px-1.5 font-bold">
                                          {st.name} <span className="text-muted-foreground font-mono text-[9px]">({st.symbol})</span>
                                        </td>
                                        <td className="py-1 px-1.5 font-mono font-bold">₹{st.price}</td>
                                        <td className={`py-1 px-1.5 font-mono font-black ${st.returnPct >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                          {st.returnPct >= 0 ? '+' : ''}{st.returnPct}%
                                        </td>
                                        <td className="py-1 px-1.5 font-mono text-right">{st.volatilityPct}%</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Assumptions & Integrity Sources */}
                          <div className="pt-2 border-t border-black/20 text-[10px] text-muted-foreground space-y-1">
                            <div>
                              <strong className="text-black uppercase">Data Sources:</strong>{' '}
                              {analysis.sources.join(', ')}
                            </div>
                            <div>
                              <strong className="text-black uppercase">Timestamp / As Of:</strong>{' '}
                              {new Date(analysis.asOf).toLocaleString()}
                            </div>
                            {analysis.assumptions && analysis.assumptions.length > 0 && (
                              <div>
                                <strong className="text-black uppercase">Assumptions:</strong>
                                <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                                  {analysis.assumptions.map((asm, aIdx) => (
                                    <li key={aIdx}>{asm}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span className="font-mono text-[9px] text-muted-foreground mt-1 px-1 font-bold">
                  {m.timestamp}
                </span>

                {/* Suggested Follow-up Prompts */}
                {!isUser && m.recommendedPrompts && m.recommendedPrompts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                    {m.recommendedPrompts.map((p, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleSend(p)}
                        className="px-2 py-1 bg-white hover:bg-yellow border border-black font-mono text-[10px] font-bold transition-colors shadow-neo-xs text-left"
                      >
                        {p} →
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex flex-col items-start">
              <div className="p-3 bg-white border-2 border-black shadow-neo-xs flex items-center gap-2.5 font-mono text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow border border-black animate-ping" />
                <span className="font-bold">Fetching verified market data &amp; running quantitative models…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Input Form */}
        <div className="p-3 bg-white border-t-3 border-black">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about any stock (Suzlon, IRFC), compare switches, or test NIFTY crash..."
              className="flex-1 px-3 py-2.5 border-2 border-black font-body text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-yellow shadow-neo-xs"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 bg-yellow hover:bg-black hover:text-white border-2 border-black font-mono font-black text-xs md:text-sm uppercase tracking-wider transition-colors disabled:opacity-50 shadow-neo-xs"
            >
              Analyze
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
