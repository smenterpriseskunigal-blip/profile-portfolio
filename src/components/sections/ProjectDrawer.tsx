import React, { useEffect } from 'react';
import { ExternalLink, Github, X } from 'lucide-react';
import type { Project } from '../../types/portfolio.ts';

interface ProjectDrawerProps {
  project: Project | null;
  onClose: () => void;
}

export function ProjectDrawer({ project, onClose }: ProjectDrawerProps) {
  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [project, onClose]);

  if (!project) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-project-title"
      onClick={onClose}
    >
      <div
        className="relative h-full w-full max-w-xl overflow-y-auto border-l border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--bp-line)] pb-4">
          <div>
            <p className="font-mono text-xs text-[var(--bp-accent)]">
              PROJECT SPECIFICATION · {project.role}
            </p>
            <h3
              id="drawer-project-title"
              className="mt-1 font-display text-2xl font-semibold text-[var(--bp-ink)]"
            >
              {project.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project details"
            className="border border-[var(--bp-line)] p-2 text-[var(--bp-ink)] hover:border-[var(--bp-accent)] min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Media Showcase */}
        {project.videoUrl ? (
          <div className="mt-6 border border-[var(--bp-line)] overflow-hidden bg-black">
            <video
              src={project.videoUrl}
              controls
              playsInline
              className="w-full max-h-72 object-cover"
            />
          </div>
        ) : project.imageUrl ? (
          <div className="mt-6 border border-[var(--bp-line)] overflow-hidden">
            <img
              src={project.imageUrl}
              alt={project.title}
              referrerPolicy="no-referrer"
              className="w-full h-56 object-cover"
            />
          </div>
        ) : null}

        <div className="mt-6 space-y-6">
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--bp-ink-muted)]">
              Architecture Summary
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[var(--bp-ink)]">{project.summary}</p>
          </div>

          {project.outcomes.length > 0 && (
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--bp-ink-muted)]">
                Verified Outcomes
              </h4>
              <ul className="mt-2 space-y-2 text-sm text-[var(--bp-ink)]">
                {project.outcomes.map((o, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-[var(--bp-accent)]">-</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {project.techTags.length > 0 && (
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-[var(--bp-ink-muted)]">
                Stack &amp; Tooling
              </h4>
              <p className="mt-2 font-mono text-xs text-[var(--bp-ink)]">
                {project.techTags.join(' · ')}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-[var(--bp-line)] pt-5">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-[var(--bp-line-strong)] px-4 py-2.5 font-mono text-xs text-[var(--bp-ink)] hover:border-[var(--bp-accent)] min-h-[44px]"
              >
                <Github className="h-4 w-4" />
                Source Repository
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[var(--bp-accent)] px-4 py-2.5 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] min-h-[44px]"
              >
                <ExternalLink className="h-4 w-4" />
                Live Deployment
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
