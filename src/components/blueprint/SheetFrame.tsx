import React from 'react';
import { motion } from 'motion/react';

interface SheetFrameProps {
  id: string;
  sheetNo: string;
  title: string;
  revision?: string;
  drawnBy?: string;
  date?: string;
  scale?: string;
  children: React.ReactNode;
  className?: string;
}

export function SheetFrame({
  id,
  sheetNo,
  title,
  revision = 'REV 1.0',
  drawnBy = 'Yashwanth Gowda M',
  date = '2026-11',
  scale = '1:100 NTS',
  children,
  className = '',
}: SheetFrameProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`relative border border-[var(--bp-line)] bg-[var(--bp-surface)] p-5 sm:p-8 md:p-10 ${className}`}
    >
      {/* Corner registration crosshairs */}
      <span aria-hidden="true" className="pointer-events-none absolute -top-2 -left-2 text-[var(--bp-line-strong)] font-mono text-xs select-none">+</span>
      <span aria-hidden="true" className="pointer-events-none absolute -top-2 -right-2 text-[var(--bp-line-strong)] font-mono text-xs select-none">+</span>
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-2 -left-2 text-[var(--bp-line-strong)] font-mono text-xs select-none">+</span>
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-2 -right-2 text-[var(--bp-line-strong)] font-mono text-xs select-none">+</span>

      {/* Top sheet header & dimension line */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--bp-line)] pb-4">
        <div>
          <p className="font-mono text-xs tracking-wider text-[var(--bp-accent)]">
            {sheetNo} / {title.toUpperCase()}
          </p>
          <h2
            id={`${id}-heading`}
            className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--bp-ink)] sm:text-3xl text-balance"
          >
            {title}
          </h2>
        </div>

        {/* Scale bar */}
        <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] text-[var(--bp-ink-muted)]">
          <span>SCALE {scale}</span>
          <div className="flex h-2 w-24 border border-[var(--bp-line-strong)]" aria-hidden="true">
            <div className="w-1/4 bg-[var(--bp-line-strong)]" />
            <div className="w-1/4 bg-transparent" />
            <div className="w-1/4 bg-[var(--bp-line-strong)]" />
            <div className="w-1/4 bg-transparent" />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>

      {/* Corner architectural title block */}
      <div className="mt-10 flex justify-end">
        <div className="grid grid-cols-2 sm:grid-cols-5 border border-[var(--bp-line)] font-mono text-[11px] text-[var(--bp-ink-muted)]">
          <div className="border-b sm:border-b-0 border-r border-[var(--bp-line)] px-3 py-1.5">
            <span className="block text-[9px] opacity-70">SHEET NO.</span>
            <span className="font-medium text-[var(--bp-ink)]">{sheetNo}</span>
          </div>
          <div className="border-b sm:border-b-0 sm:border-r border-[var(--bp-line)] px-3 py-1.5">
            <span className="block text-[9px] opacity-70">TITLE</span>
            <span className="font-medium text-[var(--bp-ink)]">{title}</span>
          </div>
          <div className="border-r border-[var(--bp-line)] px-3 py-1.5">
            <span className="block text-[9px] opacity-70">REV</span>
            <span className="font-medium text-[var(--bp-ink)]">{revision}</span>
          </div>
          <div className="border-r border-[var(--bp-line)] px-3 py-1.5">
            <span className="block text-[9px] opacity-70">DRAWN BY</span>
            <span className="font-medium text-[var(--bp-ink)]">{drawnBy}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 px-3 py-1.5">
            <span className="block text-[9px] opacity-70">DATE</span>
            <span className="font-medium text-[var(--bp-ink)]">{date}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
