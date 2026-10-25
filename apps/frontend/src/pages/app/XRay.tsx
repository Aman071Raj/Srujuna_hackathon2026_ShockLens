import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { portfolios as portfoliosApi, analysis as analysisApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import type { ExposureResult, ExposureCluster } from '@shocklens/shared';
import { motion } from 'framer-motion';

type Portfolio = {
  id: string;
  name: string;
  holdings: Array<{ id: string; assetClass: string; valueInPortfolioCurrency: number }>;
};

function ClusterCard({ cluster }: { cluster: ExposureCluster }) {
  const [expanded, setExpanded] = useState(false);

  const bgColor =
    cluster.warningLevel === 'critical' ? 'bg-coral/10 border-coral' :
    cluster.warningLevel === 'high' ? 'bg-yellow/30 border-black' :
    cluster.warningLevel === 'moderate' ? 'bg-lavender/10 border-lavender/50' :
    'bg-white border-black/20';

  const barColor =
    cluster.warningLevel === 'critical' ? 'bg-coral' :
    cluster.warningLevel === 'high' ? 'bg-yellow' :
    cluster.warningLevel === 'moderate' ? 'bg-lavender' :
    'bg-blue';

  return (
    <motion.div
      layout
      className={`border-2 rounded-lg p-4 cursor-pointer ${bgColor}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-body text-xs text-muted-foreground uppercase bg-black/10 px-2 py-0.5 rounded-sm">
            {cluster.dimension}
          </span>
          <span className="font-heading font-bold text-lg">{cluster.label}</span>
          {cluster.warningLevel !== 'none' && (
            <span className={`pill text-xs ${
              cluster.warningLevel === 'critical' ? 'bg-coral text-white border-coral' :
              cluster.warningLevel === 'high' ? 'bg-yellow text-black border-black' :
              'bg-lavender/30 text-lavender border-lavender'
            }`}>
              {cluster.warningLevel.toUpperCase()}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="font-heading font-extrabold text-xl">{(cluster.portfolioPercent * 100).toFixed(1)}%</p>
          <p className="font-body text-xs text-muted-foreground">{formatCurrency(cluster.totalValue)}</p>
        </div>
      </div>

      <div className="h-2.5 bg-black/10 rounded-sm overflow-hidden mb-2">
        <motion.div
          className={`h-full rounded-sm ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${cluster.portfolioPercent * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-black/10"
        >
          <p className="font-body text-xs text-muted-foreground mb-2">
            {cluster.holdingNames.length} holding{cluster.holdingNames.length !== 1 ? 's' : ''}:
          </p>
          <div className="flex flex-wrap gap-2">
            {cluster.holdingNames.map(name => (
              <span key={name} className="pill bg-black/5 border-black/20 text-sm">{name}</span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function XRay() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [result, setResult] = useState<ExposureResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const { data: portfoliosData } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfoliosApi.list(),
  });

  const portfolioList = (portfoliosData?.portfolios ?? []) as Portfolio[];
  const portfolioId = selectedPortfolioId || portfolioList[0]?.id || '';

  const mutation = useMutation({
    mutationFn: () => analysisApi.exposure(portfolioId),
    onSuccess: (data) => setResult(data.result as ExposureResult),
  });

  const dimensions = ['all', 'sector', 'asset_class', 'currency', 'geography', 'tag'];
  const filteredClusters = result?.clusters.filter(c =>
    activeFilter === 'all' || c.dimension === activeFilter,
  ) ?? [];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-4xl mb-1">PORTFOLIO X-RAY</h1>
        <p className="font-body text-muted-foreground">
          Detect hidden concentration across sectors, currencies, geographies, and shared exposure tags.
        </p>
      </div>

      {portfolioList.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {portfolioList.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPortfolioId(p.id)}
              className={`px-4 py-2 border-2 border-black rounded-sm font-heading font-bold text-sm ${
                portfolioId === p.id ? 'bg-black text-yellow' : 'bg-white hover:bg-yellow/20'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => mutation.mutate()}
          disabled={!portfolioId || mutation.isPending}
          className="btn-yellow px-6 py-3"
        >
          {mutation.isPending ? '🔬 ANALYZING...' : '🔬 RUN X-RAY'}
        </button>
        {result && (
          <button onClick={() => setResult(null)} className="btn-white px-6 py-3">
            ↺ Reset
          </button>
        )}
      </div>

      {mutation.isError && (
        <div className="bg-coral/20 border-2 border-coral rounded-sm p-4 text-coral font-semibold">
          Error: {(mutation.error as Error).message}
        </div>
      )}

      {result && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="metric-card bg-yellow/30">
              <p className="font-body text-xs text-black/60">PORTFOLIO VALUE</p>
              <p className="font-heading font-extrabold text-xl">{formatCurrency(result.totalPortfolioValue)}</p>
            </div>
            <div className="metric-card bg-coral/10">
              <p className="font-body text-xs text-black/60">LARGEST CLUSTER</p>
              <p className="font-heading font-extrabold text-xl">
                {(result.largestCluster.portfolioPercent * 100).toFixed(1)}%
              </p>
              <p className="font-body text-xs text-muted-foreground truncate">{result.largestCluster.label}</p>
            </div>
            <div className="metric-card">
              <p className="font-body text-xs text-black/60">WARNINGS</p>
              <p className="font-heading font-extrabold text-xl">{result.concentrationWarnings.length}</p>
            </div>
            <div className="metric-card bg-lavender/10">
              <p className="font-body text-xs text-black/60">CLUSTERS</p>
              <p className="font-heading font-extrabold text-xl">{result.clusters.length}</p>
            </div>
          </div>

          {/* Warnings */}
          {result.concentrationWarnings.length > 0 && (
            <div className="border-2 border-coral bg-coral/10 rounded-lg p-4 space-y-2">
              <h3 className="font-heading font-bold text-coral text-lg">⚠ Concentration Warnings</h3>
              {result.concentrationWarnings.map((w, i) => (
                <p key={i} className="font-body text-sm">{w}</p>
              ))}
            </div>
          )}

          {/* Dimension filter */}
          <div className="flex gap-2 overflow-x-auto">
            {dimensions.map(d => (
              <button
                key={d}
                onClick={() => setActiveFilter(d)}
                className={`px-3 py-1.5 border-2 border-black rounded-sm font-heading font-bold text-xs whitespace-nowrap ${
                  activeFilter === d ? 'bg-black text-yellow' : 'bg-white hover:bg-yellow/20'
                }`}
              >
                {d.toUpperCase().replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Clusters */}
          <div className="space-y-3">
            {filteredClusters.map(cluster => (
              <ClusterCard
                key={`${cluster.dimension}-${cluster.label}`}
                cluster={cluster}
              />
            ))}
            {filteredClusters.length === 0 && (
              <p className="font-body text-muted-foreground text-center py-8">
                No clusters for this filter.
              </p>
            )}
          </div>

          <div className="disclaimer-banner">
            <strong>NOTE:</strong> Shared categories indicate structural overlap, not statistical correlation. 
            ShockLens does not model correlations between holdings.
          </div>
        </>
      )}

      {!result && !mutation.isPending && portfolioId && (
        <div className="neo-card p-12 text-center">
          <div className="text-5xl mb-4">🔬</div>
          <h2 className="font-heading font-bold text-2xl mb-2">Ready to X-Ray</h2>
          <p className="font-body text-muted-foreground">
            Click "Run X-Ray" to detect hidden concentration in your portfolio.
          </p>
        </div>
      )}
    </div>
  );
}
