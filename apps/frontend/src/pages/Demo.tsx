import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  SCENARIO_PRESETS,
  calculateScenario,
  calculateExposure,
  findBreakingPoint,
  calculateLiquidityProfile,
} from '@shocklens/shared';
import type { ScenarioDefinition } from '@shocklens/shared';
import { demoPortfolio, demoGoal } from '../lib/demo';
import { formatCurrency, formatPercent } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine, Legend,
} from 'recharts';

const CHART_COLORS = ['#D9F342', '#D6D2C8', '#D84B36', '#9EA59A', '#D5DEE1', '#111111'];

const DEMO_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'xray', label: 'X-Ray' },
  { id: 'scenario', label: 'Scenario Lab' },
  { id: 'breaking', label: 'Breaking Point' },
];

function DemoBanner() {
  const navigate = useNavigate();
  return (
    <div className="bg-yellow border-b-2 border-black px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="bg-black text-yellow px-2 py-0.5 rounded-sm text-xs font-heading font-bold">DEMO</span>
        <span className="font-body text-sm font-semibold">
          You're exploring a demo portfolio — all data is fictional and for illustration only.
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/register')}
          className="btn-black text-sm px-4 py-2"
        >
          START WITH MY PORTFOLIO →
        </button>
      </div>
    </div>
  );
}

