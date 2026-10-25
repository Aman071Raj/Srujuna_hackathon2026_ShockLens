import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { butterfly, portfolios } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { getStoredPortfolioId, resolveActivePortfolio } from '../../lib/useActivePortfolio';

export default function ShockImmunity() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(() => getStoredPortfolioId());
  const [budget, setBudget] = useState<number>(10000);

  const { data: userPortfoliosData } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfolios.list(),
  });

  const portfolioList = (userPortfoliosData?.portfolios ?? []) as Array<{ id: string; name: string }>;
  const activePortfolio = portfolioList.find(p => p.id === selectedPortfolioId) ?? resolveActivePortfolio(portfolioList);

  const immunityMutation = useMutation({
    mutationFn: (customBudget?: number) =>
      butterfly.getShockImmunity({
        portfolioId: activePortfolio?.id,
        budgetAmount: customBudget !== undefined ? customBudget : budget,
      }),
  });

  useEffect(() => {
    if (activePortfolio?.id) {
      immunityMutation.mutate(budget);
    }
  }, [activePortfolio?.id]);

  const result = immunityMutation.data?.result;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Minimal Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-black text-3xl uppercase tracking-tight">
            Shock Immunity
          </h1>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            Portfolio Evaluated: <span className="font-bold text-black">{activePortfolio?.name || 'Active Portfolio'}</span>
          </p>
        </div>

        {/* Protection Budget Input */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-muted-foreground uppercase">Hedge Capital:</span>
          <div className="flex items-center border-2 border-black bg-white rounded-sm px-3 py-1.5 shadow-neo-xs">
            <span className="font-mono font-bold mr-1">₹</span>
            <input
              type="number"
              min="1000"
              step="1000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value) || 0)}
              className="w-24 font-heading font-bold text-sm bg-transparent focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => immunityMutation.mutate(budget)}
            disabled={immunityMutation.isPending}
            className="btn-yellow px-4 py-2 text-xs font-mono font-bold uppercase shadow-neo-xs hover:shadow-neo transition-all"
          >
            {immunityMutation.isPending ? 'Calculating…' : 'Recalculate'}
          </button>
        </div>
      </div>

      {/* Summary Impact Metrics Card */}
      {result && (
        <div className="neo-card p-5 bg-white border-4 border-black">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-black/10">
            <div>
              <span className="text-[10px] font-mono uppercase bg-black text-yellow px-2 py-0.5 font-bold">
                Vulnerability Diagnosis
              </span>
              <h2 className="font-heading font-extrabold text-lg mt-1 text-black">
                {result.primaryVulnerability}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-muted-foreground">Immunity Score:</span>
              <span className="px-3 py-1 bg-mint text-black border border-black font-heading font-black text-sm">
                +{result.overallRiskReductionPct}% Risk Reduced
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs font-body">
            <div className="p-3 bg-coral/10 border border-coral rounded-sm">
              <span className="font-mono text-[10px] text-coral uppercase block font-bold">Downside At Risk (Unhedged)</span>
              <span className="font-heading font-black text-xl text-coral">
                -₹{result.currentDownsideAtRisk.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-mint/20 border border-black rounded-sm">
              <span className="font-mono text-[10px] text-black uppercase block font-bold">Protected Downside (With Immunity)</span>
              <span className="font-heading font-black text-xl text-black">
                -₹{result.protectedDownsideValue.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3 bg-yellow/30 border border-black rounded-sm">
              <span className="font-mono text-[10px] text-black uppercase block font-bold">Total Capital to Deploy</span>
              <span className="font-heading font-black text-xl text-black">
                ₹{result.budgetAllocated.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Immunity Allocations */}
      {result && (
        <div className="neo-card p-5 bg-white border-2 border-black">
          <div className="flex items-center justify-between mb-4 border-b border-black/10 pb-2">
            <h3 className="font-heading font-black text-base uppercase tracking-tight">
              Recommended Counter-Balance Assets
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">
              Direct NSE / BSE Tickers
            </span>
          </div>

          <div className="space-y-3">
            {result.recommendedHedges.map((hedge) => (
              <div
                key={hedge.id}
                className="p-4 border-2 border-black bg-white hover:bg-yellow/5 rounded-sm shadow-neo-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-extrabold text-base text-black">
                      {hedge.name}
                    </span>
                    <span className="px-2 py-0.5 bg-black text-white text-[10px] font-mono font-bold">
                      {hedge.ticker}
                    </span>
                    <span className="px-2 py-0.5 bg-muted text-black text-[9px] font-mono uppercase font-bold border border-black/20">
                      {hedge.instrumentType}
                    </span>
                  </div>
                  <p className="font-body text-xs text-muted-foreground">
                    {hedge.hedgeReason}
                  </p>
                  <p className="font-mono text-[10px] text-coral font-bold">
                    Mitigates: {hedge.riskMitigated}
                  </p>
                </div>

                <div className="text-right shrink-0 border-t md:border-t-0 md:border-l border-black/10 pt-2 md:pt-0 md:pl-4">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                    Deploy ({hedge.recommendedAllocationPct}%)
                  </span>
                  <span className="font-heading font-black text-xl text-black block">
                    ₹{hedge.recommendedAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-mono text-mint-darker font-bold block">
                    +{hedge.expectedProtectionPct}% Downside Cushion
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {immunityMutation.isPending && !result && (
        <div className="neo-card p-12 text-center text-xs font-mono text-muted-foreground animate-pulse">
          Analyzing current portfolio risks and finding optimal protective hedges…
        </div>
      )}
    </div>
  );
}
