import { useState, useEffect } from 'react';
import StockLogo from '../../components/StockLogo';
import { useQuery } from '@tanstack/react-query';
import { butterfly, portfolios, type ButterflyAnalysisResult, type CausalNode } from '../../lib/api';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { getStoredPortfolioId, setStoredPortfolioId, resolveActivePortfolio } from '../../lib/useActivePortfolio';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '../../lib/utils';

type Tab = 'overview' | 'holdings' | 'dependency' | 'sectors' | 'explainability';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',       label: 'Impact Summary',      icon: '⚡' },
  { id: 'holdings',       label: 'Holdings Impact',     icon: '📊' },
  { id: 'dependency',     label: 'Causal Chain',         icon: '🔗' },
  { id: 'sectors',        label: 'Sector Exposure',     icon: '🏭' },
  { id: 'explainability', label: 'Analysis Logic',       icon: '🧠' },
];

export default function ButterflyEffectEngine() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedNode, setSelectedNode] = useState<CausalNode | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(() => getStoredPortfolioId());
  const [showRiskSignals, setShowRiskSignals] = useState(false);

  const { data: userPortfoliosData } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfolios.list(),
  });

  const portfolioList = (userPortfoliosData?.portfolios ?? []) as Array<{ id: string; name: string; currency: string }>;
  const activePortfolio = portfolioList.find(p => p.id === selectedPortfolioId) ?? resolveActivePortfolio(portfolioList);

  useEffect(() => {
    if (activePortfolio && activePortfolio.id !== selectedPortfolioId) {
      setSelectedPortfolioId(activePortfolio.id);
      setStoredPortfolioId(activePortfolio.id);
    }
  }, [activePortfolio, selectedPortfolioId]);

  const {
    data: analysisResponse,
    isLoading: isAnalyzing,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['butterfly', 'realtime-analysis', activePortfolio?.id],
    queryFn: () => butterfly.getRealtimeAnalysis(activePortfolio?.id),
    refetchInterval: 60000,
  });

  const result = analysisResponse?.result;
  const baselines = result?.macroBaseline;
  const activeRisks = result?.activeRealtimeRisks || [];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-black text-3xl uppercase tracking-tight">
            Market Nexus
          </h1>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            Portfolio Evaluated: <span className="font-bold text-black uppercase">{activePortfolio?.name ?? 'Your Portfolio'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {portfolioList.length > 1 && (
            <div className="flex gap-1.5 p-1 bg-muted/40 border-2 border-black">
              {portfolioList.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPortfolioId(p.id);
                    setStoredPortfolioId(p.id);
                  }}
                  className={`px-3 py-1 border border-black font-heading font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all shadow-neo-xs ${
                    activePortfolio?.id === p.id ? 'bg-yellow text-black font-extrabold' : 'bg-white hover:bg-yellow/30 text-black/70'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isAnalyzing || isRefetching}
            className="btn-yellow px-4 py-2 font-mono text-xs uppercase font-bold flex items-center gap-1.5 shadow-neo-sm hover:shadow-neo transition-all"
          >
            {isRefetching ? '↻ Refreshing…' : '↻ Refresh Risks'}
          </button>
        </div>
      </div>

      {/* ── Live Macro Barometer ── */}
      <div className="neo-card p-5 bg-white">
        <div className="flex items-center justify-between mb-3 border-b border-black/10 pb-2">
          <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-black flex items-center gap-2">
            🌐 Live Geopolitical &amp; Macro Risk Indicators (Auto-Captured)
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground">NSE &amp; Global Commodity Desk Feeds</span>
        </div>

        {isAnalyzing ? (
          <div className="py-6 text-center text-xs font-mono text-muted-foreground animate-pulse">
            Analyzing real-time market data across global sectors…
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {baselines &&
              Object.values(baselines).map((b) => (
                <div key={b.symbol} className="p-3 bg-muted/30 border border-black/15 rounded-sm">
                  <div className="text-[10px] font-mono text-muted-foreground truncate uppercase font-bold">
                    {b.name.split('(')[0]}
                  </div>
                  <div className="font-heading font-extrabold text-base mt-0.5">
                    {b.unit === 'INR/USD'
                      ? `₹${b.latestPrice}`
                      : b.unit === 'USD/bbl' || b.unit === 'USD/t.oz'
                      ? `$${b.latestPrice}`
                      : b.latestPrice.toLocaleString('en-IN')}
                    <span className="text-[10px] font-mono font-normal ml-1 text-muted-foreground">{b.unit}</span>
                  </div>
                  <div className={`text-[11px] font-mono font-bold mt-0.5 ${b.change >= 0 ? 'text-mint-darker' : 'text-coral'}`}>
                    {b.change >= 0 ? '+' : ''}{b.change} ({formatPercent(b.changePercent)})
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Active Risk Signals (Minimal Collapsible Pill/Banner) ── */}
      {activeRisks.length > 0 && (
        <div className="neo-card p-3 bg-yellow/10 border-2 border-black transition-all">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-xs uppercase tracking-wide text-black flex items-center gap-1.5">
                <span>⚡ Real-Time Geopolitical &amp; Market Transmission Signals</span>
              </span>
              <span className="px-2 py-0.5 bg-black text-yellow text-[10px] font-mono font-bold rounded-xs">
                {activeRisks.length} active
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowRiskSignals((prev) => !prev)}
              className="px-2.5 py-1 text-xs font-mono font-bold border border-black bg-white hover:bg-yellow shadow-neo-xs flex items-center gap-1.5 transition-all"
            >
              <span>{showRiskSignals ? 'Hide Signals ▲' : 'View Signals ▼'}</span>
            </button>
          </div>

          {showRiskSignals && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 pt-3 border-t border-black/15 animate-in fade-in duration-200">
              {activeRisks.map((risk, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white border border-black/20 text-xs font-body font-medium rounded-sm flex items-start gap-2 shadow-neo-xs"
                >
                  <span className="font-bold text-black font-mono">0{idx + 1}.</span>
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 border-2 border-coral bg-coral/10 text-coral text-xs font-bold font-mono">
          Error retrieving live market risk analysis: {(error as Error).message}
        </div>
      )}

      {/* ── Tab Navigation ── */}
      {result && (
        <div className="space-y-0">
          {/* Tab Bar */}
          <div className="flex flex-wrap gap-2 border-b-2 border-black pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setSelectedNode(null); }}
                className={cn(
                  'px-4 py-2.5 font-heading font-bold text-xs uppercase tracking-wide border-2 border-b-0 transition-all',
                  activeTab === tab.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black/40 hover:border-black hover:bg-yellow/20',
                )}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Impact Summary ── */}
          {activeTab === 'overview' && (
            <div className="neo-card p-6 bg-white border-t-0 border-4 border-black">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-black">
                <div>
                  <div className="inline-block px-2.5 py-0.5 bg-black text-white text-[10px] font-mono font-bold uppercase mb-1.5 tracking-wider">
                    Macro Shock Sensitivity Analysis
                  </div>
                  <p className="font-mono text-xs font-semibold text-black/85 max-w-2xl leading-relaxed">
                    {result.explainability.conclusion}
                  </p>
                  <p className="font-body text-[11px] text-muted-foreground mt-1">
                    Time Horizon: <span className="font-bold text-black">{result.timeHorizon}</span>{' '}
                    • Model Confidence: <span className="font-bold text-black">{result.explainability.statisticalConfidenceScore}%</span>
                  </p>
                </div>

                <div className="bg-muted/30 border-2 border-black p-4 text-right shrink-0">
                  <span className="text-[10px] font-mono uppercase block text-muted-foreground">Net Portfolio Impact</span>
                  <span className={`font-heading font-black text-3xl ${result.portfolioSummary.netMonetaryImpact >= 0 ? 'text-black' : 'text-coral'}`}>
                    {result.portfolioSummary.netMonetaryImpact >= 0 ? '+₹' : '-₹'}
                    {Math.abs(result.portfolioSummary.netMonetaryImpact).toLocaleString('en-IN')}
                  </span>
                  <span className={`block font-mono text-xs font-extrabold ${result.portfolioSummary.netPercentageImpact >= 0 ? 'text-mint-darker' : 'text-coral'}`}>
                    ({formatPercent(result.portfolioSummary.netPercentageImpact)})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs font-body">
                <div className="p-3 bg-muted/40 border border-black/15 rounded-sm">
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">Adverse Case (Stress)</span>
                  <span className="font-heading font-extrabold text-base text-coral">
                    -₹{result.portfolioSummary.adverseCaseLoss.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-muted/40 border border-black/15 rounded-sm">
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">Best Case (Upside)</span>
                  <span className="font-heading font-extrabold text-base text-mint-darker">
                    +₹{result.portfolioSummary.bestCaseGain.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-3 bg-muted/40 border border-black/15 rounded-sm">
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">Primary Risk Holding</span>
                  <span className="font-heading font-bold text-xs text-black block truncate">
                    {result.portfolioSummary.topRiskContributor}
                  </span>
                </div>
                <div className="p-3 bg-muted/40 border border-black/15 rounded-sm">
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">Natural Offset / Hedge</span>
                  <span className="font-heading font-bold text-xs text-black block truncate">
                    {result.portfolioSummary.hedgingBenefit}
                  </span>
                </div>
              </div>

              {result.portfolioSummary.concentrationWarning && (
                <div className="mt-4 p-3 bg-yellow/30 border-2 border-black text-xs font-bold text-black flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{result.portfolioSummary.concentrationWarning}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Causal Chain ── */}
          {activeTab === 'dependency' && (
            <div className="neo-card p-6 bg-white border-t-0 border-4 border-black">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-black/10">
                <div>
                  <h3 className="font-heading font-extrabold text-lg uppercase tracking-tight">
                    Causal Transmission &amp; Dependency Chain
                  </h3>
                  <p className="font-body text-xs text-muted-foreground">
                    How real-time geopolitical and macroeconomic variables ripple through to your holdings. Click any node to inspect evidence.
                  </p>
                </div>
                <span className="text-[11px] font-mono bg-yellow/40 px-2.5 py-1 border border-black">
                  Autonomous Causal Network
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
                {/* Stage 1 */}
                <div className="space-y-3">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-muted p-1.5 text-center border border-black/20">
                    Stage 1: Live Trigger
                  </div>
                  {result.nodes.filter((n) => n.stage === 'trigger').map((node) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 border-2 rounded-sm cursor-pointer transition-all ${selectedNode?.id === node.id ? 'border-black bg-yellow shadow-neo-sm' : 'border-black bg-white hover:bg-yellow/20'}`}
                    >
                      <span className="text-[9px] font-mono uppercase bg-black text-white px-1.5 py-0.5 rounded-xs block w-fit mb-1">{node.category}</span>
                      <h4 className="font-heading font-extrabold text-sm">{node.name}</h4>
                      <p className="text-[11px] font-body text-muted-foreground mt-1 line-clamp-2">{node.evidenceSummary}</p>
                    </div>
                  ))}
                </div>

                {/* Stage 2 */}
                <div className="space-y-3">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-muted p-1.5 text-center border border-black/20">
                    Stage 2: Macro Transmission
                  </div>
                  {result.nodes.filter((n) => n.stage === 'macro_factor').map((node) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 border-2 rounded-sm cursor-pointer transition-all ${selectedNode?.id === node.id ? 'border-black bg-yellow shadow-neo-sm' : 'border-black bg-white hover:bg-yellow/20'}`}
                    >
                      <span className="text-[9px] font-mono uppercase bg-blue text-white px-1.5 py-0.5 rounded-xs block w-fit mb-1">{node.category}</span>
                      <h4 className="font-heading font-extrabold text-sm">{node.name}</h4>
                      <p className="text-[11px] font-body text-muted-foreground mt-1 line-clamp-2">{node.evidenceSummary}</p>
                    </div>
                  ))}
                </div>

                {/* Stage 3 */}
                <div className="space-y-3">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-muted p-1.5 text-center border border-black/20">
                    Stage 3: Sector Elasticities
                  </div>
                  {result.nodes.filter((n) => n.stage === 'sector').map((node) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 border-2 rounded-sm cursor-pointer transition-all ${selectedNode?.id === node.id ? 'border-black bg-yellow shadow-neo-sm' : 'border-black bg-white hover:bg-yellow/20'}`}
                    >
                      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-xs block w-fit mb-1 ${node.expectedDirection === 'positive' ? 'bg-mint text-black' : 'bg-coral text-white'}`}>
                        {node.category}
                      </span>
                      <h4 className="font-heading font-extrabold text-sm">{node.name}</h4>
                      <p className="text-[11px] font-body text-muted-foreground mt-1 line-clamp-2">{node.evidenceSummary}</p>
                    </div>
                  ))}
                </div>

                {/* Stage 4 */}
                <div className="space-y-3">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-muted p-1.5 text-center border border-black/20">
                    Stage 4: Your Holdings
                  </div>
                  {result.nodes.filter((n) => n.stage === 'portfolio').map((node) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className={`p-3.5 border-2 rounded-sm cursor-pointer transition-all ${selectedNode?.id === node.id ? 'border-black bg-yellow shadow-neo-sm' : 'border-black bg-white hover:bg-yellow/20'}`}
                    >
                      <span className="text-[9px] font-mono uppercase bg-purple-700 text-white px-1.5 py-0.5 rounded-xs block w-fit mb-1">Holding</span>
                      <h4 className="font-heading font-extrabold text-sm">{node.name}</h4>
                      <div className="flex justify-between items-center text-[10px] font-mono mt-1 text-muted-foreground">
                        <span>Confidence: {node.confidenceScore}%</span>
                        <span>{node.unit === '₹' ? `Base: ₹${(node.baselineValue || 0).toLocaleString('en-IN')}` : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Node Detail Drawer */}
              {selectedNode && (
                <div className="mt-4 p-4 border-2 border-black bg-yellow/10 rounded-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-heading font-bold text-sm uppercase flex items-center gap-2">
                      🔍 Node Deep-Dive: {selectedNode.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSelectedNode(null)}
                      className="text-xs font-mono px-2 py-0.5 bg-white border border-black hover:bg-black hover:text-white"
                    >
                      Close [×]
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-body">
                    <div>
                      <span className="font-mono text-muted-foreground block text-[10px] uppercase">Transmission Channel</span>
                      <p className="font-medium text-black mt-0.5">{selectedNode.evidenceSummary}</p>
                    </div>
                    <div>
                      <span className="font-mono text-muted-foreground block text-[10px] uppercase">Calibration Basis</span>
                      <p className="font-medium text-black mt-0.5">
                        Sample Size: {selectedNode.dataPointsCount} Sessions • Type:{' '}
                        <span className="uppercase font-mono">{selectedNode.evidenceType.replace('_', ' ')}</span>
                      </p>
                    </div>
                    <div>
                      <span className="font-mono text-muted-foreground block text-[10px] uppercase">Impact Range Bounds</span>
                      <p className="font-medium text-black mt-0.5 font-mono">
                        Estimated: {selectedNode.estimatedImpactPct}% [Range: {selectedNode.impactRange[0].toFixed(1)}% to {selectedNode.impactRange[1].toFixed(1)}%]
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Your Holdings ── */}
          {activeTab === 'holdings' && (
            <div className="neo-card p-6 bg-white border-t-0 border-4 border-black">
              <h3 className="font-heading font-extrabold text-lg uppercase tracking-tight mb-3">
                Holding-Wise Real-Time Impact Attribution
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-black bg-muted/40 font-mono uppercase text-[11px]">
                      <th className="p-3">Holding</th>
                      <th className="p-3">Sector</th>
                      <th className="p-3 text-right">Current Value</th>
                      <th className="p-3 text-right">Weight</th>
                      <th className="p-3 text-right">Beta / Elasticity</th>
                      <th className="p-3 text-right">Est. Return</th>
                      <th className="p-3 text-right">Monetary Impact</th>
                      <th className="p-3 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10 font-body">
                    {result.holdingImpacts.map((holding) => (
                      <tr key={holding.holdingId} className="hover:bg-yellow/10">
                        <td className="p-3 font-heading font-bold text-sm">
                          <div className="flex items-center gap-2">
                            <StockLogo ticker={holding.ticker} name={holding.holdingName} size="xs" className="shrink-0" />
                            <div>
                              <span>{holding.holdingName}</span>
                              <span className="block font-mono text-[10px] font-normal text-muted-foreground">{holding.ticker}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 uppercase font-mono text-[10px]">{holding.sector}</td>
                        <td className="p-3 text-right font-mono font-bold">₹{holding.currentValue.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-mono">{holding.portfolioWeightPct}%</td>
                        <td className="p-3 text-right font-mono font-bold">
                          {holding.betaToScenario > 0 ? '+' : ''}{holding.betaToScenario}
                        </td>
                        <td className={`p-3 text-right font-mono font-extrabold ${holding.estimatedReturnPct >= 0 ? 'text-mint-darker' : 'text-coral'}`}>
                          {formatPercent(holding.estimatedReturnPct)}
                        </td>
                        <td className={`p-3 text-right font-mono font-extrabold text-sm ${holding.estimatedMonetaryImpact >= 0 ? 'text-black' : 'text-coral'}`}>
                          {holding.estimatedMonetaryImpact >= 0 ? '+₹' : '-₹'}
                          {Math.abs(holding.estimatedMonetaryImpact).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">{holding.historicalConfidence}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Sector Breakdown ── */}
          {activeTab === 'sectors' && (
            <div className="neo-card p-6 bg-white border-t-0 border-4 border-black">
              <h3 className="font-heading font-extrabold text-lg uppercase tracking-tight mb-2">
                Sector Return &amp; Exposure Profile
              </h3>
              <p className="font-body text-xs text-muted-foreground mb-6">
                Estimated percentage impact across your sectors under the currently detected market transmission channels
              </p>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.sectorBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="sector" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip
                      formatter={(val: number) => [`${val}%`, 'Est. Return']}
                      labelFormatter={(label) => `Sector: ${label}`}
                    />
                    <Bar dataKey="estimatedReturnPct">
                      {result.sectorBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.estimatedReturnPct >= 0 ? '#16A34A' : '#D84B36'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Sector table below chart */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-black bg-muted/40 font-mono uppercase text-[11px]">
                      <th className="p-3">Sector</th>
                      <th className="p-3 text-right">Est. Return</th>
                      <th className="p-3 text-right">Portfolio Exposure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10 font-body">
                    {result.sectorBreakdown.map((s, i) => (
                      <tr key={i} className="hover:bg-yellow/10">
                        <td className="p-3 font-heading font-bold text-sm uppercase">{s.sector}</td>
                        <td className={`p-3 text-right font-mono font-extrabold ${s.estimatedReturnPct >= 0 ? 'text-mint-darker' : 'text-coral'}`}>
                          {s.estimatedReturnPct >= 0 ? '+' : ''}{s.estimatedReturnPct}%
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {(s as any).exposurePct != null ? `${(s as any).exposurePct}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Why This Result? ── */}
          {activeTab === 'explainability' && (
            <div className="neo-card p-6 bg-white border-t-0 border-4 border-black">
              <h3 className="font-heading font-extrabold text-lg uppercase tracking-tight mb-4 flex items-center gap-2">
                🧠 Transmission Narrative &amp; Assumptions
              </h3>

              <div className="space-y-4 text-xs font-body leading-relaxed">
                <div>
                  <h4 className="font-heading font-bold uppercase text-[11px] text-muted-foreground mb-1">
                    Causal Transmission Narrative
                  </h4>
                  <p className="p-3 bg-muted/20 border border-black/20 rounded-sm font-medium">
                    {result.explainability.causalNarrative}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/20 border border-black/20 rounded-sm">
                    <h4 className="font-heading font-bold uppercase text-[11px] text-muted-foreground mb-2">Core Assumptions:</h4>
                    <ul className="list-disc pl-4 space-y-1 font-medium text-black">
                      {result.explainability.coreAssumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-coral/5 border border-coral/30 rounded-sm">
                    <h4 className="font-heading font-bold uppercase text-[11px] text-coral mb-2">Invalidation Triggers:</h4>
                    <ul className="list-disc pl-4 space-y-1 font-medium text-coral">
                      {result.explainability.invalidationRisks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                  <span>Confidence: <strong>{result.explainability.statisticalConfidenceScore}%</strong></span>
                  <span className="font-medium text-black/70">Real-time analytical scenario model.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading skeleton when no result yet */}
      {!result && isAnalyzing && (
        <div className="neo-card p-10 text-center">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-3 bg-muted rounded w-1/3 mx-auto" />
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-4">Fetching live market data &amp; building causal chain…</p>
        </div>
      )}
    </div>
  );
}