function OverviewTab() {
  const holdings = demoPortfolio.holdings;
  const goal = demoGoal;
  const noShockResult = calculateScenario(holdings, goal, SCENARIO_PRESETS.custom);
  const liquidity = calculateLiquidityProfile(holdings, goal);

  const assetData = (() => {
    const groups: Record<string, number> = {};
    for (const h of holdings) {
      groups[h.assetClass] = (groups[h.assetClass] ?? 0) + h.valueInPortfolioCurrency;
    }
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  })();

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Portfolio Value', value: formatCurrency(noShockResult.originalPortfolioValue), color: 'bg-yellow/30' },
          { label: 'Goal Target', value: formatCurrency(goal.targetAmount), color: 'bg-blue/20' },
          { label: 'Goal Surplus (No Shock)', value: formatCurrency(noShockResult.goalSurplus), color: noShockResult.goalSurplus >= 0 ? 'bg-mint/30' : 'bg-coral/20' },
          { label: 'Liquid by Goal Date', value: formatCurrency(liquidity.liquidByGoalDate), color: 'bg-lavender/20' },
          { label: 'Illiquid Assets', value: formatCurrency(liquidity.illiquid), color: 'bg-coral/10' },
          { label: 'Holdings', value: holdings.length.toString(), color: 'bg-yellow/20' },
        ].map(m => (
          <div key={m.label} className={`${m.color} border-2 border-black rounded-lg p-4`}>
            <p className="font-body text-xs text-black/60 mb-1">{m.label}</p>
            <p className="font-heading font-extrabold text-xl">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="neo-card p-5">
          <h3 className="font-heading font-bold mb-4">Asset Allocation</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={assetData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {assetData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#111" strokeWidth={1.5} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="neo-card p-5">
          <h3 className="font-heading font-bold mb-4">Holdings by Value</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={holdings.map(h => ({ name: h.ticker ?? h.name.slice(0, 8), value: h.valueInPortfolioCurrency }))}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'Inter' }} />
              <YAxis tick={{ fontSize: 10, fontFamily: 'Inter' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" fill="#D9F342" stroke="#111" strokeWidth={1.5} radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function XRayTab() {
  const exposure = calculateExposure(demoPortfolio.holdings);
  const totalValue = demoPortfolio.holdings.reduce((s, h) => s + h.valueInPortfolioCurrency, 0);

  return (
    <div className="space-y-6">
      {exposure.concentrationWarnings.length > 0 && (
        <div className="border-2 border-coral bg-coral/10 rounded-lg p-4 space-y-2">
          <h3 className="font-heading font-bold text-coral">⚠ Concentration Warnings</h3>
          {exposure.concentrationWarnings.map((w, i) => (
            <p key={i} className="font-body text-sm">{w}</p>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {exposure.clusters.slice(0, 12).map(cluster => (
          <div key={`${cluster.dimension}-${cluster.label}`}
            className={`border-2 rounded-lg p-4 ${
              cluster.warningLevel === 'critical' ? 'border-coral bg-coral/10' :
              cluster.warningLevel === 'high' ? 'border-yellow bg-yellow/20' :
              cluster.warningLevel === 'moderate' ? 'border-lavender/50 bg-lavender/10' :
              'border-black/20 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-body text-xs text-muted-foreground uppercase">{cluster.dimension}</span>
                <span className="font-heading font-bold">{cluster.label}</span>
                {cluster.warningLevel !== 'none' && (
                  <span className={`pill ${
                    cluster.warningLevel === 'critical' ? 'bg-coral/20 text-coral border-coral' :
                    cluster.warningLevel === 'high' ? 'bg-yellow text-black border-black' :
                    'bg-lavender/20 text-lavender border-lavender'
                  }`}>
                    {cluster.warningLevel.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="font-heading font-extrabold text-lg">{(cluster.portfolioPercent * 100).toFixed(1)}%</p>
                <p className="font-body text-xs text-muted-foreground">{formatCurrency(cluster.totalValue)}</p>
              </div>
            </div>
            <div className="h-2 bg-black/10 rounded-sm overflow-hidden">
              <div
                className={`h-full rounded-sm ${
                  cluster.warningLevel === 'critical' ? 'bg-coral' :
                  cluster.warningLevel === 'high' ? 'bg-yellow' :
                  cluster.warningLevel === 'moderate' ? 'bg-lavender' :
                  'bg-blue'
                }`}
                style={{ width: `${cluster.portfolioPercent * 100}%` }}
              />
            </div>
            <p className="font-body text-xs text-muted-foreground mt-2">
              {cluster.holdingNames.join(', ')}
            </p>
          </div>
        ))}
      </div>

      <div className="disclaimer-banner">
        <strong>NOTE:</strong> Shared sector or tag categories indicate structural overlap, 
        not statistical correlation. ShockLens does not model correlations between holdings.
      </div>
    </div>
  );
}

function ScenarioTab() {
  const [equityShock, setEquityShock] = useState(-20);
  const [techShock, setTechShock] = useState(-30);
  const [rateBps, setRateBps] = useState(0);
  const [liquidityMult, setLiquidityMult] = useState(1);

  const scenario: ScenarioDefinition = {
    name: 'Custom',
    description: '',
    equityShock: equityShock / 100,
    sectorShocks: { technology: techShock / 100 },
    interestRateChangeBps: rateBps,
    currencyShocks: {},
    liquidityRestrictionMultiplier: liquidityMult,
  };

  const result = calculateScenario(demoPortfolio.holdings, demoGoal, scenario);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="neo-card p-6 grid md:grid-cols-2 gap-6">
        {[
          { label: 'Equity Shock', value: equityShock, set: setEquityShock, min: -80, max: 20, suffix: '%', color: 'text-coral' },
          { label: 'Tech Sector Shock', value: techShock, set: setTechShock, min: -80, max: 20, suffix: '%', color: 'text-coral' },
          { label: 'Interest Rate Change', value: rateBps, set: setRateBps, min: -300, max: 500, suffix: ' bps', color: 'text-lavender' },
          { label: 'Liquidity Restriction', value: liquidityMult, set: setLiquidityMult, min: 1, max: 5, suffix: '×', color: 'text-yellow' },
        ].map(ctrl => (
          <div key={ctrl.label}>
            <div className="flex justify-between mb-2">
              <label className="font-heading font-bold text-sm">{ctrl.label}</label>
              <span className={`font-heading font-bold ${ctrl.color}`}>
                {ctrl.value.toFixed(ctrl.suffix === ' bps' ? 0 : 1)}{ctrl.suffix}
              </span>
            </div>
            <input
              type="range"
              min={ctrl.min} max={ctrl.max} step={1}
              value={ctrl.value}
              onChange={e => ctrl.set(Number(e.target.value))}
              className="w-full h-3 bg-muted border border-black rounded-sm cursor-pointer accent-yellow"
            />
          </div>
        ))}
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-yellow/30 border-2 border-black rounded-lg p-4">
          <p className="font-body text-xs text-black/60">Portfolio After Shock</p>
          <p className="font-heading font-extrabold text-xl">{formatCurrency(result.shockedPortfolioValue)}</p>
        </div>
        <div className="bg-coral/20 border-2 border-black rounded-lg p-4">
          <p className="font-body text-xs text-black/60">Scenario Loss</p>
          <p className="font-heading font-extrabold text-xl text-coral">−{formatCurrency(result.scenarioLoss)}</p>
        </div>
        <div className={`border-2 border-black rounded-lg p-4 ${result.goalSurplus >= 0 ? 'bg-mint/30' : 'bg-coral/20'}`}>
          <p className="font-body text-xs text-black/60">Goal Surplus/Deficit</p>
          <p className={`font-heading font-extrabold text-xl ${result.goalSurplus < 0 ? 'text-coral' : ''}`}>
            {result.goalSurplus >= 0 ? '+' : ''}{formatCurrency(result.goalSurplus)}
          </p>
        </div>
        <div className="bg-blue/20 border-2 border-black rounded-lg p-4">
          <p className="font-body text-xs text-black/60">Accessible Liquidity</p>
          <p className="font-heading font-extrabold text-xl">{formatCurrency(result.accessibleValue)}</p>
        </div>
      </div>

      {/* Holdings table */}
      <div className="neo-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black text-yellow">
              <tr>
                {['Holding', 'Original', 'Shocked', 'Loss', 'Liquid?'].map(h => (
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
                    {r.loss > 0 ? `−${formatCurrency(r.loss)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill ${r.isLiquidByGoalDate ? 'bg-mint text-black border-black' : 'bg-coral/20 text-coral border-coral'}`}>
                      {r.isLiquidByGoalDate ? '✓ YES' : '✗ NO'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="disclaimer-banner">
        HYPOTHETICAL SCENARIO — NOT A PREDICTION OR GUARANTEED OUTCOME. Results use simplified models with fictional demo data.
      </div>
    </div>
  );
}

function BreakingPointTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof findBreakingPoint> | null>(null);

  const run = () => {
    setLoading(true);
    setTimeout(() => {
      const r = findBreakingPoint({
        holdings: demoPortfolio.holdings,
        goal: demoGoal,
        baseScenario: { ...SCENARIO_PRESETS.tech_disruption, sectorShocks: { technology: -1.0 } },
        failureConditions: ['GOAL_SHORTFALL'],
        minShockMultiplier: 0,
        maxShockMultiplier: 1,
      });
      setResult(r);
      setLoading(false);
    }, 600);
  };

  // Build shock vs value chart data
  const chartData = Array.from({ length: 21 }, (_, i) => {
    const m = i * 0.05;
    const r = calculateScenario(demoPortfolio.holdings, demoGoal, {
      ...SCENARIO_PRESETS.tech_disruption,
      equityShock: -0.10 * m,
      sectorShocks: { technology: -1.0 * m },
    });
    return {
      shock: `${(m * 100).toFixed(0)}%`,
      portfolioValue: Math.round(r.shockedPortfolioValue),
      goalSurplus: Math.round(r.goalSurplus),
    };
  });

  return (
    <div className="space-y-6">
      <div className="neo-card p-6">
        <h3 className="font-heading font-extrabold text-2xl mb-2">REVERSE STRESS TEST</h3>
        <p className="font-body text-muted-foreground mb-6">
          Find the minimum technology disruption shock at which the home down payment goal fails.
        </p>

        {!result ? (
          <button onClick={run} disabled={loading} className="btn-yellow px-8 py-4 text-lg">
            {loading ? 'CALCULATING...' : '⚡ FIND BREAKING POINT'}
          </button>
        ) : (
          <div className="space-y-4">
            <div className={`border-2 rounded-lg p-6 ${result.status === 'BREAKING_POINT_FOUND' ? 'border-coral bg-coral/10' : 'border-mint bg-mint/10'}`}>
              <p className="font-heading text-xs font-bold uppercase mb-2 text-muted-foreground">RESULT</p>
              <p className={`font-heading font-extrabold text-3xl mb-2 ${result.status === 'BREAKING_POINT_FOUND' ? 'text-coral' : 'text-black'}`}>
                {result.status === 'BREAKING_POINT_FOUND'
                  ? `BREAKING POINT: ${Math.abs((result.breakingPointShock ?? 0) * 100).toFixed(1)}% TECH SHOCK`
                  : result.status === 'ALREADY_BREACHED'
                    ? 'ALREADY BREACHED AT BASELINE'
                    : 'NOT BREACHED WITHIN RANGE'}
              </p>
              <p className="font-body text-sm text-muted-foreground mb-4">
                Condition: {result.firstBreachedCondition?.replace(/_/g, ' ')}
              </p>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="font-body text-xs text-black/60">Portfolio at Break</p>
                  <p className="font-heading font-bold text-xl">{formatCurrency(result.portfolioValueAtBreak ?? 0)}</p>
                </div>
                <div>
                  <p className="font-body text-xs text-black/60">Goal Surplus at Break</p>
                  <p className={`font-heading font-bold text-xl ${(result.goalSurplusAtBreak ?? 0) < 0 ? 'text-coral' : ''}`}>
                    {formatCurrency(result.goalSurplusAtBreak ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="font-body text-xs text-black/60">Iterations</p>
                  <p className="font-heading font-bold text-xl">{result.iterationsUsed}</p>
                </div>
              </div>
            </div>

            <div className="neo-card p-5">
              <h4 className="font-heading font-bold mb-3">Top Loss Contributors</h4>
              {result.topContributors.map(c => (
                <div key={c.holdingId} className="flex justify-between py-2 border-b border-black/10 last:border-0">
                  <span className="font-body text-sm">{c.holdingName}</span>
                  <span className="font-heading font-bold text-sm text-coral">−{formatCurrency(c.loss)}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setResult(null)} className="btn-white px-6 py-3">
              ↺ RUN AGAIN
            </button>
          </div>
        )}
      </div>

      {/* Shock vs Value chart */}
      <div className="neo-card p-5">
        <h3 className="font-heading font-bold mb-4">Shock Severity vs. Portfolio Value</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <XAxis dataKey="shock" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <ReferenceLine y={demoGoal.targetAmount} stroke="#D84B36" strokeDasharray="4 2" label={{ value: 'GOAL', fill: '#D84B36', fontSize: 10 }} />
            <Line type="monotone" dataKey="portfolioValue" stroke="#111111" strokeWidth={2} dot={false} name="Portfolio Value" />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-black/40 mt-2 text-center font-body">
          Red dashed line = $180,000 home down payment goal. Hypothetical demo data.
        </p>
      </div>

      <div className="disclaimer-banner">
        {result?.disclaimer ?? 'HYPOTHETICAL SCENARIO — NOT A PREDICTION OR GUARANTEED OUTCOME.'}
        <br />
        Assumptions: {result?.assumptions.shockCombinationRule}
      </div>
    </div>
  );
}

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-cream">
      <DemoBanner />

      {/* Header */}
      <div className="border-b-2 border-black bg-cream px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-heading font-extrabold text-2xl flex items-center gap-2">
            ⚡ SHOCKLENS
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/register" className="btn-yellow px-4 py-2 text-sm">
              CREATE FREE ACCOUNT →
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Demo story context */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="neo-card p-6 mb-8 bg-yellow/20"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl">👋</div>
            <div>
              <h1 className="font-heading font-extrabold text-2xl mb-2">
                Demo: Priya's Home Down Payment Challenge
              </h1>
              <p className="font-body text-sm text-black/70">
                Priya has $208,000 across 10 investments and wants to save $180,000 for a home 
                down payment by December 31, 2026. Her portfolio looks diversified, but 
                ShockLens reveals 44.7% tech exposure — and a potential breaking point.
              </p>
              <p className="font-body text-xs text-black/40 mt-2">
                All names, amounts, and figures are entirely fictional. Exchange rates dated 2026-10-24 (fictional demo rates).
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {DEMO_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 font-heading font-bold text-sm border-2 border-black rounded-sm whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-black text-yellow shadow-neo-sm'
                  : 'bg-white hover:bg-yellow/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'xray' && <XRayTab />}
          {activeTab === 'scenario' && <ScenarioTab />}
          {activeTab === 'breaking' && <BreakingPointTab />}
        </motion.div>
      </div>
    </div>
  );
}
