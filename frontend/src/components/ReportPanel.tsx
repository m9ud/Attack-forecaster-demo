/* ── Auto Report Generator Panel ─────────────────────────────────────────── */
import { useState } from 'react';
import { useStore } from '../store';
import { FileTextIcon, DownloadIcon, LoaderIcon, AlertTriangleIcon } from './Icons';

export default function ReportPanel() {
  const analysis       = useStore((s: any) => s.analysis);
  const reportData     = useStore((s: any) => s.reportData);
  const reportLoading  = useStore((s: any) => s.reportLoading);
  const generateReport = useStore((s: any) => s.generateReport);
  const analysisParams = useStore((s: any) => s.analysisParams);

  const [preview, setPreview] = useState(false);

  const markdown: string = reportData?.markdown ?? '';

  /* ── download helpers ─────────────────────────────────────────────── */
  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `attack-path-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printToPDF() {
    if (!markdown) return;
    const win = window.open('', '_blank')!;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Attack Path Assessment Report</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; color: #1a1a1a; }
          h1 { color: #1a1a2e; border-bottom: 3px solid #ef4444; padding-bottom: 8px; }
          h2 { color: #2d3456; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 32px; }
          h3 { color: #374151; margin-top: 24px; }
          h4 { color: #4b5563; }
          table { border-collapse: collapse; width: 100%; margin: 16px 0; }
          th { background: #1e2236; color: #e1e4ed; padding: 8px 12px; text-align: left; }
          td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #f8f9fa; }
          code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
          pre { background: #1e2236; color: #e1e4ed; padding: 16px; border-radius: 8px; overflow-x: auto; }
          blockquote { border-left: 4px solid #ef4444; padding: 8px 16px; background: #fef2f2; margin: 12px 0; }
          hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <pre style="display:none" id="raw">${markdown.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
        <div id="content"></div>
        <script>
          // Very simple markdown to HTML (tables, headers, bold, code, blockquotes, hr)
          function mdToHtml(md) {
            return md
              .replace(/^#{4} (.+)$/gm, '<h4>$1</h4>')
              .replace(/^#{3} (.+)$/gm, '<h3>$1</h3>')
              .replace(/^#{2} (.+)$/gm, '<h2>$1</h2>')
              .replace(/^# (.+)$/gm, '<h1>$1</h1>')
              .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
              .replace(/\\_(.+?)\\_/g, '<em>$1</em>')
              .replace(/\`\`\`[\\s\\S]*?\`\`\`/gm, m => '<pre>' + m.slice(3,-3) + '</pre>')
              .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
              .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
              .replace(/^---$/gm, '<hr/>')
              .replace(/\\n\\n/g, '</p><p>')
              .replace(/^\\| .+/gm, m => {
                if (m.includes('---|')) return '';
                const cells = m.split('|').filter(Boolean).map(c => c.trim());
                return '<tr>' + cells.map(c => '<td>' + c + '</td>').join('') + '</tr>';
              })
              .replace(/(<tr>.+<\\/tr>\\n?)+/g, m => '<table>' + m + '</table>');
          }
          const raw = document.getElementById('raw').textContent;
          document.getElementById('content').innerHTML = '<p>' + mdToHtml(raw) + '</p>';
          setTimeout(() => window.print(), 500);
        </script>
      </body>
      </html>
    `);
    win.document.close();
  }

  /* ── no analysis yet ──────────────────────────────────────────────── */
  if (!analysis) {
    return (
      <div className="panel-empty">
        <FileTextIcon size={32} className="panel-empty-icon" />
        <p>Run an analysis first, then generate a one-click executive report.</p>
      </div>
    );
  }

  return (
    <div className="report-panel">
      {/* header */}
      <div className="report-header">
        <div className="report-header-left">
          <FileTextIcon size={15} />
          <span>Auto Report Generator</span>
        </div>
      </div>

      {/* what's included */}
      <div className="report-sections-list">
        {[
          { label: 'Executive Summary', desc: 'Non-technical overview for management' },
          { label: 'Technical Findings', desc: 'All paths, risks, and bottleneck edges' },
          { label: 'MITRE ATT&CK Coverage', desc: 'Mapped techniques by tactic' },
          { label: 'Risk Heatmap', desc: 'Node-level risk contribution' },
          { label: 'Remediation Roadmap', desc: 'Prioritized action plan with timelines' },
        ].map(s => (
          <div key={s.label} className="report-section-row">
            <div className="report-section-check">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div className="report-section-name">{s.label}</div>
              <div className="report-section-desc">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* generate button */}
      {!reportData && (
        <button
          className="btn-primary report-gen-btn"
          onClick={() => generateReport(analysisParams)}
          disabled={reportLoading}
        >
          {reportLoading ? (
            <><LoaderIcon size={14} className="spin-icon" /> Generating Report…</>
          ) : (
            <><FileTextIcon size={14} /> Generate Report</>
          )}
        </button>
      )}

      {/* report ready */}
      {reportData && !reportLoading && (
        <>
          <div className="report-ready-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>Report ready — Risk Score: <strong>{reportData.globalRisk?.toFixed(0)}</strong></span>
          </div>

          <div className="report-actions">
            <button className="btn-primary" onClick={downloadMarkdown}>
              <DownloadIcon size={14} /> Download .md
            </button>
            <button className="btn-secondary" onClick={printToPDF}>
              <FileTextIcon size={14} /> Print / Save PDF
            </button>
            <button className="btn-secondary" onClick={() => setPreview(!preview)}>
              {preview ? 'Hide' : 'Preview'} Report
            </button>
            <button className="btn-ghost" onClick={() => generateReport(analysisParams)}>
              <LoaderIcon size={13} /> Regenerate
            </button>
          </div>

          {/* inline markdown preview */}
          {preview && (
            <div className="report-preview">
              <pre className="report-preview-content">{markdown}</pre>
            </div>
          )}
        </>
      )}

      {reportLoading && (
        <div className="panel-loading">
          <div className="spin-ring" />
          <span>Generating executive report…</span>
        </div>
      )}

      {/* error hint */}
      {!reportLoading && reportData === null && analysis && (
        <div className="alert-warning mt-8">
          <AlertTriangleIcon size={13} />
          <span>Click "Generate Report" to create the report.</span>
        </div>
      )}
    </div>
  );
}
