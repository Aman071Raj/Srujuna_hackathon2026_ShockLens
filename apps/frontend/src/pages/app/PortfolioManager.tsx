import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolios as portfoliosApi, holdings as holdingsApi } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import type { CreateHoldingInput } from '@shocklens/shared';
import { getStoredPortfolioId, setStoredPortfolioId } from '../../lib/useActivePortfolio';

type Portfolio = {
  id: string;
  name: string;
  currency: string;
  holdings: Array<{
    id: string;
    name: string;
    ticker?: string;
    assetClass: string;
    sector?: string;
    currency: string;
    valueInPortfolioCurrency: number;
    liquidityPeriod: string;
    exposureTags: string[];
  }>;
};

const ASSET_CLASSES = ['equity','fixed_income','real_estate','commodity','cash','crypto','alternative','other'];
const LIQUIDITY_PERIODS = ['immediate','short','medium','long','illiquid'];

function HoldingRow({
  holding,
  onDelete,
}: {
  holding: Portfolio['holdings'][0];
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <tr className="border-b border-black/10 hover:bg-yellow/10">
      <td className="px-4 py-3">
        <div>
          <p className="font-heading font-semibold text-sm">{holding.name}</p>
          {holding.ticker && <p className="font-body text-xs text-muted-foreground">{holding.ticker}</p>}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="pill bg-blue/20 border-black/30 text-black">{holding.assetClass}</span>
      </td>
      <td className="px-4 py-3 font-body text-sm">{holding.sector ?? '—'}</td>
      <td className="px-4 py-3 font-heading font-bold text-sm">{formatCurrency(holding.valueInPortfolioCurrency)}</td>
      <td className="px-4 py-3">
        <span className={`pill ${
          holding.liquidityPeriod === 'immediate' || holding.liquidityPeriod === 'short'
            ? 'bg-mint text-black border-black'
            : holding.liquidityPeriod === 'illiquid'
              ? 'bg-coral/20 text-coral border-coral'
              : 'bg-yellow/30 text-black border-black'
        }`}>{holding.liquidityPeriod}</span>
      </td>
      <td className="px-4 py-3">
        {holding.exposureTags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {holding.exposureTags.slice(0, 3).map(t => (
              <span key={t} className="pill bg-lavender/20 text-lavender border-lavender/30 text-xs">{t}</span>
            ))}
            {holding.exposureTags.length > 3 && (
              <span className="font-body text-xs text-muted-foreground">+{holding.exposureTags.length - 3}</span>
            )}
          </div>
        ) : '—'}
      </td>
      <td className="px-4 py-3">
        {confirming ? (
          <div className="flex gap-2">
            <button onClick={() => onDelete(holding.id)} className="text-coral text-xs font-heading font-bold hover:underline">Confirm</button>
            <button onClick={() => setConfirming(false)} className="text-black/40 text-xs">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="text-coral text-xs font-heading font-bold hover:underline">Delete</button>
        )}
      </td>
    </tr>
  );
}

function AddHoldingForm({ portfolioId, onDone }: { portfolioId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<CreateHoldingInput>>({
    assetClass: 'equity',
    liquidityPeriod: 'short',
    currency: 'INR',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => portfoliosApi.addHolding(portfolioId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      onDone();
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.currentValue) { setError('Name and value are required'); return; }
    mutation.mutate({
      ...form,
      currentValue: Number(form.currentValue),
      exposureTags: typeof form.exposureTags === 'string'
        ? (form.exposureTags as string).split(',').map((t: string) => t.trim()).filter(Boolean)
        : [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="neo-card p-6 space-y-4">
      <h3 className="font-heading font-bold text-xl">ADD HOLDING</h3>
      {error && <p className="text-coral text-sm font-semibold">{error}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="font-heading font-bold text-sm block mb-1">Name *</label>
          <input
            required
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.name ?? ''}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Apple Inc."
          />
        </div>
        <div>
          <label className="font-heading font-bold text-sm block mb-1">Ticker</label>
          <input
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.ticker ?? ''}
            onChange={e => setForm({ ...form, ticker: e.target.value })}
            placeholder="AAPL"
          />
        </div>
        <div>
          <label className="font-heading font-bold text-sm block mb-1">Asset Class *</label>
          <select
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.assetClass}
            onChange={e => setForm({ ...form, assetClass: e.target.value as CreateHoldingInput['assetClass'] })}
          >
            {ASSET_CLASSES.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="font-heading font-bold text-sm block mb-1">Sector</label>
          <input
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.sector ?? ''}
            onChange={e => setForm({ ...form, sector: e.target.value })}
            placeholder="technology"
          />
        </div>
        <div>
          <label className="font-heading font-bold text-sm block mb-1">Currency *</label>
          <input
            required
            maxLength={3}
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow uppercase"
            value={form.currency ?? 'INR'}
            onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })}
            placeholder="USD"
          />
        </div>
        <div>
          <label className="font-heading font-bold text-sm block mb-1">Current Value *</label>
          <input
            required
            type="number"
            min={0}
            step={0.01}
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.currentValue ?? ''}
            onChange={e => setForm({ ...form, currentValue: Number(e.target.value) })}
            placeholder="10000"
          />
        </div>
        <div>
          <label className="font-heading font-bold text-sm block mb-1">Liquidity Period *</label>
          <select
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={form.liquidityPeriod}
            onChange={e => setForm({ ...form, liquidityPeriod: e.target.value as CreateHoldingInput['liquidityPeriod'] })}
          >
            {LIQUIDITY_PERIODS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="font-heading font-bold text-sm block mb-1">Exposure Tags (comma-separated)</label>
          <input
            className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
            value={typeof form.exposureTags === 'string' ? form.exposureTags : (form.exposureTags ?? []).join(', ')}
            onChange={e => setForm({ ...form, exposureTags: e.target.value as unknown as string[] })}
            placeholder="tech, AI, semiconductor"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={mutation.isPending} className="btn-yellow px-6 py-3">
          {mutation.isPending ? 'ADDING...' : 'ADD HOLDING'}
        </button>
        <button type="button" onClick={onDone} className="btn-white px-6 py-3">
          CANCEL
        </button>
      </div>
    </form>
  );
}

