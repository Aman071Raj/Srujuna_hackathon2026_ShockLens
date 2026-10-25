import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portfolios, goals } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { getStoredPortfolioId, setStoredPortfolioId, resolveActivePortfolio } from '../../lib/useActivePortfolio';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';

const CHART_COLORS = ['#D9F342', '#D6D2C8', '#D84B36', '#9EA59A', '#D5DEE1', '#111111'];

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
            🦋 Butterfly Effect
          </Link>
          <Link to="/app/immunity" className="btn-mint px-3.5 py-2 text-xs font-heading font-black tracking-wide border-2 border-black shadow-neo-sm">
            🛡️ Shock Immunity
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
