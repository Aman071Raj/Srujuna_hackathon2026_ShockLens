import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { portfolios as portfoliosApi, goals as goalsApi, analysis as analysisApi } from '../../lib/api';
import { SCENARIO_PRESETS } from '@shocklens/shared';
import { formatCurrency } from '../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';

const DEFAULT_ALTERNATIVES = [
  {
    id: 'more-liquid',
    name: 'More Liquid Allocation',
    description: 'Shifts illiquid assets into short-term accessible holdings',
    weights: [
      { label: 'Short-term Equities', assetClass: 'equity', sector: 'diversified', liquidityPeriod: 'short', weight: 0.50 },
      { label: 'Cash & Money Market', assetClass: 'cash', liquidityPeriod: 'immediate', weight: 0.20 },
      { label: 'Bond ETF', assetClass: 'fixed_income', liquidityPeriod: 'short', weight: 0.20 },
      { label: 'REIT ETF', assetClass: 'real_estate', liquidityPeriod: 'short', weight: 0.10 },
    ],
  },
  {
    id: 'lower-concentration',
    name: 'Lower Concentration',
    description: 'Reduces technology sector exposure through diversification',
    weights: [
      { label: 'Diversified Global Equities', assetClass: 'equity', sector: 'diversified', liquidityPeriod: 'short', weight: 0.40 },
      { label: 'European Equities', assetClass: 'equity', sector: 'diversified', liquidityPeriod: 'medium', weight: 0.15 },
      { label: 'Bonds', assetClass: 'fixed_income', liquidityPeriod: 'short', weight: 0.25 },
      { label: 'Real Estate', assetClass: 'real_estate', liquidityPeriod: 'medium', weight: 0.10 },
      { label: 'Cash', assetClass: 'cash', liquidityPeriod: 'immediate', weight: 0.10 },
    ],
  },
];

type ComparisonResult = {
  allocationId: string;
  allocationName: string;
  valueAfterShock: number;
  goalSurplusOrShortfall: number;
  accessibleLiquidity: number;
  largestCluster: { label: string; portfolioPercent: number } | null;
  breakingPoint: { status: string; breakingPointShock?: number } | null;
};

