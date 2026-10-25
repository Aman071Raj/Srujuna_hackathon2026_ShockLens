import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ReportData {
  portfolio?: {
    id: string;
    name: string;
    currency: string;
    holdingCount: number;
    totalValue: number;
  };
  goal?: {
    id: string;
    name: string;
    targetAmount: number;
    targetDate: string;
  } | null;
  analyses?: Array<{
    type: string;
    createdAt: string;
    result: any;
  }>;
  disclaimer?: string;
}

export function buildReportHtml(title: string, generatedAt: string, data: ReportData): HTMLElement {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#111111';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.padding = '40px';
  container.style.boxSizing = 'border-box';

  const currencySymbol = '₹';
  const totalVal = data.portfolio?.totalValue != null 
    ? `${currencySymbol}${Number(data.portfolio.totalValue).toLocaleString('en-IN')}` 
    : '—';

  const goalTarget = data.goal?.targetAmount != null
    ? `${currencySymbol}${Number(data.goal.targetAmount).toLocaleString('en-IN')}`
    : '—';

  container.innerHTML = `
    <div style="border-bottom: 3px solid #111111; padding-bottom: 20px; margin-bottom: 25px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span style="display: inline-block; background-color: #D9F342; color: #111; border: 1.5px solid #111; font-size: 11px; font-weight: 800; padding: 3px 8px; text-transform: uppercase; margin-bottom: 8px;">
            ShockLens Portfolio Intelligence
          </span>
          <h1 style="font-size: 26px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">
            ${title}
          </h1>
          <p style="font-size: 12px; color: #555555; margin: 5px 0 0 0;">
            Generated on ${new Date(generatedAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
        <div style="border: 2px solid #111111; background-color: #111111; color: #ffffff; padding: 8px 14px; text-align: center;">
          <div style="font-size: 10px; text-transform: uppercase; opacity: 0.8; letter-spacing: 1px;">Currency</div>
          <div style="font-size: 16px; font-weight: 800;">INR (₹)</div>
        </div>
      </div>
    </div>

    <!-- Portfolio Summary Cards -->
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 25px;">
      <div style="border: 2px solid #111111; padding: 15px; background-color: #fafafa;">
        <div style="font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; margin-bottom: 4px;">Portfolio Name</div>
        <div style="font-size: 18px; font-weight: 800;">${data.portfolio?.name || 'Default Portfolio'}</div>
        <div style="font-size: 11px; color: #888; margin-top: 4px;">${data.portfolio?.holdingCount ?? 0} Holdings Recorded</div>
      </div>

      <div style="border: 2px solid #111111; padding: 15px; background-color: #D9F342; background-color: #f7fee7;">
        <div style="font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; margin-bottom: 4px;">Total Portfolio Value</div>
        <div style="font-size: 22px; font-weight: 900; color: #111;">${totalVal}</div>
        <div style="font-size: 11px; color: #166534; font-weight: 600; margin-top: 4px;">Real-Time Valuation</div>
      </div>

      <div style="border: 2px solid #111111; padding: 15px; background-color: #fafafa;">
        <div style="font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; margin-bottom: 4px;">Linked Financial Goal</div>
        <div style="font-size: 18px; font-weight: 800;">${data.goal?.name || 'No Target Linked'}</div>
        <div style="font-size: 11px; color: #888; margin-top: 4px;">${data.goal ? `Target: ${goalTarget}` : 'Unconstrained'}</div>
      </div>
    </div>

    <!-- Analyses Overview -->
    <div style="border: 2px solid #111111; padding: 20px; margin-bottom: 25px; background-color: #ffffff;">
      <h2 style="font-size: 14px; font-weight: 800; text-transform: uppercase; margin: 0 0 15px 0; border-bottom: 1.5px solid #eee; padding-bottom: 8px;">
        Executed Stress Simulations &amp; Diagnostics (${data.analyses?.length ?? 0})
      </h2>
      ${
        data.analyses && data.analyses.length > 0
          ? `
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background-color: #f3f3f3; border-bottom: 2px solid #111; text-align: left;">
                  <th style="padding: 8px;">Analysis Type</th>
                  <th style="padding: 8px;">Execution Date</th>
                  <th style="padding: 8px;">Key Metric / Output</th>
                </tr>
              </thead>
              <tbody>
                ${data.analyses.slice(0, 10).map((a, i) => `
                  <tr style="border-bottom: 1px solid #eee; background-color: ${i % 2 === 0 ? '#ffffff' : '#fafafa'};">
                    <td style="padding: 8px; font-weight: 700; text-transform: uppercase; font-size: 11px;">${a.type}</td>
                    <td style="padding: 8px; color: #666;">${new Date(a.createdAt).toLocaleDateString()}</td>
                    <td style="padding: 8px; font-family: monospace;">
                      ${
                        a.result?.shockedPortfolioValue != null
                          ? `Shocked Value: ${currencySymbol}${Number(a.result.shockedPortfolioValue).toLocaleString('en-IN')}`
                          : a.result?.netMonetaryImpact != null
                          ? `Impact: ${a.result.netMonetaryImpact >= 0 ? '+' : ''}${currencySymbol}${Number(a.result.netMonetaryImpact).toLocaleString('en-IN')}`
                          : a.result?.portfolioSummary?.netMonetaryImpact != null
                          ? `Butterfly Impact: ${a.result.portfolioSummary.netMonetaryImpact >= 0 ? '+' : ''}${currencySymbol}${Number(a.result.portfolioSummary.netMonetaryImpact).toLocaleString('en-IN')}`
                          : 'Completed successfully'
                      }
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `
          : '<p style="font-size: 12px; color: #666; margin: 0;">No prior stress test runs recorded for this portfolio snapshot.</p>'
      }
    </div>

    <!-- Official Footer & Compliance Notice -->
    <div style="border-top: 1.5px solid #111; padding-top: 15px; font-size: 10px; color: #666; line-height: 1.5;">
      <p style="margin: 0 0 5px 0; font-weight: 700; text-transform: uppercase;">
        Confidential Financial Risk Assessment — ShockLens Platform
      </p>
      <p style="margin: 0;">
        ${data.disclaimer || 'All analyses, simulations, and stress tests contained in this report are hypothetical calculations derived from historical statistical relationships and user-specified market scenarios. Not investment advice or a guarantee of future outcomes.'}
      </p>
    </div>
  `;

  return container;
}

export async function downloadReportPdf(title: string, generatedAt: string, data: ReportData) {
  const container = buildReportHtml(title, generatedAt, data);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const imgWidth = 595.28; // A4 width in pt
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`shocklens-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

export async function downloadReportImage(title: string, generatedAt: string, data: ReportData) {
  const container = buildReportHtml(title, generatedAt, data);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = imgData;
    a.download = `shocklens-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    a.click();
  } finally {
    document.body.removeChild(container);
  }
}
