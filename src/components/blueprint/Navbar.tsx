import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  brandName: string;
}

const NAV_ITEMS = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
];

export function Navbar({ brandName }: NavbarProps) {
  const [activeId, setActiveId] = useState<string>('hero');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const sectionIds = ['hero', ...NAV_ITEMS.map((i) => i.id), 'education', 'certifications'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-30% 0px -55% 0px' }
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-[var(--bp-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--bp-accent-fg)]"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--bp-line)] bg-[var(--bp-surface-solid)]/95">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single text wordmark */}
          <a
            href="#hero"
            className="font-display text-base sm:text-lg font-bold tracking-tight text-[var(--bp-ink)] whitespace-nowrap shrink-0"
          >
            {brandName}
          </a>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav aria-label="Primary sections" className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const isActive = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                    isActive
                      ? 'border-[var(--bp-accent)] text-[var(--bp-ink)]'
                      : 'border-transparent text-[var(--bp-ink-muted)] hover:text-[var(--bp-ink)]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA + Mobile drawer trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/api/resume"
              download="Yashwanth_Gowda_M_Resume.pdf"
              className="hidden sm:inline-flex items-center justify-center bg-[var(--bp-accent)] px-4 py-2 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 min-h-[40px]"
            >
              Download Resume
            </a>
            <button
              type="button"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-expanded={drawerOpen}
              aria-label="Toggle navigation menu"
              className="inline-flex md:hidden items-center justify-center border border-[var(--bp-line)] p-2.5 text-[var(--bp-ink)] min-h-[44px] min-w-[44px]"
            >
              {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {drawerOpen && (
          <div className="md:hidden border-t border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-4 py-4">
            <nav aria-label="Mobile sections" className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setDrawerOpen(false)}
                  className="py-2.5 font-mono text-sm text-[var(--bp-ink)] border-b border-[var(--bp-line)]/50 min-h-[44px] flex items-center"
                >
                  {item.label}
                </a>
              ))}
              <a
                href="/api/resume"
                download="Yashwanth_Gowda_M_Resume.pdf"
                onClick={() => setDrawerOpen(false)}
                className="mt-2 inline-flex items-center justify-center bg-[var(--bp-accent)] px-4 py-3 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] min-h-[44px]"
              >
                Download Resume PDF
              </a>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