export default function CompareAllocations() {
  const [portfolioId, setPortfolioId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [selectedScenario, setSelectedScenario] = useState('tech_disruption');
  const [result, setResult] = useState<{ results: ComparisonResult[]; disclaimer: string } | null>(null);

  const { data: portfoliosData } = useQuery({ queryKey: ['portfolios'], queryFn: () => portfoliosApi.list() });
  const { data: goalsData } = useQuery({ queryKey: ['goals'], queryFn: () => goalsApi.list() });

  const portfolioList = (portfoliosData?.portfolios ?? []) as Array<{ id: string; name: string }>;
  const goalList = (goalsData?.goals ?? []) as Array<{ id: string; name: string }>;
  const activePortfolioId = portfolioId || portfolioList[0]?.id || '';

  const mutation = useMutation({
    mutationFn: () => analysisApi.compare({
      portfolioId: activePortfolioId,
      goalId: goalId || undefined,
      scenario: SCENARIO_PRESETS[selectedScenario] ?? SCENARIO_PRESETS.tech_disruption,
      alternatives: DEFAULT_ALTERNATIVES,
    }),
    onSuccess: (data) => setResult(data.result as { results: ComparisonResult[]; disclaimer: string }),
  });

  const chartData = result?.results.map(r => ({
    name: r.allocationName.length > 16 ? r.allocationName.slice(0, 16) + '…' : r.allocationName,
    valueAfterShock: Math.round(r.valueAfterShock),
    accessibleLiquidity: Math.round(r.accessibleLiquidity),
  })) ?? [];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-4xl mb-1">COMPARE ALLOCATIONS</h1>
        <p className="font-body text-muted-foreground">
          Test how your current portfolio compares to alternative allocations under the same scenario.
        </p>
      </div>

      <div className="neo-card p-6 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="font-heading font-bold text-sm block mb-2">PORTFOLIO *</label>
            <select
              className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
              value={activePortfolioId}
              onChange={e => setPortfolioId(e.target.value)}
            >
              {portfolioList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-heading font-bold text-sm block mb-2">GOAL (optional)</label>
            <select
              className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
              value={goalId}
              onChange={e => setGoalId(e.target.value)}
            >
              <option value="">— No goal —</option>
              {goalList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-heading font-bold text-sm block mb-2">SCENARIO</label>
            <select
              className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
              value={selectedScenario}
              onChange={e => setSelectedScenario(e.target.value)}
            >
              {Object.entries(SCENARIO_PRESETS).filter(([k]) => k !== 'custom').map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-black/10 pt-4">
          <h3 className="font-heading font-bold text-sm mb-3">ALTERNATIVE ALLOCATIONS TO COMPARE</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {DEFAULT_ALTERNATIVES.map(alt => (
              <div key={alt.id} className="border border-black/20 rounded-sm p-4">
                <h4 className="font-heading font-bold text-sm mb-1">{alt.name}</h4>
                <p className="font-body text-xs text-muted-foreground mb-3">{alt.description}</p>
                <div className="space-y-1">
                  {alt.weights.map(w => (
                    <div key={w.label} className="flex justify-between text-xs">
                      <span className="font-body text-black/70">{w.label}</span>
                      <span className="font-heading font-bold">{(w.weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={!activePortfolioId || mutation.isPending}
        className="btn-yellow px-8 py-4 text-lg"
      >
        {mutation.isPending ? '⚖️ COMPARING...' : '⚖️ COMPARE ALLOCATIONS'}
      </button>

      {mutation.isError && (
        <div className="bg-coral/20 border-2 border-coral rounded-sm p-4 text-coral font-semibold">
          {(mutation.error as Error).message}
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Bar chart comparison */}
          <div className="neo-card p-5">
            <h3 className="font-heading font-bold text-lg mb-4">Value After Shock vs. Accessible Liquidity</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="valueAfterShock" name="Portfolio Value After Shock" fill="#FFE45C" stroke="#111" strokeWidth={1.5} radius={[4,4,0,0]} />
                <Bar dataKey="accessibleLiquidity" name="Accessible Liquidity" fill="#A7F3D0" stroke="#111" strokeWidth={1.5} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison table */}
          <div className="neo-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-black text-yellow">
                  <tr>
                    {['Allocation', 'Value After Shock', 'Goal Surplus/Deficit', 'Accessible Liquidity', 'Largest Cluster', 'Breaking Point'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-heading text-xs font-bold uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={r.allocationId} className={`border-b border-black/10 ${i === 0 ? 'bg-yellow/10' : 'hover:bg-yellow/5'}`}>
                      <td className="px-4 py-3">
                        <p className="font-heading font-bold text-sm">{r.allocationName}</p>
                        {i === 0 && <span className="pill bg-black text-yellow border-black text-xs">CURRENT</span>}
                      </td>
                      <td className="px-4 py-3 font-heading font-bold">{formatCurrency(r.valueAfterShock)}</td>
                      <td className={`px-4 py-3 font-heading font-bold ${r.goalSurplusOrShortfall < 0 ? 'text-coral' : 'text-black'}`}>
                        {r.goalSurplusOrShortfall >= 0 ? '+' : ''}{formatCurrency(r.goalSurplusOrShortfall)}
                      </td>
                      <td className="px-4 py-3 font-heading font-bold">{formatCurrency(r.accessibleLiquidity)}</td>
                      <td className="px-4 py-3 font-body text-sm">
                        {r.largestCluster
                          ? `${r.largestCluster.label} (${(r.largestCluster.portfolioPercent * 100).toFixed(0)}%)`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {r.breakingPoint?.status === 'BREAKING_POINT_FOUND' ? (
                          <span className="font-heading font-bold text-coral">
                            {Math.abs((r.breakingPoint.breakingPointShock ?? 0) * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="font-body text-xs text-muted-foreground">
                            {r.breakingPoint?.status?.replace(/_/g, ' ') ?? '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="disclaimer-banner">
            {result.disclaimer}
          </div>
        </motion.div>
      )}
    </div>
  );
}
