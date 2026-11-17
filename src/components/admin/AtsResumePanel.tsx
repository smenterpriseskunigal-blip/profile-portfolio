import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import type { AtsScoreReport, PortfolioBundle } from '../../types/portfolio.ts';

interface AtsResumePanelProps {
  bundle: PortfolioBundle;
  onPublishStatusChange: (score: number, published: boolean) => Promise<void>;
}

export function AtsResumePanel({ bundle, onPublishStatusChange }: AtsResumePanelProps) {
  const { getIdToken } = useAuth();
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AtsScoreReport | null>(null);

  const runAtsEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const resp = await fetch('/api/ats/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ bundle, jobDescription }),
      });
      const data = (await resp.json()) as AtsScoreReport & { error?: string };
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to evaluate ATS score.');
      }
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ATS evaluation error.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!report) return;
    if (report.totalScore < 90) return;
    await onPublishStatusChange(report.totalScore, true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-[var(--bp-ink)]">
            ATS Resume Compiler &amp; Rubric Scorer
          </h3>
          <p className="mt-1 text-xs text-[var(--bp-ink-muted)]">
            Single-column selectable-text PDF generated live from your CMS data. Publishing is gated at score &ge; 90/100.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/resume?inline=1"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-[var(--bp-line-strong)] px-3.5 py-2 font-mono text-xs text-[var(--bp-ink)] hover:border-[var(--bp-accent)]"
          >
            <FileText className="h-4 w-4" />
            Preview PDF
          </a>
          <a
            href="/api/resume"
            download="Yashwanth_Gowda_M_Resume.pdf"
            className="inline-flex items-center gap-2 bg-[var(--bp-accent)] px-3.5 py-2 font-mono text-xs font-semibold text-[var(--bp-accent-fg)]"
          >
            <Download className="h-4 w-4" />
            Download Resume PDF
          </a>
        </div>
      </div>

      <div className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-5 space-y-4">
        <label className="block">
          <span className="font-mono text-xs text-[var(--bp-ink-muted)]">
            Optional Target Job Description (for Keyword Coverage check)
          </span>
          <textarea
            rows={5}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste a DevOps / Kubernetes / Platform Engineer job description here to test keyword match..."
            className="mt-2 w-full border border-[var(--bp-line)] bg-transparent p-3 text-sm text-[var(--bp-ink)] focus:border-[var(--bp-accent)] focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runAtsEvaluation}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-[var(--bp-accent)] px-4 py-2.5 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] disabled:opacity-60"
          >
            <Play className="h-3.5 w-3.5" />
            {loading ? 'Extracting PDF & Scoring...' : 'Run ATS Score Check'}
          </button>

          {report && (
            <button
              type="button"
              disabled={!report.publishable}
              onClick={handlePublish}
              className={`inline-flex items-center gap-2 border px-4 py-2.5 font-mono text-xs font-semibold ${
                report.publishable
                  ? 'border-emerald-500 text-emerald-400 hover:bg-emerald-500/10'
                  : 'border-[var(--bp-line)] text-[var(--bp-ink-muted)] opacity-50 cursor-not-allowed'
              }`}
            >
              {report.publishable ? 'Publish Resume (Score >= 90)' : 'Publish Blocked (< 90)'}
            </button>
          )}
        </div>

        {error && (
          <p className="border border-rose-500/50 p-3 font-mono text-xs text-rose-400">{error}</p>
        )}
      </div>

      {report && (
        <div className="space-y-6">
          {/* Score Header */}
          <div className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="font-mono text-4xl font-bold text-[var(--bp-ink)] tabular-nums">
                {report.totalScore}
                <span className="text-lg text-[var(--bp-ink-muted)]">/100</span>
              </div>
              <div>
                <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                  {report.publishable ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      READY TO PUBLISH
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      PUBLISH BLOCKED — SCORE BELOW 90
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-xs text-[var(--bp-ink-muted)] tabular-nums">
                  Extracted Words: {report.extractedWordCount} · Pages: {report.estimatedPages}
                </p>
              </div>
            </div>
          </div>

          {/* Rubric Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.breakdown.map((cat) => (
              <div key={cat.key} className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--bp-ink)]">{cat.label}</span>
                  <span className="font-mono text-xs text-[var(--bp-accent)] tabular-nums">
                    {cat.score} / {cat.maxScore}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-[var(--bp-ink-muted)]">
                  {cat.notes.map((n, idx) => (
                    <li key={idx}>{n}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Keywords & Remediation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-4">
              <h4 className="font-mono text-xs font-semibold text-[var(--bp-ink)]">
                Matched Keywords ({report.matchedKeywords.length})
              </h4>
              <p className="mt-2 font-mono text-xs text-emerald-400 leading-relaxed">
                {report.matchedKeywords.length ? report.matchedKeywords.join(' · ') : 'None matched'}
              </p>
              <h4 className="mt-4 font-mono text-xs font-semibold text-[var(--bp-ink)]">
                Missing Keywords ({report.missingKeywords.length})
              </h4>
              <p className="mt-2 font-mono text-xs text-amber-400 leading-relaxed">
                {report.missingKeywords.length ? report.missingKeywords.join(' · ') : 'All target keywords covered'}
              </p>
            </div>

            <div className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-4">
              <h4 className="font-mono text-xs font-semibold text-[var(--bp-ink)]">
                Remediation Checklist
              </h4>
              {report.fixList.length === 0 ? (
                <p className="mt-2 text-xs text-emerald-400">No blocking issues detected.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-xs text-[var(--bp-ink-muted)]">
                  {report.fixList.map((fix, idx) => (
                    <li key={idx}>- {fix}</li>
                  ))}
                </ul>
              )}
              <p className="mt-4 border-t border-[var(--bp-line)] pt-3 text-[11px] text-[var(--bp-ink-muted)]">
                {report.disclaimer}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
