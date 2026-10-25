import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reports as reportsApi, portfolios as portfoliosApi, goals as goalsApi } from '../../lib/api';
import { downloadReportPdf, downloadReportImage, type ReportData } from '../../lib/reportExport';

type Report = { id: string; title: string; generatedAt: string; portfolioId?: string; goalId?: string };

export default function Reports() {
  const queryClient = useQueryClient();
  const [portfolioId, setPortfolioId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [title, setTitle] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: reportsData } = useQuery({ queryKey: ['reports'], queryFn: () => reportsApi.list() });
  const { data: portfoliosData } = useQuery({ queryKey: ['portfolios'], queryFn: () => portfoliosApi.list() });
  const { data: goalsData } = useQuery({ queryKey: ['goals'], queryFn: () => goalsApi.list() });

  const reportList = (reportsData?.reports ?? []) as Report[];
  const portfolioList = (portfoliosData?.portfolios ?? []) as Array<{ id: string; name: string }>;
  const goalList = (goalsData?.goals ?? []) as Array<{ id: string; name: string }>;
  const activePortfolioId = portfolioId || portfolioList[0]?.id || '';

  const mutation = useMutation({
    mutationFn: () => reportsApi.create({
      portfolioId: activePortfolioId,
      goalId: goalId || undefined,
      title: title || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setTitle('');
    },
  });

  const handleDownload = async (report: Report, format: 'pdf' | 'png') => {
    try {
      setDownloadingId(`${report.id}-${format}`);
      const res = await reportsApi.download(report.id);
      const data = (await res.json()) as ReportData;

      if (format === 'pdf') {
        await downloadReportPdf(report.title, report.generatedAt, data);
      } else {
        await downloadReportImage(report.title, report.generatedAt, data);
      }
    } catch (err) {
      alert(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-4xl mb-1">REPORTS</h1>
        <p className="font-body text-muted-foreground">
          Generate and export portfolio analysis reports as PDF or Image.
        </p>
      </div>

      {/* Generate report */}
      <div className="neo-card p-6 space-y-4">
        <h3 className="font-heading font-bold text-xl">GENERATE NEW REPORT</h3>
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
            <label className="font-heading font-bold text-sm block mb-2">REPORT TITLE (optional)</label>
            <input
              className="w-full border-2 border-black rounded-sm px-3 py-2 font-body bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Auto-generated if blank"
            />
          </div>
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={!activePortfolioId || mutation.isPending}
          className="btn-yellow px-6 py-3"
        >
          {mutation.isPending ? 'GENERATING...' : '📋 GENERATE REPORT'}
        </button>
      </div>

      {/* Reports list */}
      {reportList.length === 0 ? (
        <div className="neo-card p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="font-heading font-bold text-2xl mb-2">No Reports Yet</h2>
          <p className="font-body text-muted-foreground">Generate your first report above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reportList.map(report => (
            <div key={report.id} className="neo-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-bold">{report.title}</h3>
                <p className="font-body text-xs text-muted-foreground">
                  Generated: {new Date(report.generatedAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(report, 'pdf')}
                  disabled={Boolean(downloadingId)}
                  className="btn-yellow px-3.5 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 shadow-neo-xs hover:shadow-neo transition-all"
                >
                  <span>{downloadingId === `${report.id}-pdf` ? 'Exporting PDF…' : '📄 Download PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(report, 'png')}
                  disabled={Boolean(downloadingId)}
                  className="btn-white px-3.5 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 shadow-neo-xs hover:shadow-neo transition-all"
                >
                  <span>{downloadingId === `${report.id}-png` ? 'Exporting IMG…' : '🖼️ Download Image'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="disclaimer-banner">
        Reports include portfolio summaries, scenario results, and analyses run during your session.
        All figures are hypothetical — not financial advice.
      </div>
    </div>
  );
}
