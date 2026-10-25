import { useState } from 'react';
import StockLogo from '../../components/StockLogo';
import { useMutation } from '@tanstack/react-query';
import { stocks, type StockSwitchAnalysis, type StockQuote } from '../../lib/api';
import { formatCurrency, formatPercent } from '../../lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const POPULAR_INDIAN_STOCKS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy / Conglomerate' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Banking & Financials' },
  { symbol: 'INFY.NS', name: 'Infosys Limited', sector: 'IT Services' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Banking' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', sector: 'Automobile' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom' },
  { symbol: 'ITC.NS', name: 'ITC Limited', sector: 'FMCG' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'PSU Bank' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'Infrastructure' },
];

export default function StockSwitchAnalyzer() {
  const [currentSymbol, setCurrentSymbol] = useState('TCS.NS');
  const [targetSymbol, setTargetSymbol] = useState('INFY.NS');
  const [investmentAmount, setInvestmentAmount] = useState<number>(100000);
  const [timeframe, setTimeframe] = useState<'1M' | '6M' | '1Y'>('1Y');

  const {
    mutate: runAnalysis,
    data: analysisResult,
    isPending,
    error,
  } = useMutation({
    mutationFn: () =>
      stocks.compareAndSwitch({
        currentSymbol,
        targetSymbol,
        investmentAmount,
      }),
  });

  const getFilteredTimeline = (timeline: StockSwitchAnalysis['comparison']['timeline']) => {
    if (!timeline || timeline.length === 0) return [];
    if (timeframe === '1M') return timeline.slice(-22);
    if (timeframe === '6M') return timeline.slice(-126);
    return timeline;
  };

  const currentStock = analysisResult?.comparison.currentStock;
  const targetStock = analysisResult?.comparison.targetStock;

  const getBadgeColor = (rec?: StockSwitchAnalysis['recommendation']) => {
    switch (rec) {
      case 'STRONG_SWITCH':
        return 'bg-mint text-black border-black';
      case 'CONSIDER_SWITCH':
        return 'bg-yellow text-black border-black';
      case 'HOLD_CURRENT':
        return 'bg-coral text-white border-black';
      case 'NEUTRAL':
      default:
        return 'bg-blue text-white border-black';
    }
  };

  const getBadgeLabel = (rec?: StockSwitchAnalysis['recommendation']) => {
    switch (rec) {
      case 'STRONG_SWITCH':
        return 'RECOMMENDED SWITCH';
      case 'CONSIDER_SWITCH':
        return 'MODERATELY FAVORABLE';
      case 'HOLD_CURRENT':
        return 'HOLD CURRENT STOCK';
      case 'NEUTRAL':
      default:
        return 'NEUTRAL / BALANCED';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-3xl uppercase tracking-tight">
          Stock Switch &amp; Compare
        </h1>
      </div>

      {/* Input Configuration Card */}
      <div className="neo-card p-6">
        <h2 className="font-heading font-bold text-lg uppercase tracking-tight mb-4">
          Configure Your Stock Switch Plan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Current Stock */}
          <div>
            <label className="font-heading font-bold text-xs uppercase block mb-1">
              1. Current Holding (From)
            </label>
            <input
              type="text"
              className="w-full border-2 border-black p-2.5 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow uppercase"
              placeholder="e.g. TCS.NS or RELIANCE"
              value={currentSymbol}
              onChange={(e) => setCurrentSymbol(e.target.value.toUpperCase())}
            />
            <p className="font-body text-[11px] text-muted-foreground mt-1">
              Defaults to NSE (.NS). e.g. TCS.NS, RELIANCE, HDFCBANK
            </p>
          </div>

          {/* Target Stock */}
          <div>
            <label className="font-heading font-bold text-xs uppercase block mb-1">
              2. Target Switch Company (To)
            </label>
            <input
              type="text"
              className="w-full border-2 border-black p-2.5 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow uppercase"
              placeholder="e.g. INFY.NS or TATAMOTORS"
              value={targetSymbol}
              onChange={(e) => setTargetSymbol(e.target.value.toUpperCase())}
            />
            <p className="font-body text-[11px] text-muted-foreground mt-1">
              Company you are considering switching capital into
            </p>
          </div>

          {/* Capital Amount */}
          <div>
            <label className="font-heading font-bold text-xs uppercase block mb-1">
              3. Capital to Switch (₹)
            </label>
            <input
              type="number"
              min={1000}
              step={5000}
              className="w-full border-2 border-black p-2.5 font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(Number(e.target.value))}
            />
            <p className="font-body text-[11px] text-muted-foreground mt-1">
              Formatted: {formatCurrency(investmentAmount)}
            </p>
          </div>
        </div>

        {/* Quick select pills */}
        <div className="mt-4 pt-4 border-t border-black/10">
          <span className="font-heading font-bold text-xs uppercase block mb-2 text-muted-foreground">
            Popular Nifty 50 Stocks:
          </span>
          <div className="flex flex-wrap gap-2">
            {POPULAR_INDIAN_STOCKS.map((stock) => (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => {
                  if (currentSymbol === stock.symbol) {
                    setTargetSymbol(stock.symbol);
                  } else {
                    setTargetSymbol(stock.symbol);
                  }
                }}
                className="text-xs px-2.5 py-1 bg-white border border-black hover:bg-yellow hover:font-bold transition-all"
              >
                {stock.symbol.replace('.NS', '')} ({stock.name})
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isPending || !currentSymbol || !targetSymbol}
            onClick={() => runAnalysis()}
            className="btn-yellow px-8 py-3 font-heading font-extrabold uppercase text-sm tracking-wide disabled:opacity-50"
          >
            {isPending ? 'Fetching Real-time Market Data…' : 'Analyse Market & Compare Strategy →'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 border-2 border-coral bg-coral/10 text-coral font-body text-sm font-bold">
            {(error as Error).message}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysisResult && currentStock && targetStock && (
        <div className="space-y-6">
          {/* Recommendation Banner */}
          <div className="neo-card p-6 bg-white border-4 border-black">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-black">
              <div>
                <span
                  className={`inline-block px-3 py-1 font-heading font-black text-xs uppercase border-2 mb-2 ${getBadgeColor(
                    analysisResult.recommendation,
                  )}`}
                >
                  {getBadgeLabel(analysisResult.recommendation)}
                </span>
                <h2 className="font-heading font-extrabold text-2xl uppercase">
                  {analysisResult.verdict}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono uppercase text-muted-foreground block">
                  Capital Switch Model
                </span>
                <span className="font-heading font-extrabold text-2xl text-black">
                  {formatCurrency(analysisResult.investmentAmount)}
                </span>
              </div>
            </div>

            {/* Strategic Advice */}
            <div className="mt-4 p-4 bg-yellow/15 border-2 border-black rounded-sm">
              <h3 className="font-heading font-bold text-sm uppercase text-black mb-1 flex items-center gap-2">
                <span>💡 Recommended Execution Strategy:</span>
              </h3>
              <p className="font-body text-sm leading-relaxed text-black font-medium">
                {analysisResult.strategy}
              </p>
            </div>

            {/* Key Reasoning Points */}
            <div className="mt-4">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Market Evidence & Data Drivers:
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analysisResult.reasonings.map((point, idx) => (
                  <li
                    key={idx}
                    className="p-3 bg-muted/40 border border-black/20 text-xs font-body font-medium rounded-sm flex items-start gap-2"
                  >
                    <span className="font-bold text-black font-mono">0{idx + 1}.</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Real-time Side-by-Side Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Stock */}
            <div className="neo-card p-6 bg-white border-2 border-black">
              <div className="flex items-start justify-between pb-3 border-b border-black/10">
                <div className="flex items-start gap-3">
                  <StockLogo ticker={currentStock.symbol} name={currentStock.name} size="md" className="mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                      Current Position ({currentStock.exchange})
                    </span>
                    <h3 className="font-heading font-extrabold text-xl">{currentStock.name}</h3>
                    <p className="font-mono text-xs font-bold text-black">{currentStock.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-heading font-extrabold text-2xl">
                    ₹{currentStock.currentPrice.toLocaleString('en-IN')}
                  </div>
                  <div
                    className={`font-mono text-xs font-bold ${
                      currentStock.change >= 0 ? 'text-mint-darker' : 'text-coral'
                    }`}
                  >
                    {currentStock.change >= 0 ? '+' : ''}
                    {currentStock.change} ({formatPercent(currentStock.changePercent)})
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-body">
                <div className="p-2.5 bg-muted/30 border border-black/10 rounded-sm">
                  <span className="text-muted-foreground block">1-Year Return</span>
                  <span
                    className={`font-heading font-bold text-sm ${
                      currentStock.oneYearReturn >= 0 ? 'text-black' : 'text-coral'
                    }`}
                  >
                    {formatPercent(currentStock.oneYearReturn)}
                  </span>
                </div>
                <div className="p-2.5 bg-muted/30 border border-black/10 rounded-sm">
                  <span className="text-muted-foreground block">6-Month Momentum</span>
                  <span
                    className={`font-heading font-bold text-sm ${
                      currentStock.sixMonthReturn >= 0 ? 'text-black' : 'text-coral'
                    }`}
                  >
                    {formatPercent(currentStock.sixMonthReturn)}
                  </span>
                </div>
                <div className="p-2.5 bg-muted/30 border border-black/10 rounded-sm">
                  <span className="text-muted-foreground block">52-Week Range</span>
                  <span className="font-heading font-bold text-xs">
                    ₹{currentStock.fiftyTwoWeekLow} – ₹{currentStock.fiftyTwoWeekHigh}
                  </span>
                </div>
                <div className="p-2.5 bg-muted/30 border border-black/10 rounded-sm">
                  <span className="text-muted-foreground block">Annual Volatility</span>
                  <span className="font-heading font-bold text-xs">
                    {currentStock.volatility}%
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">Shares equivalent:</span>
                <span className="font-heading font-bold">
                  {analysisResult.comparison.currentUnits} Shares
                </span>
              </div>
            </div>

            {/* Target Stock */}
            <div className="neo-card p-6 bg-yellow/10 border-2 border-black">
              <div className="flex items-start justify-between pb-3 border-b border-black/10">
                <div className="flex items-start gap-3">
                  <StockLogo ticker={targetStock.symbol} name={targetStock.name} size="md" className="mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                      Target Position ({targetStock.exchange})
                    </span>
                    <h3 className="font-heading font-extrabold text-xl">{targetStock.name}</h3>
                    <p className="font-mono text-xs font-bold text-black">{targetStock.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-heading font-extrabold text-2xl">
                    ₹{targetStock.currentPrice.toLocaleString('en-IN')}
                  </div>
                  <div
                    className={`font-mono text-xs font-bold ${
                      targetStock.change >= 0 ? 'text-mint-darker' : 'text-coral'
                    }`}
                  >
                    {targetStock.change >= 0 ? '+' : ''}
                    {targetStock.change} ({formatPercent(targetStock.changePercent)})
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-body">
                <div className="p-2.5 bg-white border border-black/10 rounded-sm">
                  <span className="text-muted-foreground block">1-Year Return</span>
                  <span
                    className={`font-heading font-bold text-sm ${
                      targetStock.oneYearReturn >= 0 ? 'text-black' : 'text-coral'
                    }`}
                  >
                    {formatPercent(targetStock.oneYearReturn)}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-black/10 rounded-sm">
                  <span className="text-muted-foreground block">6-Month Momentum</span>
                  <span
                    className={`font-heading font-bold text-sm ${
                      targetStock.sixMonthReturn >= 0 ? 'text-black' : 'text-coral'
                    }`}
                  >
                    {formatPercent(targetStock.sixMonthReturn)}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-black/10 rounded-sm">
                  <span className="text-muted-foreground block">52-Week Range</span>
                  <span className="font-heading font-bold text-xs">
                    ₹{targetStock.fiftyTwoWeekLow} – ₹{targetStock.fiftyTwoWeekHigh}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-black/10 rounded-sm">
                  <span className="text-muted-foreground block">Annual Volatility</span>
                  <span className="font-heading font-bold text-xs">
                    {targetStock.volatility}%
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">Shares equivalent:</span>
                <span className="font-heading font-bold text-black">
                  {analysisResult.comparison.targetUnits} Shares
                </span>
              </div>
            </div>
          </div>

          {/* Historical Performance Chart */}
          <div className="neo-card p-6 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-heading font-bold text-lg uppercase tracking-tight">
                  Normalized Historical Price Trajectory (Indexed to 100)
                </h3>
                <p className="font-body text-xs text-muted-foreground">
                  Compares cumulative growth performance across both stocks directly over time
                </p>
              </div>

              <div className="flex gap-2">
                {(['1M', '6M', '1Y'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeframe(t)}
                    className={`px-3 py-1 font-mono text-xs border border-black ${
                      timeframe === t ? 'bg-yellow font-bold shadow-neo-xs' : 'bg-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getFilteredTimeline(analysisResult.comparison.timeline)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(v: number) => `${v.toFixed(0)}`}
                  />
                  <Tooltip
                    formatter={(val: number, name: string) => [
                      `${val.toFixed(2)} pts`,
                      name === 'currentNormalized' ? currentStock.symbol : targetStock.symbol,
                    ]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend
                    formatter={(val) =>
                      val === 'currentNormalized'
                        ? `${currentStock.symbol} (Base 100)`
                        : `${targetStock.symbol} (Base 100)`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="currentNormalized"
                    stroke="#1E40AF"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="targetNormalized"
                    stroke="#16A34A"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