export default function PortfolioManager() {
  const queryClient = useQueryClient();
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(() => getStoredPortfolioId());
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfoliosApi.list(),
  });

  const portfolioList = (data?.portfolios ?? []) as Portfolio[];
  const activePortfolio = portfolioList.find(p => p.id === selectedPortfolioId) ?? portfolioList[0];

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

  const createPortfolioMutation = useMutation({
    mutationFn: () => portfoliosApi.create({ name: newPortfolioName, currency: 'INR' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setSelectedPortfolioId((res.portfolio as Portfolio).id);
      setShowAddPortfolio(false);
      setNewPortfolioName('');
    },
  });

  const deleteHoldingMutation = useMutation({
    mutationFn: holdingsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolios'] }),
  });

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePortfolio) return;
    try {
      const result = await portfoliosApi.importCsv(activePortfolio.id, file);
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      alert(`Imported ${result.imported} holdings. ${result.failed} failed.`);
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const filteredHoldings = activePortfolio?.holdings.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.ticker ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (h.sector ?? '').toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  if (isLoading) return <div className="font-heading font-bold text-xl">Loading portfolios...</div>;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-4xl">MY PORTFOLIO</h1>
          <p className="font-body text-muted-foreground">Manage your holdings and allocations.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddPortfolio(true)} className="btn-white px-4 py-2 text-sm">
            + New Portfolio
          </button>
        </div>
      </div>

      {/* Portfolio selector */}
      {portfolioList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {portfolioList.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectPortfolio(p.id)}
              className={`px-4 py-2 border-2 border-black rounded-sm font-heading font-bold text-sm whitespace-nowrap ${
                (activePortfolio?.id === p.id) ? 'bg-black text-yellow' : 'bg-white hover:bg-yellow/20'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* New portfolio form */}
      {showAddPortfolio && (
        <div className="neo-card p-5">
          <h3 className="font-heading font-bold mb-3">CREATE PORTFOLIO</h3>
          <div className="flex gap-3">
            <input
              className="flex-1 border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
              placeholder="Portfolio name"
              value={newPortfolioName}
              onChange={e => setNewPortfolioName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createPortfolioMutation.mutate()}
            />
            <button onClick={() => createPortfolioMutation.mutate()} className="btn-yellow px-5 py-2">
              CREATE
            </button>
            <button onClick={() => setShowAddPortfolio(false)} className="btn-white px-5 py-2">
              CANCEL
            </button>
          </div>
        </div>
      )}

      {activePortfolio ? (
        <>
          {/* Portfolio stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="metric-card bg-yellow/30">
              <p className="font-body text-xs text-black/60">TOTAL VALUE</p>
              <p className="font-heading font-extrabold text-2xl">
                {formatCurrency(activePortfolio.holdings.reduce((s, h) => s + h.valueInPortfolioCurrency, 0))}
              </p>
            </div>
            <div className="metric-card bg-blue/20">
              <p className="font-body text-xs text-black/60">HOLDINGS</p>
              <p className="font-heading font-extrabold text-2xl">{activePortfolio.holdings.length}</p>
            </div>
            <div className="metric-card">
              <p className="font-body text-xs text-black/60">CURRENCY</p>
              <p className="font-heading font-extrabold text-2xl">{activePortfolio.currency}</p>
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              className="border-2 border-black rounded-sm px-3 py-2 font-body text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
              placeholder="🔍 Search holdings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button onClick={() => setShowAddHolding(true)} className="btn-yellow px-4 py-2 text-sm">
              + Add Holding
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-mint px-4 py-2 text-sm">
              ↑ Import CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            <button
              onClick={async () => {
                const res = await portfoliosApi.csvTemplate();
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'shocklens-template.csv'; a.click();
              }}
              className="btn-white px-4 py-2 text-sm"
            >
              ↓ CSV Template
            </button>
          </div>

          {/* Add holding form */}
          {showAddHolding && (
            <AddHoldingForm
              portfolioId={activePortfolio.id}
              onDone={() => setShowAddHolding(false)}
            />
          )}

          {/* Holdings table */}
          <div className="neo-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-black text-yellow">
                  <tr>
                    {['Name / Ticker', 'Asset Class', 'Sector', 'Value', 'Liquidity', 'Tags', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-heading text-xs font-bold uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center font-body text-muted-foreground">
                        {search ? 'No holdings match your search.' : 'No holdings yet. Add your first holding above.'}
                      </td>
                    </tr>
                  ) : (
                    filteredHoldings.map(h => (
                      <HoldingRow
                        key={h.id}
                        holding={h}
                        onDelete={(id) => deleteHoldingMutation.mutate(id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="neo-card p-12 text-center">
          <div className="text-4xl mb-4">💼</div>
          <h2 className="font-heading font-bold text-2xl mb-2">No Portfolios Yet</h2>
          <p className="font-body text-muted-foreground mb-6">Create your first portfolio to get started.</p>
          <button onClick={() => setShowAddPortfolio(true)} className="btn-yellow px-8 py-4">
            CREATE PORTFOLIO
          </button>
        </div>
      )}
    </div>
  );
}
