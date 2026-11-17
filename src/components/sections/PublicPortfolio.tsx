import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  MapPin,
  Moon,
  Phone,
  Send,
  Sun,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { submitContactMessageToFirestore } from '../../lib/firestoreStore.ts';
import type { PortfolioBundle, Project } from '../../types/portfolio.ts';
import { Navbar } from '../blueprint/Navbar.tsx';
import { SheetFrame } from '../blueprint/SheetFrame.tsx';
import { ProjectDrawer } from './ProjectDrawer.tsx';

const EksBlueprintCanvas = lazy(() => import('../three/EksBlueprintCanvas.tsx'));
const SkillsOrbitCanvas = lazy(() => import('../three/SkillsOrbitCanvas.tsx'));

interface PublicPortfolioProps {
  bundle: PortfolioBundle;
  onNavigateAdmin: () => void;
}

export function PublicPortfolio({ bundle, onNavigateAdmin }: PublicPortfolioProps) {
  const { theme, toggleTheme } = useTheme();
  const { profile, siteSettings } = bundle;

  const [taglineIdx, setTaglineIdx] = useState(0);
  const [skillFilter, setSkillFilter] = useState<string>('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactBody, setContactBody] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [contactStatus, setContactStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const taglines = profile.typedTaglines;
    if (!taglines || taglines.length <= 1) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const timer = window.setInterval(() => {
      setTaglineIdx((prev) => (prev + 1) % taglines.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [profile.typedTaglines]);

  const skillCategories = useMemo(() => {
    const cats = Array.from(new Set(bundle.skills.map((s) => s.category)));
    return cats;
  }, [bundle.skills]);

  const filteredSkills = useMemo(() => {
    if (skillFilter === 'All') return bundle.skills;
    return bundle.skills.filter((s) => s.category === skillFilter);
  }, [bundle.skills, skillFilter]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactBusy(true);
    setContactStatus(null);
    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          subject: contactSubject,
          message: contactBody,
          honeypot,
        }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (!resp.ok) {
        throw new Error(data.error || 'Unable to submit message.');
      }
      if (!honeypot) {
        await submitContactMessageToFirestore({
          name: contactName.trim(),
          email: contactEmail.trim(),
          subject: contactSubject.trim(),
          message: contactBody.trim(),
        }).catch(() => undefined);
      }
      setContactStatus({ ok: true, msg: 'Message transmitted and recorded successfully.' });
      setContactName('');
      setContactEmail('');
      setContactSubject('');
      setContactBody('');
    } catch (err) {
      setContactStatus({
        ok: false,
        msg: err instanceof Error ? err.message : 'Message delivery failed.',
      });
    } finally {
      setContactBusy(false);
    }
  };

  const currentTagline =
    profile.typedTaglines[taglineIdx] ||
    profile.headline;

  return (
    <div className="min-h-dvh blueprint-grid-canvas blueprint-paper-grain">
      <Navbar brandName={profile.name} />

      <main id="main-content" className="mx-auto max-w-[1280px] space-y-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* SHEET 01: HERO */}
        <section
          id="hero"
          aria-labelledby="hero-heading"
          className="relative border border-[var(--bp-line)] bg-[var(--bp-surface)] p-5 sm:p-8 lg:p-10"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--bp-line)] pb-3 font-mono text-xs text-[var(--bp-ink-muted)]">
            <span>SHEET 01 / AWS EKS INFRASTRUCTURE BLUEPRINT</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 border border-[var(--bp-line)] px-3 py-1.5 text-[var(--bp-ink)] hover:border-[var(--bp-accent)] min-h-[36px]"
                aria-label={`Switch to ${theme === 'dark' ? 'Cyanotype Light' : 'Dark Blueprint'} theme`}
              >
                {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span>{theme === 'dark' ? 'Cyanotype Light' : 'Dark Blueprint'}</span>
              </button>
            </div>
          </div>

          {/* Portrait stacks 3D scene above title; Desktop uses 2-col split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col justify-between">
              <div>
                <p className="font-mono text-xs tracking-wider text-[var(--bp-accent)]">
                  {profile.role}
                </p>
                <h1
                  id="hero-heading"
                  className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--bp-ink)] text-balance"
                >
                  {profile.name}
                </h1>
                <p className="mt-4 font-mono text-xs sm:text-sm text-[var(--bp-cyan)] min-h-[2.5rem]">
                  {currentTagline}
                </p>
                <p className="mt-3 text-base leading-relaxed text-[var(--bp-ink-muted)] max-w-[60ch]">
                  {profile.headline}
                </p>
              </div>

              <div className="mt-8 space-y-5">
                <div className="flex flex-wrap gap-3">
                  <a
                    href="/api/resume"
                    download="Yashwanth_Gowda_M_Resume.pdf"
                    className="inline-flex items-center gap-2 bg-[var(--bp-accent)] px-5 py-3 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px]"
                  >
                    <Download className="h-4 w-4" />
                    Download Resume
                  </a>
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 border border-[var(--bp-line-strong)] px-5 py-3 font-mono text-xs font-semibold text-[var(--bp-ink)] hover:border-[var(--bp-accent)] min-h-[44px]"
                  >
                    Contact
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-5 font-mono text-xs text-[var(--bp-ink-muted)]">
                  {profile.githubUrl && (
                    <a
                      href={profile.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-[var(--bp-ink)]"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                  )}
                  {profile.linkedinUrl && (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-[var(--bp-ink)]"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>{profile.location}</span>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-7">
              <Suspense
                fallback={
                  <div className="flex h-[420px] sm:h-[500px] lg:h-[560px] items-center justify-center border border-[var(--bp-line)] font-mono text-xs text-[var(--bp-ink-muted)]">
                    INITIALIZING 3D EKS TOPOLOGY CANVAS...
                  </div>
                }
              >
                <EksBlueprintCanvas onSelectTarget={scrollToSection} />
              </Suspense>
            </div>
          </div>

          {/* Full-width 4-column KPI Strip */}
          {profile.stats.length > 0 && (
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 border-t border-[var(--bp-line)] pt-6 gap-6">
              {profile.stats.map((st, idx) => (
                <div key={idx} className="border-r last:border-r-0 border-[var(--bp-line)]/60 pr-4">
                  <p className="font-mono text-2xl sm:text-3xl font-bold text-[var(--bp-ink)] tabular-nums">
                    {st.value}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--bp-ink)]">{st.label}</p>
                  {st.unit && (
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--bp-ink-muted)]">{st.unit}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SHEET 02: ABOUT */}
        <SheetFrame
          id="about"
          sheetNo="SHEET 02"
          title="Engineer Profile"
          revision={siteSettings.sheetRevision}
          drawnBy={profile.name}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <div className="relative aspect-square max-w-[280px] border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] overflow-hidden">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={`${profile.name} portrait`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-mono text-xs text-[var(--bp-ink-muted)]">
                    {profile.name}
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-8 space-y-5">
              <p className="text-base leading-relaxed text-[var(--bp-ink)] max-w-[70ch]">
                {profile.summary}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--bp-line)] pt-4 text-sm">
                <div>
                  <span className="block font-mono text-[11px] text-[var(--bp-ink-muted)]">BASE LOCATION</span>
                  <span className="font-medium text-[var(--bp-ink)]">{profile.location}</span>
                </div>
                <div>
                  <span className="block font-mono text-[11px] text-[var(--bp-ink-muted)]">AVAILABILITY</span>
                  <span className="font-medium text-[var(--bp-accent)]">{profile.availability}</span>
                </div>
              </div>
            </div>
          </div>
        </SheetFrame>

        {/* SHEET 03: EXPERIENCE */}
        <SheetFrame
          id="experience"
          sheetNo="SHEET 03"
          title="Work Experience"
          revision={siteSettings.sheetRevision}
          drawnBy={profile.name}
        >
          <div className="relative space-y-6 pl-4 sm:pl-6 border-l border-[var(--bp-line-strong)]">
            {bundle.experiences.map((exp) => (
              <article
                key={exp.id}
                className="bp-tilt-card relative border border-[var(--bp-line)] bg-[var(--bp-surface-solid)]/65 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-[var(--bp-ink)]">
                      {exp.role}
                    </h3>
                    <p className="mt-0.5 text-sm font-medium text-[var(--bp-accent)]">
                      {exp.company}
                    </p>
                  </div>
                  <div className="font-mono text-xs text-[var(--bp-ink-muted)] tabular-nums">
                    <span>{exp.startDate} – {exp.endDate}</span>
                    {exp.location && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>{exp.location}</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--bp-ink)]">
                  {exp.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="font-mono text-[var(--bp-accent)]">-</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {exp.techStack.length > 0 && (
                  <p className="mt-4 border-t border-[var(--bp-line)]/60 pt-3 font-mono text-xs text-[var(--bp-ink-muted)]">
                    {exp.techStack.join(' · ')}
                  </p>
                )}
              </article>
            ))}
          </div>
        </SheetFrame>

        {/* SHEET 04: SKILLS */}
        <SheetFrame
          id="skills"
          sheetNo="SHEET 04"
          title="Technical Expertise & Skills"
          revision={siteSettings.sheetRevision}
          drawnBy={profile.name}
        >
          <div className="space-y-6">
            <Suspense
              fallback={
                <div className="flex h-64 items-center justify-center border border-[var(--bp-line)] font-mono text-xs text-[var(--bp-ink-muted)]">
                  LOADING 3D TECH STACK CLUSTER...
                </div>
              }
            >
              <SkillsOrbitCanvas
                categories={skillCategories}
                activeCategory={skillFilter}
                onSelectCategory={(cat) => setSkillFilter((prev) => (prev === cat ? 'All' : cat))}
              />
            </Suspense>

            {/* Interactive Segmented Filter Controls */}
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter skills by category">
              {['All', ...skillCategories].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={skillFilter === cat}
                  onClick={() => setSkillFilter(cat)}
                  className={`px-3 py-2 font-mono text-xs transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                    skillFilter === cat
                      ? 'bg-[var(--bp-accent)] text-[var(--bp-accent-fg)] font-semibold'
                      : 'border border-[var(--bp-line)] text-[var(--bp-ink-muted)] hover:text-[var(--bp-ink)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSkills.map((sk) => (
                <div
                  key={sk.id}
                  className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)]/60 p-4"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-sm text-[var(--bp-ink)]">{sk.name}</span>
                    <span className="font-mono text-xs text-[var(--bp-ink-muted)] tabular-nums">
                      {sk.years}y · {sk.level}%
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--bp-ink-muted)]">{sk.category}</p>
                  <div className="mt-2.5 h-1.5 w-full bg-[var(--bp-line)]">
                    <div
                      className="h-full bg-[var(--bp-accent)]"
                      style={{ width: `${sk.level}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SheetFrame>

        {/* SHEET 05: PROJECTS */}
        <SheetFrame
          id="projects"
          sheetNo="SHEET 05"
          title="Architecture Case Studies & Projects"
          revision={siteSettings.sheetRevision}
          drawnBy={profile.name}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bundle.projects.map((proj) => (
              <article
                key={proj.id}
                className="bp-tilt-card flex flex-col justify-between border border-[var(--bp-line)] bg-[var(--bp-surface-solid)]/70"
              >
                <div>
                  <div className="relative h-48 w-full border-b border-[var(--bp-line)] overflow-hidden bg-[var(--bp-bg-start)]">
                    {proj.videoUrl ? (
                      <video
                        src={proj.videoUrl}
                        muted
                        loop
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : proj.imageUrl ? (
                      <img
                        src={proj.imageUrl}
                        alt={proj.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-[var(--bp-ink-muted)]">
                        BLUEPRINT SCHEMATIC
                      </div>
                    )}
                  </div>

                  <div className="p-5 sm:p-6">
                    <p className="font-mono text-xs text-[var(--bp-ink-muted)]">
                      <span>{proj.role}</span>
                      {proj.featured && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="text-[var(--bp-accent)]">Featured Blueprint</span>
                        </>
                      )}
                    </p>
                    <h3 className="mt-1.5 font-display text-xl font-semibold text-[var(--bp-ink)]">
                      {proj.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--bp-ink-muted)]">
                      {proj.summary}
                    </p>
                    <p className="mt-4 font-mono text-xs text-[var(--bp-ink)]">
                      {proj.techTags.join(' · ')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--bp-line)] px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() => setSelectedProject(proj)}
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--bp-accent)] hover:underline min-h-[40px]"
                  >
                    Inspect Architecture
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-4 font-mono text-xs text-[var(--bp-ink-muted)]">
                    {proj.githubUrl && (
                      <a
                        href={proj.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-[var(--bp-ink)]"
                      >
                        <Github className="h-3.5 w-3.5" />
                        Repo
                      </a>
                    )}
                    {proj.liveUrl && (
                      <a
                        href={proj.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-[var(--bp-ink)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Live
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SheetFrame>

        {/* SHEET 06 & 07: EDUCATION & CERTIFICATIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SheetFrame
            id="education"
            sheetNo="SHEET 06"
            title="Education"
            revision={siteSettings.sheetRevision}
            drawnBy={profile.name}
          >
            <div className="space-y-4">
              {bundle.education.map((edu) => (
                <div key={edu.id} className="border border-[var(--bp-line)] p-4">
                  <h3 className="font-display text-lg font-semibold text-[var(--bp-ink)]">
                    {edu.degree}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--bp-ink-muted)]">{edu.institution}</p>
                  <p className="mt-2 font-mono text-xs text-[var(--bp-accent)] tabular-nums">
                    {edu.years} {edu.score ? `· ${edu.score}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </SheetFrame>

          <SheetFrame
            id="certifications"
            sheetNo="SHEET 07"
            title="Certifications"
            revision={siteSettings.sheetRevision}
            drawnBy={profile.name}
          >
            <div className="space-y-4">
              {bundle.certifications.map((cert) => (
                <div key={cert.id} className="border border-[var(--bp-line)] p-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-base font-semibold text-[var(--bp-ink)]">
                      {cert.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-[var(--bp-ink-muted)]">
                      {cert.issuer} · <span className="font-mono text-xs tabular-nums">{cert.date}</span>
                    </p>
                    {cert.credentialId && (
                      <p className="mt-1 font-mono text-xs text-[var(--bp-ink-muted)]">
                        Credential ID: {cert.credentialId}
                      </p>
                    )}
                  </div>
                  {cert.credentialUrl && (
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-[var(--bp-accent)] hover:underline whitespace-nowrap shrink-0"
                    >
                      Verify
                    </a>
                  )}
                </div>
              ))}
            </div>
          </SheetFrame>
        </div>

        {/* SHEET 08 & 09: ACHIEVEMENTS & VOLUNTEERING */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SheetFrame
            id="achievements"
            sheetNo="SHEET 08"
            title="Achievements"
            revision={siteSettings.sheetRevision}
            drawnBy={profile.name}
          >
            <div className="space-y-4">
              {bundle.achievements.map((ach) => (
                <div key={ach.id} className="border border-[var(--bp-line)] p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-[var(--bp-ink)]">
                      {ach.title}
                    </h3>
                    <span className="font-mono text-xs text-[var(--bp-ink-muted)] tabular-nums">{ach.date}</span>
                  </div>
                  {ach.metric && (
                    <p className="mt-1 font-mono text-xs text-[var(--bp-accent)]">{ach.metric}</p>
                  )}
                  <p className="mt-2 text-sm text-[var(--bp-ink-muted)]">{ach.description}</p>
                </div>
              ))}
            </div>
          </SheetFrame>

          <SheetFrame
            id="volunteering"
            sheetNo="SHEET 09"
            title="Volunteering"
            revision={siteSettings.sheetRevision}
            drawnBy={profile.name}
          >
            <div className="space-y-4">
              {bundle.volunteering.map((vol) => (
                <div key={vol.id} className="border border-[var(--bp-line)] p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-[var(--bp-ink)]">
                      {vol.role}
                    </h3>
                    <span className="font-mono text-xs text-[var(--bp-ink-muted)] tabular-nums">{vol.dates}</span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-[var(--bp-accent)]">{vol.organisation}</p>
                  <p className="mt-2 text-sm text-[var(--bp-ink-muted)]">{vol.impact}</p>
                </div>
              ))}
            </div>
          </SheetFrame>
        </div>

        {/* SHEET 10: CONTACT */}
        <SheetFrame
          id="contact"
          sheetNo="SHEET 10"
          title="Contact & Inquiry"
          revision={siteSettings.sheetRevision}
          drawnBy={profile.name}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-sm leading-relaxed text-[var(--bp-ink-muted)]">
                Available for platform engineering leadership, Kubernetes architecture consulting, and DevOps collaborations.
              </p>
              <div className="space-y-3 border-t border-[var(--bp-line)] pt-4 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[var(--bp-accent)] shrink-0" />
                  <a href={`mailto:${profile.email}`} className="hover:underline break-all">
                    {profile.email}
                  </a>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-[var(--bp-accent)] shrink-0" />
                    <span className="font-mono tabular-nums">{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[var(--bp-accent)] shrink-0" />
                  <span>{profile.location}</span>
                </div>
              </div>
              <div className="flex gap-4 pt-2 font-mono text-xs">
                {profile.linkedinUrl && (
                  <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="underline">
                    LinkedIn
                  </a>
                )}
                {profile.githubUrl && (
                  <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="underline">
                    GitHub
                  </a>
                )}
              </div>
            </div>

            <form onSubmit={handleContactSubmit} className="lg:col-span-7 space-y-4">
              {/* Spam honeypot (hidden from human users) */}
              <input
                type="text"
                name="website_hp"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
                aria-hidden="true"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Your Name</span>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-3 py-2.5 text-sm text-[var(--bp-ink)] focus:border-[var(--bp-accent)] focus:outline-none min-h-[44px]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Email Address</span>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-3 py-2.5 text-sm text-[var(--bp-ink)] focus:border-[var(--bp-accent)] focus:outline-none min-h-[44px]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Subject</span>
                <input
                  type="text"
                  required
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  className="mt-1 w-full border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-3 py-2.5 text-sm text-[var(--bp-ink)] focus:border-[var(--bp-accent)] focus:outline-none min-h-[44px]"
                />
              </label>

              <label className="block">
                <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Message</span>
                <textarea
                  rows={4}
                  required
                  minLength={5}
                  value={contactBody}
                  onChange={(e) => setContactBody(e.target.value)}
                  className="mt-1 w-full border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-3 py-2.5 text-sm text-[var(--bp-ink)] focus:border-[var(--bp-accent)] focus:outline-none"
                />
              </label>

              {contactStatus && (
                <div
                  role="status"
                  className={`flex items-center gap-2 border px-3 py-2 font-mono text-xs ${
                    contactStatus.ok
                      ? 'border-emerald-500/50 text-emerald-400'
                      : 'border-rose-500/50 text-rose-400'
                  }`}
                >
                  {contactStatus.ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  <span>{contactStatus.msg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={contactBusy}
                className="inline-flex items-center gap-2 bg-[var(--bp-accent)] px-5 py-3 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] hover:opacity-90 disabled:opacity-60 min-h-[44px]"
              >
                <Send className="h-4 w-4" />
                {contactBusy ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </SheetFrame>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[var(--bp-line)] bg-[var(--bp-surface-solid)]/90 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6">
          <div>
            <p className="font-display text-base font-semibold text-[var(--bp-ink)]">{profile.name}</p>
            <p className="mt-1 font-mono text-xs text-[var(--bp-ink-muted)]">
              © {new Date().getFullYear()} {profile.name} · yashwanthgowdam.in
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/api/resume"
              download="Yashwanth_Gowda_M_Resume.pdf"
              className="inline-flex items-center gap-2 border border-[var(--bp-line-strong)] px-4 py-2 font-mono text-xs text-[var(--bp-ink)] hover:border-[var(--bp-accent)] min-h-[40px]"
            >
              <Download className="h-3.5 w-3.5" />
              Resume PDF
            </a>
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="font-mono text-xs text-[var(--bp-ink-muted)] hover:text-[var(--bp-accent)] underline underline-offset-4 min-h-[40px]"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </footer>

      <ProjectDrawer project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
