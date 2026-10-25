import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  goals as goalsApi,
  portfolios as portfoliosApi,
  holdings as holdingsApi,
  type GoalInvestmentPlan,
  type RecommendedStock,
  type PortfolioHoldingAudit,
} from '../../lib/api';
import { formatCurrency, formatDate, daysUntil } from '../../lib/utils';
import type { FinancialGoal, Portfolio } from '@shocklens/shared';
import StockLogo from '../../components/StockLogo';
import { resolveActivePortfolio, getStoredPortfolioId, setStoredPortfolioId } from '../../lib/useActivePortfolio';

const GOAL_TYPES = [
  { value: 'home_down_payment', label: '🏠 Home Down Payment' },
  { value: 'higher_education', label: '🎓 Higher Education' },
  { value: 'retirement_withdrawal', label: '🌴 Retirement Withdrawal' },
  { value: 'emergency_reserve', label: '🛡️ Emergency Reserve' },
  { value: 'custom', label: '⚙️ Custom Goal' },
];

function InvestmentPlanModal({
  plan,
  portfolioId,
  onClose,
  onHoldingDumped,
}: {
  plan: GoalInvestmentPlan;
  portfolioId?: string;
  onClose: () => void;
  onHoldingDumped?: () => Promise<GoalInvestmentPlan | void> | void;
}) {
  const [currentPlan, setCurrentPlan] = useState<GoalInvestmentPlan>(plan);
  const [activeTab, setActiveTab] = useState<'audit' | 'recommended'>('audit');
  const [dumpingId, setDumpingId] = useState<string | null>(null);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPlan(plan);
  }, [plan]);

  const getBadgeStyle = (status: RecommendedStock['trendStatus']) => {
    switch (status) {
      case 'STRONG_BULLISH':
        return 'bg-mint text-black border-black font-extrabold';
      case 'DEFENSIVE_COMPOUNDER':
        return 'bg-blue/20 text-blue-900 border-black/40 font-bold';
      case 'RECOVERY':
        return 'bg-coral/20 text-coral border-coral font-bold';
      default:
        return 'bg-yellow text-black border-black font-bold';
    }
  };

  const getRoleBadgeStyle = (role?: RecommendedStock['portfolioRole']) => {
    switch (role) {
      case 'DIRECT_REPLACEMENT':
        return 'bg-coral text-white border-black font-black';
      case 'DIVERSIFICATION':
        return 'bg-purple-600 text-white border-black font-bold';
      case 'DEFENSIVE_ANCHOR':
        return 'bg-blue/20 text-blue-900 border-black/50 font-bold';
      default:
        return 'bg-mint text-black border-black font-extrabold';
    }
  };

  const getAuditBadgeStyle = (verdict: PortfolioHoldingAudit['verdict']) => {
    switch (verdict) {
      case 'DUMP_RECOMMENDED':
        return 'bg-coral text-white border-black font-black';
      case 'TRIM_OR_REPLACE':
        return 'bg-yellow text-black border-black font-bold';
      case 'ACCUMULATE':
        return 'bg-mint text-black border-black font-extrabold';
      default:
        return 'bg-muted text-black border-black/30 font-semibold';
    }
  };

  const handleDumpHolding = async (holding: PortfolioHoldingAudit) => {
    const confirm = window.confirm(
      `Dump "${holding.name}" (${holding.ticker})?\nFree up ₹${holding.currentValue.toLocaleString('en-IN')} for top replacements.`
    );
    if (!confirm) return;

    setDumpingId(holding.holdingId);
    try {
      await holdingsApi.delete(holding.holdingId);
      setActionMessage(`Dumped ${holding.name}. Freed ₹${holding.currentValue.toLocaleString('en-IN')}.`);
      if (onHoldingDumped) {
        const updated = await onHoldingDumped();
        if (updated) setCurrentPlan(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove holding');
    } finally {
      setDumpingId(null);
    }
  };

  const handleAddRecommendedStock = async (stock: RecommendedStock) => {
    if (!portfolioId) {
      alert('No active portfolio selected.');
      return;
    }
    const defaultAmount = Math.max(10000, plan.totalCapitalFreedFromDump || stock.price * 10);
    const amountStr = window.prompt(
      `Add "${stock.name}" (${stock.symbol})\nEnter amount in ₹:`,
      String(Math.round(defaultAmount))
    );
    if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) <= 0) return;

    setAddingSymbol(stock.symbol);
    try {
      await portfoliosApi.addHolding(portfolioId, {
        name: stock.name,
        ticker: stock.symbol,
        assetClass: 'equity',
        sector: stock.sector,
        currency: 'INR',
        currentValue: Number(amountStr),
        liquidityPeriod: 'short',
      });
      setActionMessage(`Added ${stock.name} (₹${Number(amountStr).toLocaleString('en-IN')})`);
      if (onHoldingDumped) {
        const updated = await onHoldingDumped();
        if (updated) setCurrentPlan(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add holding');
    } finally {
      setAddingSymbol(null);
    }
  };

  const dumpList = currentPlan.dumpList || [];
  const totalFreed = currentPlan.totalCapitalFreedFromDump || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white border-4 border-black shadow-neo-lg w-full max-w-4xl max-h-[92vh] overflow-y-auto p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black/10 pb-3">
          <div>
            <h2 className="font-heading font-black text-xl uppercase tracking-tight">
              Holdings Audit & Stock Replacements
            </h2>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">
              Target: <span className="font-bold text-black font-mono">₹{currentPlan.targetAmount.toLocaleString('en-IN')}</span> by{' '}
              <span className="font-bold text-black">
                {new Date(currentPlan.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>{' '}
              ({currentPlan.timeHorizonYears}Y Horizon)
            </p>
          </div>
          <button
            onClick={onClose}
            className="border-2 border-black bg-white hover:bg-black hover:text-white text-xs font-mono font-bold px-3 py-1 shadow-neo-xs transition-all"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Action alert banner */}
        {actionMessage && (
          <div className="p-2 bg-mint/30 border-2 border-black font-mono text-xs font-bold text-black flex items-center justify-between">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="underline text-[10px]">✕</button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 bg-white border-2 border-black shadow-neo-xs">
            <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold block">Target</span>
            <span className="font-heading font-black text-base text-black">
              ₹{currentPlan.targetAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="p-2.5 bg-white border-2 border-black shadow-neo-xs">
            <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold block">Monthly SIP</span>
            <span className="font-heading font-black text-base text-black">
              ₹{currentPlan.monthlyContribution.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="p-2.5 bg-coral/10 border-2 border-black shadow-neo-xs">
            <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold block">Stocks to Dump</span>
            <span className="font-heading font-black text-base text-coral">
              {dumpList.length} Underperformers
            </span>
          </div>
          <div className="p-2.5 bg-mint/30 border-2 border-black shadow-neo-xs">
            <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold block">Capital Freed</span>
            <span className="font-heading font-black text-base text-black">
              ₹{totalFreed.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Strategic Summary */}
        <div className="px-3 py-2 bg-yellow/15 border-2 border-black flex items-center gap-2 text-xs">
          <span className="font-mono font-bold text-black uppercase shrink-0">Summary:</span>
          <p className="font-body text-black font-semibold truncate">
            {currentPlan.strategicAdvice}
          </p>
        </div>

        {/* Tabs */}
        <div className="space-y-3">
          <div className="flex border-b-2 border-black gap-2">
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 font-mono text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-black text-white border-t-2 border-l-2 border-r-2 border-black -mb-[2px]'
                  : 'bg-muted/40 text-black hover:bg-black/10'
              }`}
            >
              <span>Holdings Audit ({currentPlan.portfolioHoldingsAudit?.length || 0})</span>
              {dumpList.length > 0 && (
                <span className="bg-coral text-white px-1.5 py-0.2 rounded-full text-[9px] font-bold">
                  {dumpList.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('recommended')}
              className={`px-3 py-1.5 font-mono text-xs font-black uppercase transition-all flex items-center gap-1.5 ${
                activeTab === 'recommended'
                  ? 'bg-black text-white border-t-2 border-l-2 border-r-2 border-black -mb-[2px]'
                  : 'bg-muted/40 text-black hover:bg-black/10'
              }`}
            >
              <span>Recommended Replacements ({currentPlan.recommendedStocks.length})</span>
            </button>
          </div>

          {/* TAB 1: Holdings Audit */}
          {activeTab === 'audit' && (
            <div className="space-y-2.5">
              {!currentPlan.portfolioHoldingsAudit || currentPlan.portfolioHoldingsAudit.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-black/30 text-center font-mono text-xs text-muted-foreground">
                  No holdings found in portfolio.
                </div>
              ) : (
                currentPlan.portfolioHoldingsAudit.map((h) => {
                  const isDump = h.verdict === 'DUMP_RECOMMENDED' || h.verdict === 'TRIM_OR_REPLACE';
                  return (
                    <div
                      key={h.holdingId}
                      className={`p-3 border-2 border-black rounded-sm shadow-neo-xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                        isDump ? 'bg-coral/5 border-coral/80' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <StockLogo ticker={h.ticker} name={h.name} size="sm" className="mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading font-extrabold text-sm text-black">
                              {h.name}
                            </span>
                            <span className="px-1.5 py-0.5 bg-black text-white text-[9px] font-mono font-bold">
                              {h.ticker}
                            </span>
                            <span className="px-1.5 py-0.5 bg-muted text-black text-[9px] font-mono uppercase font-bold border border-black/20">
                              {h.sector}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[9px] font-mono uppercase border ${getAuditBadgeStyle(h.verdict)}`}>
                              {h.verdict.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-muted-foreground">
                              Value: ₹{h.currentValue.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground pt-0.5 flex-wrap">
                            <span>
                              1Y:{' '}
                              <strong className={h.oneYearReturnPct >= 0 ? 'text-mint-darker' : 'text-coral'}>
                                {h.oneYearReturnPct >= 0 ? '+' : ''}{h.oneYearReturnPct}%
                              </strong>
                            </span>
                            <span>Vol: <strong>{h.volatilityPct}%</strong></span>
                            <span>MDD: <strong>-{h.maxDrawdownPct}%</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end">
                        {isDump ? (
                          <button
                            onClick={() => handleDumpHolding(h)}
                            disabled={dumpingId === h.holdingId}
                            className="bg-coral hover:bg-black text-white font-mono text-xs font-black uppercase px-3 py-1.5 border-2 border-black shadow-neo-xs hover:shadow-neo transition-all"
                          >
                            {dumpingId === h.holdingId ? 'DUMPING…' : '🗑️ DUMP'}
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-mint-darker font-bold">
                            ✓ KEEP
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Recommended Stocks */}
          {activeTab === 'recommended' && (
            <div className="space-y-2.5">
              {currentPlan.recommendedStocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className="p-3 border-2 border-black bg-white rounded-sm shadow-neo-xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StockLogo ticker={stock.symbol} name={stock.name} size="sm" className="shrink-0" />
                      <span className="font-heading font-extrabold text-sm text-black">
                        {stock.name}
                      </span>
                      <span className="px-1.5 py-0.5 bg-black text-white text-[9px] font-mono font-bold">
                        {stock.symbol}
                      </span>
                      <span className="px-1.5 py-0.5 bg-muted text-black text-[9px] font-mono uppercase font-bold border border-black/20">
                        {stock.sector}
                      </span>
                      {stock.portfolioRole && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-mono uppercase border ${getRoleBadgeStyle(stock.portfolioRole)}`}>
                          {stock.portfolioRole.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    <p className="font-body text-xs text-muted-foreground leading-snug">
                      {stock.fitReason}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground pt-0.5 flex-wrap">
                      <span>
                        1Y:{' '}
                        <strong className={stock.oneYearReturnPct >= 0 ? 'text-mint-darker' : 'text-coral'}>
                          {stock.oneYearReturnPct >= 0 ? '+' : ''}{stock.oneYearReturnPct}%
                        </strong>
                      </span>
                      <span>Vol: <strong>{stock.volatilityPct}%</strong></span>
                      <span>MDD: <strong>-{stock.maxDrawdownPct}%</strong></span>
                      <span>Price: <strong>₹{stock.price.toLocaleString('en-IN')}</strong></span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    <button
                      onClick={() => handleAddRecommendedStock(stock)}
                      disabled={addingSymbol === stock.symbol}
                      className="btn-yellow text-xs font-mono font-bold uppercase py-1.5 px-3 shadow-neo-xs hover:shadow-neo transition-all"
                    >
                      {addingSymbol === stock.symbol ? 'ADDING…' : '+ ADD'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-black/10">
          <button
            onClick={onClose}
            className="btn-yellow px-5 py-2 text-xs font-mono font-bold uppercase shadow-neo-xs hover:shadow-neo transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  portfolioName,
  onDelete,
  onAnalyze,
  isAnalyzing,
}: {
  goal: FinancialGoal;
  portfolioName?: string;
  onDelete: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const daysLeft = daysUntil(goal.targetDate);
  const typeLabel = GOAL_TYPES.find((t) => t.value === goal.goalType)?.label ?? goal.goalType;

  return (
    <div className="neo-card p-4 space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-body text-xs text-muted-foreground">{typeLabel}</span>
            {portfolioName && (
              <span className="px-1.5 py-0.5 bg-black text-yellow text-[9px] font-mono font-bold uppercase">
                {portfolioName}
              </span>
            )}
          </div>
          <h3 className="font-heading font-bold text-lg">{goal.name}</h3>
        </div>
        <div
          className={`pill text-xs ${
            daysLeft < 30
              ? 'bg-coral/20 text-coral border-coral'
              : daysLeft < 180
              ? 'bg-yellow text-black border-black'
              : 'bg-mint text-black border-black'
          }`}
        >
          {daysLeft > 0 ? `${daysLeft} days` : 'PAST DUE'}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="bg-yellow/20 rounded-sm p-2.5 border border-black/10">
          <p className="font-body text-[10px] text-black/60 font-bold uppercase">TARGET</p>
          <p className="font-heading font-bold text-sm">{formatCurrency(goal.targetAmount)}</p>
        </div>
        <div className="bg-blue/10 rounded-sm p-2.5 border border-black/10">
          <p className="font-body text-[10px] text-black/60 font-bold uppercase">RESERVED</p>
          <p className="font-heading font-bold text-sm">{formatCurrency(goal.reservedCash)}</p>
        </div>
        <div className="bg-lavender/10 rounded-sm p-2.5 border border-black/10">
          <p className="font-body text-[10px] text-black/60 font-bold uppercase">LIQUID</p>
          <p className="font-heading font-bold text-sm">{formatCurrency(goal.requiredLiquidAmount)}</p>
        </div>
        <div className="bg-mint/20 rounded-sm p-2.5 border border-black/10">
          <p className="font-body text-[10px] text-black/60 font-bold uppercase">MONTHLY SIP</p>
          <p className="font-heading font-bold text-sm">
            {goal.monthlyContribution ? formatCurrency(goal.monthlyContribution) : '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-black/10 pt-2.5 flex-wrap gap-2 text-xs">
        <div>
          <span className="font-body text-muted-foreground">Target Date: </span>
          <span className="font-heading font-semibold">{formatDate(goal.targetDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="border-2 border-black bg-yellow hover:bg-black hover:text-yellow px-3 py-1.5 text-xs font-mono font-black uppercase shadow-neo-xs hover:shadow-neo transition-all"
          >
            {isAnalyzing ? 'AUDITING…' : '⚡ AUDIT & REALLOCATE'}
          </button>
          {confirming ? (
            <div className="flex gap-1.5">
              <button onClick={onDelete} className="text-coral text-xs font-heading font-bold hover:underline">
                Confirm
              </button>
              <button onClick={() => setConfirming(false)} className="text-black/40 text-xs">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="text-coral text-xs font-heading font-bold hover:underline">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddGoalForm({
  portfolios,
  onDone,
}: {
  portfolios: Portfolio[];
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    portfolioId: portfolios[0]?.id || '',
    goalType: 'custom',
    targetAmount: '',
    targetDate: '',
    reservedCash: '0',
    requiredLiquidAmount: '',
    acceptableShortfall: '0',
    monthlyContribution: '',
    flexibleDate: false,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onDone();
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate({
      name: form.name,
      portfolioId: form.portfolioId || undefined,
      goalType: form.goalType,
      targetAmount: Number(form.targetAmount),
      targetDate: form.targetDate,
      reservedCash: Number(form.reservedCash),
      requiredLiquidAmount: Number(form.requiredLiquidAmount),
      acceptableShortfall: Number(form.acceptableShortfall),
      monthlyContribution: form.monthlyContribution ? Number(form.monthlyContribution) : undefined,
      flexibleDate: form.flexibleDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="neo-card p-5 space-y-3">
      <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
        <h3 className="font-heading font-extrabold text-xl uppercase tracking-tight">NEW FINANCIAL GOAL</h3>
      </div>
      {error && <p className="text-coral text-xs font-semibold">{error}</p>}

      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="font-heading font-bold text-xs block mb-1">Goal Name *</label>
          <input
            required
            className="w-full border-2 border-black rounded-sm px-3 py-1.5 text-xs font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Home Down Payment"
          />
        </div>

        <div>
          <label className="font-heading font-bold text-xs block mb-1">Portfolio</label>
          <select
            className="w-full border-2 border-black rounded-sm px-3 py-1.5 text-xs font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.portfolioId}
            onChange={(e) => setForm({ ...form, portfolioId: e.target.value })}
          >
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.holdings.length} Holdings)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-heading font-bold text-xs block mb-1">Goal Type *</label>
          <select
            className="w-full border-2 border-black rounded-sm px-3 py-1.5 text-xs font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.goalType}
            onChange={(e) => setForm({ ...form, goalType: e.target.value })}
          >
            {GOAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-heading font-bold text-xs block mb-1">Target Date *</label>
          <input
            required
            type="date"
            className="w-full border-2 border-black rounded-sm px-3 py-1.5 text-xs font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.targetDate}
            onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
          />
        </div>

        <div>
          <label className="font-heading font-bold text-xs block mb-1">Target Amount (₹) *</label>
          <input
            required
            type="number"
            min={0}
            className="w-full border-2 border-black rounded-sm px-3 py-1.5 text-xs font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.targetAmount}
            onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
            placeholder="1500000"
          />
        </div>

        <div>
          <label className="font-heading font-bold text-xs block mb-1">Monthly SIP (₹)</label>
          <input
            type="number"
            min={0}
            className="w-full border-2 border-black rounded-sm px-3 py-1.5 text-xs font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.monthlyContribution}
            onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })}
            placeholder="25000"
          />
        </div>

        <div>
          <label className="font-heading font-bold text-xs block mb-1">Required Liquid (₹) *</label>
          <input
            required
            type="number"
            min={0}
            className="w-full border-2 border-black rounded-sm px-3 py-1.5 text-xs font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.requiredLiquidAmount}
            onChange={(e) => setForm({ ...form, requiredLiquidAmount: e.target.value })}
            placeholder="1400000"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-black/10">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-yellow px-5 py-2 text-xs font-mono font-bold uppercase shadow-neo-xs hover:shadow-neo transition-all"
        >
          {mutation.isPending ? 'SAVING…' : 'SAVE GOAL'}
        </button>
        <button type="button" onClick={onDone} className="btn-white px-4 py-2 text-xs font-mono font-bold uppercase">
          CANCEL
        </button>
      </div>
    </form>
  );
}

export default function FinancialGoals() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [activePlan, setActivePlan] = useState<GoalInvestmentPlan | null>(null);
  const [activePlanPortfolioId, setActivePlanPortfolioId] = useState<string | undefined>(undefined);
  const [isAnalyzingGoalId, setIsAnalyzingGoalId] = useState<string | null>(null);

  const [activePlanGoal, setActivePlanGoal] = useState<FinancialGoal | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsApi.list(),
  });

  const { data: portfoliosData } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfoliosApi.list(),
  });

  const portfolioList = (portfoliosData?.portfolios ?? []) as Portfolio[];

  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => goalsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const handleAnalyzeExistingGoal = async (goal: FinancialGoal) => {
    setIsAnalyzingGoalId(goal.id);
    const activeStoredId = getStoredPortfolioId();
    const resolvedActive = resolveActivePortfolio(portfolioList);
    const targetPortfolioId = goal.portfolioId || (activeStoredId ? portfolioList.find(p => p.id === activeStoredId)?.id : undefined) || resolvedActive?.id || portfolioList[0]?.id;
    try {
      const res = await goalsApi.recommendInvestments({
        targetAmount: Number(goal.targetAmount),
        targetDate: goal.targetDate,
        monthlyContribution: Number(goal.monthlyContribution) || 0,
        reservedCash: Number(goal.reservedCash) || 0,
        portfolioId: targetPortfolioId,
      });
      if (res?.recommendation) {
        setActivePlan(res.recommendation);
        setActivePlanPortfolioId(targetPortfolioId);
        setActivePlanGoal(goal);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to analyze goal');
    } finally {
      setIsAnalyzingGoalId(null);
    }
  };

  const handleHoldingDumpedOrAdded = async (): Promise<GoalInvestmentPlan | void> => {
    await queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    await queryClient.invalidateQueries({ queryKey: ['goals'] });
    if (activePlanGoal) {
      try {
        const targetPortfolioId = activePlanPortfolioId || activePlanGoal.portfolioId || portfolioList[0]?.id;
        const res = await goalsApi.recommendInvestments({
          targetAmount: Number(activePlanGoal.targetAmount),
          targetDate: activePlanGoal.targetDate,
          monthlyContribution: Number(activePlanGoal.monthlyContribution) || 0,
          reservedCash: Number(activePlanGoal.reservedCash) || 0,
          portfolioId: targetPortfolioId,
        });
        if (res?.recommendation) {
          setActivePlan(res.recommendation);
          return res.recommendation;
        }
      } catch (e) {
        // ignore
      }
    }
  };

  const goalList = (data?.goals ?? []) as FinancialGoal[];

  return (
    <div className="max-w-4xl space-y-4">
      {/* Modal */}
      {activePlan && (
        <InvestmentPlanModal
          plan={activePlan}
          portfolioId={activePlanPortfolioId}
          onClose={() => setActivePlan(null)}
          onHoldingDumped={handleHoldingDumpedOrAdded}
        />
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between border-b-2 border-black/10 pb-3">
        <div>
          <h1 className="font-heading font-black text-3xl tracking-tight uppercase">FINANCIAL GOALS</h1>
          <p className="font-body text-xs text-muted-foreground">
            Track goals, audit underperforming holdings, and rotate into high-momentum compounders.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-yellow px-4 py-2 text-xs font-mono font-bold uppercase shadow-neo-xs hover:shadow-neo transition-all"
        >
          + Add Goal
        </button>
      </div>

      {showAddForm && (
        <AddGoalForm
          portfolios={portfolioList}
          onDone={() => setShowAddForm(false)}
        />
      )}

      {isLoading ? (
        <div className="font-mono text-xs font-bold text-muted-foreground animate-pulse p-4">Loading goals…</div>
      ) : goalList.length === 0 && !showAddForm ? (
        <div className="neo-card p-8 text-center space-y-3">
          <div className="text-4xl">🎯</div>
          <h2 className="font-heading font-bold text-xl">No Goals Created</h2>
          <p className="font-body text-muted-foreground text-xs">
            Create a goal to audit your holdings against live returns and discover top replacements.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-yellow px-6 py-2.5 text-xs font-mono font-bold uppercase shadow-neo-xs hover:shadow-neo"
          >
            CREATE FIRST GOAL
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goalList.map((goal) => {
            const p = portfolioList.find((port) => port.id === goal.portfolioId);
            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                portfolioName={p?.name}
                onDelete={() => deleteGoalMutation.mutate(goal.id)}
                onAnalyze={() => handleAnalyzeExistingGoal(goal)}
                isAnalyzing={isAnalyzingGoalId === goal.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
