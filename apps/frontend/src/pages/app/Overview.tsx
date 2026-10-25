import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portfolios, goals } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { getStoredPortfolioId, setStoredPortfolioId, resolveActivePortfolio } from '../../lib/useActivePortfolio';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';

const CHART_COLORS = ['#D9F342', '#D6D2C8', '#D84B36', '#9EA59A', '#D5DEE1', '#111111'];

// ── Event Horizon Radar ─────────────────────────────────────────────────────
type EventImpact = 'high-risk' | 'moderate-risk' | 'opportunity' | 'neutral';
interface MacroEvent {
  id: string;
  date: string;          // ISO date string
  daysAway: number;
  title: string;
  body: string;
  institution: string;
  expectedOutcome: string;
  impactType: EventImpact;
  affectedSectors: string[];
  portfolioImpactLabel: string; // e.g. "+₹4,200 tailwind" or "-₹8,100 headwind"
  impactSign: number; // +1 or -1, used to color
  confidencePct: number;
  actionHint: string;
}

function buildEventHorizon(
  holdings: Array<{ assetClass: string; valueInPortfolioCurrency: number; sector: string }>,
  totalValue: number,
): MacroEvent[] {
  const now = new Date();

  // Helper: compute approximate ₹ impact given sector weights and a shock factor
  const sectorWeight = (sectorKey: string) => {
    const total = holdings.reduce((s, h) => s + h.valueInPortfolioCurrency, 0);
    if (total === 0) return 0;
    const match = holdings
      .filter(h => (h.sector || h.assetClass || '').toLowerCase().includes(sectorKey))
      .reduce((s, h) => s + h.valueInPortfolioCurrency, 0);
    return match / total;
  };

  const itWeight      = sectorWeight('it') + sectorWeight('tech');
  const bankWeight    = sectorWeight('bank') + sectorWeight('financ');
  const autoWeight    = sectorWeight('auto') + sectorWeight('car');
  const energyWeight  = sectorWeight('energy') + sectorWeight('oil') + sectorWeight('refin');
  const consumerWeight = sectorWeight('consumer') + sectorWeight('fmcg') + sectorWeight('retail');

  const tv = totalValue || 641500; // fallback for demo

  const addDays = (d: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().split('T')[0];
  };

  const fmt = (v: number) =>
    `${v >= 0 ? '+' : '-'}₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}`;

  const events: MacroEvent[] = [
    {
      id: 'fed-nov',
      date: addDays(13),
      daysAway: 13,
      title: 'US Federal Reserve — FOMC Rate Decision',
      body: 'Fed expected to hold rates at 5.25–5.50%. Any hawkish commentary will push US 10Y yields higher, increasing equity discount rates globally.',
      institution: 'US Federal Reserve',
      expectedOutcome: 'Hold (+0bps) with hawkish bias',
      impactType: 'moderate-risk',
      affectedSectors: ['IT/Exporters', 'Banking', 'Rate-sensitive growth stocks'],
      portfolioImpactLabel: fmt(-(itWeight * 0.04 + bankWeight * 0.035) * tv),
      impactSign: -1,
      confidencePct: 82,
      actionHint: 'IT exporters face dual pressure: USD billing gains offset by client budget cuts signalled by rate hold.',
    },
    {
      id: 'rbi-dec',
      date: addDays(41),
      daysAway: 41,
      title: 'RBI Monetary Policy Committee — December Decision',
      body: 'RBI likely to hold repo rate at 6.50%. Persistent CPI above 5.5% reduces probability of a cut. Bond yields could ease slightly if tone is dovish.',
      institution: 'Reserve Bank of India',
      expectedOutcome: 'Hold (6.50%), cautiously dovish language',
      impactType: 'neutral',
      affectedSectors: ['Banking & NBFC', 'Real Estate', 'Auto Loans'],
      portfolioImpactLabel: fmt((bankWeight * 0.018) * tv),
      impactSign: 1,
      confidencePct: 78,
      actionHint: 'Rate-sensitive BFSI holdings may see mild relief rally if RBI signals future easing.',
    },
    {
      id: 'opec-dec',
      date: addDays(28),
      daysAway: 28,
      title: 'OPEC+ Ministerial Meeting — Production Review',
      body: 'OPEC+ evaluating whether to extend voluntary production cuts (3.66 mbpd) into Q1 2025. An extension would keep Brent above $95/bbl, sustaining upward cost pressure on Indian importers.',
      institution: 'OPEC+',
      expectedOutcome: 'Extension of cuts likely (+70% probability)',
      impactType: 'high-risk',
      affectedSectors: ['Aviation', 'Consumer FMCG', 'Auto', 'Upstream Energy'],
      portfolioImpactLabel: fmt(-(autoWeight * 0.05 + consumerWeight * 0.03 - energyWeight * 0.06) * tv),
      impactSign: autoWeight + consumerWeight > energyWeight ? -1 : 1,
      confidencePct: 71,
      actionHint: 'If OPEC extends cuts, auto and aviation holdings face further margin compression while energy upstream benefits.',
    },
    {
      id: 'india-cpi',
      date: addDays(20),
      daysAway: 20,
      title: 'India CPI Inflation Data — November Release',
      body: 'India CPI expected at 5.6–5.9% (Food & vegetable prices remain elevated). Above 6% would reignite rate-hike concerns and pressure consumer discretionary valuations.',
      institution: 'Ministry of Statistics, India',
      expectedOutcome: '5.7% (Watch: Food inflation sub-index)',
      impactType: 'moderate-risk',
      affectedSectors: ['Consumer Discretionary', 'Auto', 'FMCG'],
      portfolioImpactLabel: fmt(-(consumerWeight * 0.025 + autoWeight * 0.02) * tv),
      impactSign: -1,
      confidencePct: 74,
      actionHint: 'CPI above 6% will compress consumer spending expectations. Monitor consumer and auto holdings closely.',
    },
    {
      id: 'us-jobs',
      date: addDays(7),
      daysAway: 7,
      title: 'US Non-Farm Payrolls — November Jobs Report',
      body: 'US jobs data is the single most important Fed signal. A strong report (>220K jobs) would push back rate-cut expectations to late 2025, strengthening USD and causing Rupee depreciation.',
      institution: 'US Bureau of Labor Statistics',
      expectedOutcome: '185K–210K jobs (Consensus)',
      impactType: 'opportunity',
      affectedSectors: ['IT Exporters', 'Pharma Exporters'],
      portfolioImpactLabel: fmt((itWeight * 0.03) * tv),
      impactSign: 1,
      confidencePct: 68,
      actionHint: 'A strong jobs report strengthens USD, creating rupee depreciation — a direct tailwind for USD-billing IT exporters.',
    },
    {
      id: 'india-q3-earnings',
      date: addDays(55),
      daysAway: 55,
      title: 'India Q3 FY25 Earnings Season Begins',
      body: 'Nifty 50 companies begin reporting Q3 FY25 results. Analyst consensus expects 8–12% YoY PAT growth. IT sector under scrutiny for deal ramp-up velocity; Banking sector watched for NIM compression.',
      institution: 'NSE / BSE Listed Corporates',
      expectedOutcome: '8–12% PAT growth (Nifty consensus)',
      impactType: 'opportunity',
      affectedSectors: ['All Sectors — Stock-Specific'],
      portfolioImpactLabel: fmt((itWeight * 0.04 + energyWeight * 0.03) * tv),
      impactSign: 1,
      confidencePct: 65,
      actionHint: 'Review individual holding analyst estimates now. Stocks with downside earnings risk should be evaluated for switching.',
    },
  ];

  return events.sort((a, b) => a.daysAway - b.daysAway);
}

