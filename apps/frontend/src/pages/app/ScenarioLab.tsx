import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { portfolios as portfoliosApi, goals as goalsApi, analysis as analysisApi } from '../../lib/api';
import { SCENARIO_PRESETS } from '@shocklens/shared';
import type { ScenarioDefinition, ScenarioResult } from '@shocklens/shared';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { getStoredPortfolioId, setStoredPortfolioId } from '../../lib/useActivePortfolio';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { motion } from 'framer-motion';

const PRESETS = Object.entries(SCENARIO_PRESETS).filter(([k]) => k !== 'custom');

export default function ScenarioLab() {
  const [portfolioId, setPortfolioId] = useState(() => getStoredPortfolioId() || '');
  const [goalId, setGoalId] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [equityShock, setEquityShock] = useState(0);
  const [techShock, setTechShock] = useState(0);
  const [rateBps, setRateBps] = useState(0);
  const [liquidityMult, setLiquidityMult] = useState(1);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const { data: portfoliosData } = useQuery({ queryKey: ['portfolios'], queryFn: () => portfoliosApi.list() });
  const { data: goalsData } = useQuery({ queryKey: ['goals'], queryFn: () => goalsApi.list() });

  const portfolioList = (portfoliosData?.portfolios ?? []) as Array<{ id: string; name: string }>;
  const goalList = (goalsData?.goals ?? []) as Array<{ id: string; name: string }>;
  const activePortfolioId = (portfolioList.some(p => p.id === portfolioId) ? portfolioId : null) || getStoredPortfolioId() || portfolioList[0]?.id || '';

  const applyPreset = (key: string) => {
    setSelectedPreset(key);
    const p = SCENARIO_PRESETS[key];
    if (!p) return;
    setEquityShock(Math.round(p.equityShock * 100));
    setTechShock(Math.round((p.sectorShocks.technology ?? 0) * 100));
    setRateBps(p.interestRateChangeBps);
    setLiquidityMult(p.liquidityRestrictionMultiplier);
  };

  const getScenario = (): ScenarioDefinition => ({
    name: selectedPreset ? SCENARIO_PRESETS[selectedPreset]?.name ?? 'Custom' : 'Custom',
    description: selectedPreset ? SCENARIO_PRESETS[selectedPreset]?.description ?? '' : '',
    equityShock: equityShock / 100,
    sectorShocks: { technology: techShock / 100 },
    interestRateChangeBps: rateBps,
    currencyShocks: {},
    liquidityRestrictionMultiplier: liquidityMult,
  });

  const mutation = useMutation({
    mutationFn: () => analysisApi.scenario({
      portfolioId: activePortfolioId,
      goalId: goalId || undefined,
      scenario: getScenario(),
    }),
    onSuccess: (data) => setResult(data.result as ScenarioResult),
  });

  const chartData = result ? result.holdingResults
    .sort((a, b) => b.loss - a.loss)
    .map(r => ({
      name: r.holdingName.length > 12 ? r.holdingName.slice(0, 12) + '…' : r.holdingName,
      loss: Math.round(r.loss),
      shockedValue: Math.round(r.shockedValue),
    }))
    : [];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-4xl mb-1">SCENARIO LAB</h1>
        <p className="font-body text-muted-foreground">
          Apply market shocks and see immediate impact on portfolio value, goal funding, and liquidity.
        </p>
      </div>

      {/* Portfolio and goal selectors */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="font-heading font-bold text-sm block mb-2">PORTFOLIO</label>
          <select
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={activePortfolioId}
            onChange={e => setPortfolioId(e.target.value)}
          >
            {portfolioList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="font-heading font-bold text-sm block mb-2">FINANCIAL GOAL (optional)</label>
          <select
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={goalId}
            onChange={e => setGoalId(e.target.value)}
          >
            <option value="">— No goal selected —</option>
            {goalList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {/* Preset scenarios */}
      <div className="neo-card p-5">
        <h3 className="font-heading font-bold text-lg mb-4">SCENARIO PRESETS</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {PRESETS.map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-3 py-2 border-2 border-black rounded-sm font-heading font-bold text-xs transition-all ${
                selectedPreset === key ? 'bg-black text-yellow' : 'bg-white hover:bg-yellow/30'
              }`}
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={() => { setSelectedPreset(''); setEquityShock(0); setTechShock(0); setRateBps(0); setLiquidityMult(1); }}
            className="px-3 py-2 border-2 border-black rounded-sm font-heading font-bold text-xs bg-white hover:bg-coral/20"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Sliders */}
      <div className="neo-card p-6 grid md:grid-cols-2 gap-6">
        <h3 className="font-heading font-bold text-lg md:col-span-2">SCENARIO CONTROLS</h3>
        
        {[
          { label: 'Equity Shock', value: equityShock, set: setEquityShock, min: -80, max: 20, color: 'text-coral', unit: '%' },
          { label: 'Technology Sector Shock', value: techShock, set: setTechShock, min: -80, max: 20, color: 'text-coral', unit: '%' },
          { label: 'Interest Rate Change', value: rateBps, set: setRateBps, min: -300, max: 500, color: 'text-lavender', unit: ' bps' },
          { label: 'Liquidity Restriction Multiplier', value: liquidityMult, set: setLiquidityMult, min: 1, max: 5, color: 'text-yellow', unit: '×', step: 0.1 },
        ].map(ctrl => (
          <div key={ctrl.label}>
            <div className="flex justify-between mb-2">
              <label className="font-heading font-bold text-sm">{ctrl.label}</label>
              <span className={`font-heading font-bold text-sm ${ctrl.color}`}>
                {ctrl.value.toFixed(ctrl.unit === '×' ? 1 : 0)}{ctrl.unit}
              </span>
            </div>
            <input
              type="range"
              min={ctrl.min} max={ctrl.max} step={ctrl.step ?? 1}
              value={ctrl.value}
              onChange={e => ctrl.set(Number(e.target.value))}
              className="w-full h-3 bg-muted border border-black rounded-sm cursor-pointer accent-yellow"
            />
            <div className="flex justify-between text-xs text-black/40 mt-1">
              <span>{ctrl.min}{ctrl.unit}</span>
              <span>{ctrl.max}{ctrl.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={!activePortfolioId || mutation.isPending}
        className="btn-yellow px-8 py-4 text-lg"
      >
        {mutation.isPending ? '🧪 RUNNING SCENARIO...' : '🧪 RUN SCENARIO'}
      </button>

      {mutation.isError && (
        <div className="bg-coral/20 border-2 border-coral rounded-sm p-4 text-coral font-semibold">
          {(mutation.error as Error).message}
        </div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="metric-card bg-yellow/30">
              <p className="font-body text-xs text-black/60">ORIGINAL VALUE</p>
              <p className="font-heading font-extrabold text-xl">{formatCurrency(result.originalPortfolioValue)}</p>
            </div>
            <div className="metric-card bg-coral/20">
              <p className="font-body text-xs text-black/60">SHOCKED VALUE</p>
              <p className="font-heading font-extrabold text-xl">{formatCurrency(result.shockedPortfolioValue)}</p>
              <p className="font-body text-xs text-coral">−{formatCurrency(result.scenarioLoss)}</p>
            </div>
            {result.goalFundingStatus !== 'EXACTLY_MET' && (
              <div className={`metric-card ${result.goalSurplus >= 0 ? 'bg-mint/30' : 'bg-coral/20'}`}>
                <p className="font-body text-xs text-black/60">GOAL STATUS</p>
                <p className={`font-heading font-extrabold text-xl ${result.goalSurplus < 0 ? 'text-coral' : ''}`}>
                  {result.goalFundingStatus}
                </p>
                <p className="font-body text-xs">{formatCurrency(Math.abs(result.goalSurplus))}</p>
              </div>
            )}
            <div className="metric-card bg-blue/20">
              <p className="font-body text-xs text-black/60">ACCESSIBLE</p>
              <p className="font-heading font-extrabold text-xl">{formatCurrency(result.accessibleValue)}</p>
            </div>
          </div>

          {/* Loss bar chart */}
          <div className="neo-card p-5">
            <h3 className="font-heading font-bold text-lg mb-4">Loss by Holding</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="loss" name="Loss" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#FF6B6B' : i < 3 ? '#FFE45C' : '#A7F3D0'} stroke="#111" strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Holdings table */}
          <div className="neo-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-black text-yellow">
                  <tr>
                    {['Holding', 'Original', 'Shocked', 'Loss', 'Shock%', 'Liquid?'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-heading text-xs font-bold uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.holdingResults.sort((a, b) => b.loss - a.loss).map(r => (
                    <tr key={r.holdingId} className="border-b border-black/10 hover:bg-yellow/10">
                      <td className="px-4 py-3 font-heading font-semibold text-sm">{r.holdingName}</td>
                      <td className="px-4 py-3 font-body text-sm">{formatCurrency(r.originalValue)}</td>
                      <td className="px-4 py-3 font-body text-sm">{formatCurrency(r.shockedValue)}</td>
                      <td className="px-4 py-3 font-body text-sm text-coral font-semibold">
                        {r.loss > 0.01 ? `−${formatCurrency(r.loss)}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-body text-sm">
                        {r.appliedShockPercent.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        <span className={`pill text-xs ${r.isLiquidByGoalDate ? 'bg-mint text-black border-black' : 'bg-coral/20 text-coral border-coral'}`}>
                          {r.isLiquidByGoalDate ? '✓' : '✗'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="disclaimer-banner">
            {result.disclaimer}
            <br /><br />
            <strong>Assumptions:</strong> {result.assumptions.shockCombinationRule}
          </div>
        </motion.div>
      )}
    </div>
  );
}