const IMPACT_STYLES: Record<EventImpact, { border: string; bg: string; badge: string; badgeText: string; dot: string }> = {
  'high-risk':      { border: 'border-coral',      bg: 'bg-coral/5',      badge: 'bg-coral text-white',           badgeText: '⚠ HIGH RISK',   dot: 'bg-coral' },
  'moderate-risk':  { border: 'border-yellow',     bg: 'bg-yellow/10',    badge: 'bg-yellow text-black',           badgeText: '⚡ MODERATE',    dot: 'bg-yellow' },
  'opportunity':    { border: 'border-mint',        bg: 'bg-mint/10',      badge: 'bg-mint text-black',             badgeText: '↑ OPPORTUNITY', dot: 'bg-mint' },
  'neutral':        { border: 'border-black/30',    bg: 'bg-muted/20',     badge: 'bg-black/80 text-white',         badgeText: '• NEUTRAL',     dot: 'bg-black/40' },
};


export default function Overview() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(() => getStoredPortfolioId());

  const { data: portfoliosData } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfolios.list(),
  });

  const { data: goalsData } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goals.list(),
  });

  const portfolioList = (portfoliosData?.portfolios ?? []) as Array<{
    id: string; name: string; currency: string;
    holdings: Array<{ assetClass: string; valueInPortfolioCurrency: number; sector: string }>;
  }>;
  const goalList = (goalsData?.goals ?? []) as Array<{
    id: string; name: string; targetAmount: number; targetDate: string;
  }>;

  const activePortfolio = portfolioList.find(p => p.id === selectedPortfolioId) ?? resolveActivePortfolio(portfolioList);

  useEffect(() => {
    if (activePortfolio && activePortfolio.id !== selectedPortfolioId) {
      setSelectedPortfolioId(activePortfolio.id);
      setStoredPortfolioId(activePortfolio.id);
    }
  }, [activePortfolio, selectedPortfolioId]);

  const handleSelectPortfolio = (id: string) => {
    setSelectedPortfolioId(id);
    setStoredPortfolioId(id);
  };

  const totalValue = activePortfolio?.holdings.reduce((s: number, h) => s + h.valueInPortfolioCurrency, 0) ?? 0;

  const assetAllocationData = (() => {
    if (!activePortfolio) return [];
    const groups: Record<string, number> = {};
    for (const h of activePortfolio.holdings) {
      groups[h.assetClass] = (groups[h.assetClass] ?? 0) + h.valueInPortfolioCurrency;
    }
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  })();

  if (portfolioList.length === 0) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-heading font-extrabold text-4xl mb-4">WELCOME TO SHOCKLENS</h1>
        <p className="font-body text-muted-foreground text-lg mb-8">
          Get started by creating your first portfolio.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <Link to="/app/portfolio" className="neo-card p-6 hover:shadow-neo-lg transition-all">
            <div className="text-3xl mb-3">💼</div>
            <h2 className="font-heading font-bold text-xl mb-2">Add Your Portfolio</h2>
            <p className="font-body text-sm text-muted-foreground">
              Enter holdings manually or import from CSV to get started.
            </p>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black/10 pb-4">
        <div>
          <div className="inline-block px-2.5 py-0.5 bg-black text-yellow text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5 shadow-neo-xs">
            Workspace Hub
          </div>
          <h1 className="font-heading font-black text-4xl tracking-tight uppercase">OVERVIEW</h1>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            Active Portfolio: <span className="font-bold text-black uppercase">{activePortfolio?.name ?? 'Your Portfolio'}</span>
          </p>
        </div>

        {/* Portfolio switcher tabs */}
        {portfolioList.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-1 bg-muted/40 border-2 border-black">
            {portfolioList.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPortfolio(p.id)}
                className={`px-4 py-1.5 border border-black font-heading font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all shadow-neo-xs ${
                  activePortfolio?.id === p.id ? 'bg-yellow text-black font-extrabold' : 'bg-white hover:bg-yellow/30 text-black/70'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="metric-card bg-yellow/25 border-3 border-black">
          <p className="font-mono text-[10px] font-bold uppercase text-black/60 mb-1 tracking-wider">PORTFOLIO VALUE</p>
          <p className="font-heading font-black text-3xl text-black">{formatCurrency(totalValue)}</p>
          <p className="font-mono text-[10px] text-black/60 mt-1 font-bold">{activePortfolio?.holdings.length ?? 0} holdings synchronized</p>
        </div>
        <div className="metric-card bg-blue/30 border-3 border-black">
          <p className="font-mono text-[10px] font-bold uppercase text-black/60 mb-1 tracking-wider">FINANCIAL GOALS</p>
          <p className="font-heading font-black text-3xl text-black">{goalList.length}</p>
          <p className="font-mono text-[10px] text-black/60 mt-1 font-bold">active goal targets</p>
        </div>
        <div className="metric-card bg-white border-3 border-black">
          <p className="font-mono text-[10px] font-bold uppercase text-black/60 mb-1 tracking-wider">PORTFOLIOS MANAGED</p>
          <p className="font-heading font-black text-3xl text-black">{portfolioList.length}</p>
          <p className="font-mono text-[10px] text-black/60 mt-1 font-bold">created &amp; tracked</p>
        </div>
      </div>

      {/* Quick actions ribbon */}
      <div className="neo-card p-5 bg-white border-3 border-black">
        <div className="flex items-center justify-between mb-3 border-b border-black/10 pb-2">
          <h3 className="font-heading font-black text-sm uppercase tracking-wider text-black flex items-center gap-1.5">
            ⚡ Quick Tactical Navigation
          </h3>
          <span className="font-mono text-[9px] uppercase text-muted-foreground font-bold">Instant Jump</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link to="/app/butterfly" className="btn-yellow px-3.5 py-2 text-xs font-heading font-black tracking-wide border-2 border-black shadow-neo-sm">
            🌐 Market Nexus
          </Link>
          <Link to="/app/switch-analyzer" className="btn-white px-3.5 py-2 text-xs font-heading font-black tracking-wide border-2 border-black shadow-neo-sm">
            📈 Stock Switch &amp; Compare
          </Link>
          <Link to="/app/scenarios" className="btn-lavender px-3.5 py-2 text-xs font-heading font-black tracking-wide border-2 border-black shadow-neo-sm">
            🧪 Scenario Lab
          </Link>
          <Link to="/app/portfolio" className="btn-white px-3.5 py-2 text-xs font-heading font-black tracking-wide border-2 border-black shadow-neo-sm">
            💼 Manage Holdings
          </Link>
          <Link to="/app/goals" className="btn-white px-3.5 py-2 text-xs font-heading font-black tracking-wide border-2 border-black shadow-neo-sm">
            🎯 Financial Goals
          </Link>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {assetAllocationData.length > 0 && (
          <div className="neo-card p-5 border-3 border-black">
            <h3 className="font-heading font-black text-base uppercase tracking-tight mb-4 border-b border-black/10 pb-2">
              Asset Allocation Exposure
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={assetAllocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {assetAllocationData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#111" strokeWidth={1.5} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {goalList.length > 0 && (
          <div className="neo-card p-5 border-3 border-black">
            <h3 className="font-heading font-black text-base uppercase tracking-tight mb-4 border-b border-black/10 pb-2">
              Financial Targets &amp; Milestones
            </h3>
            <div className="space-y-3">
              {goalList.slice(0, 3).map(goal => (
                <div key={goal.id} className="p-3 bg-muted/30 border-2 border-black/15 flex items-center justify-between">
                  <div>
                    <p className="font-heading font-bold text-sm text-black">{goal.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Deadline: {new Date(goal.targetDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-black text-base text-black">{formatCurrency(goal.targetAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
