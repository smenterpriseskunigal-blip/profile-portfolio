import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Film,
  Inbox,
  LayoutDashboard,
  LogOut,
  Shield,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  deleteContactMessage,
  fetchAuditLogs,
  fetchContactMessages,
  fetchMediaAssets,
  hardDeleteEntity,
  importBundleToFirestore,
  loadAdminPortfolio,
  markContactMessageRead,
  reorderEntities,
  restoreEntity,
  saveProfile,
  saveSiteSettings,
  seedFirestoreIfEmpty,
  softDeleteEntity,
  syncResumeWithServer,
  upsertEntity,
  type CollectionEntityKey,
} from '../../lib/firestoreStore.ts';
import { portfolioBundleSchema } from '../../lib/validation.ts';
import type {
  Achievement,
  AuditLog,
  Certification,
  ContactMessage,
  Education,
  Experience,
  MediaAsset,
  PortfolioBundle,
  Profile,
  Project,
  SiteSettings,
  Skill,
  Volunteering,
} from '../../types/portfolio.ts';
import { AtsResumePanel } from './AtsResumePanel.tsx';
import { CollectionCrudPanel } from './CollectionCrudPanel.tsx';
import { MediaStudioPanel } from './MediaStudioPanel.tsx';

type AdminTab =
  | 'overview'
  | 'profile'
  | 'experiences'
  | 'skills'
  | 'projects'
  | 'education'
  | 'certifications'
  | 'achievements'
  | 'volunteering'
  | 'resume'
  | 'media'
  | 'inbox'
  | 'audit';

interface AdminDashboardProps {
  onBackPublic: () => void;
  onPublicDataChanged: () => Promise<void>;
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}`;
const nowIso = () => new Date().toISOString();

export function AdminDashboard({ onBackPublic, onPublicDataChanged }: AdminDashboardProps) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [bundle, setBundle] = useState<PortfolioBundle | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Profile editor local draft
  const [profileDraft, setProfileDraft] = useState<Profile | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings | null>(null);

  const refreshAll = async () => {
    setLoading(true);
    try {
      await seedFirestoreIfEmpty();
      const [b, msgs, logs, assets] = await Promise.all([
        loadAdminPortfolio(),
        fetchContactMessages(),
        fetchAuditLogs(),
        fetchMediaAssets(),
      ]);
      setBundle(b);
      setProfileDraft(structuredClone(b.profile));
      setSettingsDraft(structuredClone(b.siteSettings));
      setMessages(msgs);
      setAuditLogs(logs);
      setMediaAssets(assets);
      await syncResumeWithServer(b);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const handleCollectionSave = async <T extends { id: string; createdAt: string; updatedAt: string }>(
    col: CollectionEntityKey,
    item: T,
    isNew: boolean
  ) => {
    await upsertEntity(col, item, isNew);
    await refreshAll();
    await onPublicDataChanged();
    flash(`Saved ${col} record and synced live portfolio.`);
  };

  const handleSoftDelete = async (col: CollectionEntityKey, id: string) => {
    await softDeleteEntity(col, id);
    await refreshAll();
    await onPublicDataChanged();
    flash(`Moved item to trash.`);
  };

  const handleRestore = async (col: CollectionEntityKey, id: string) => {
    await restoreEntity(col, id);
    await refreshAll();
    await onPublicDataChanged();
    flash(`Restored item.`);
  };

  const handleHardDelete = async (col: CollectionEntityKey, id: string) => {
    await hardDeleteEntity(col, id);
    await refreshAll();
    await onPublicDataChanged();
    flash(`Permanently deleted item.`);
  };

  const handleReorder = async <T extends { id: string; order: number; updatedAt: string }>(
    col: CollectionEntityKey,
    ordered: T[]
  ) => {
    await reorderEntities(col, ordered);
    await refreshAll();
    await onPublicDataChanged();
    flash(`Updated display order.`);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileDraft || !settingsDraft) return;
    await saveProfile(profileDraft);
    await saveSiteSettings(settingsDraft);
    await refreshAll();
    await onPublicDataChanged();
    flash('Profile & site settings saved.');
  };

  const handleExportJson = () => {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yashwanth_portfolio_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = portfolioBundleSchema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        flash('Invalid JSON backup structure.');
        return;
      }
      await importBundleToFirestore(parsed.data, 'Manual JSON backup restore');
      await refreshAll();
      await onPublicDataChanged();
      flash('Backup imported successfully.');
    } catch {
      flash('Failed to parse JSON backup.');
    }
  };

  const handleAssignMediaToProject = async (projectId: string, kind: 'image' | 'video', url: string) => {
    if (!bundle) return;
    const proj = bundle.projects.find((p) => p.id === projectId);
    if (!proj) return;
    const updated: Project = {
      ...proj,
      imageUrl: kind === 'image' ? url : proj.imageUrl,
      videoUrl: kind === 'video' ? url : proj.videoUrl,
    };
    await handleCollectionSave('projects', updated, false);
  };

  if (loading || !bundle || !profileDraft || !settingsDraft) {
    return (
      <div className="min-h-dvh blueprint-grid-canvas flex items-center justify-center font-mono text-sm text-[var(--bp-ink)]">
        LOADING ADMIN CONSOLE...
      </div>
    );
  }

  const unreadCount = messages.filter((m) => !m.read).length;

  const sidebarItems: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: 'Dashboard' },
    { id: 'profile', label: 'Profile & Settings' },
    { id: 'experiences', label: `Experience (${bundle.experiences.filter((i) => !i.deletedAt).length})` },
    { id: 'skills', label: `Skills (${bundle.skills.filter((i) => !i.deletedAt).length})` },
    { id: 'projects', label: `Projects (${bundle.projects.filter((i) => !i.deletedAt).length})` },
    { id: 'education', label: `Education (${bundle.education.filter((i) => !i.deletedAt).length})` },
    { id: 'certifications', label: `Certifications (${bundle.certifications.filter((i) => !i.deletedAt).length})` },
    { id: 'achievements', label: `Achievements (${bundle.achievements.filter((i) => !i.deletedAt).length})` },
    { id: 'volunteering', label: `Volunteering (${bundle.volunteering.filter((i) => !i.deletedAt).length})` },
    { id: 'resume', label: 'ATS Resume & Scorer' },
    { id: 'media', label: 'AI Media Studio' },
    { id: 'inbox', label: `Inbox (${unreadCount} unread)` },
    { id: 'audit', label: 'Audit Log' },
  ];

  return (
    <div className="min-h-dvh blueprint-grid-canvas flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-[260px] shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-4 flex flex-col justify-between">
        <div>
          <div className="border-b border-[var(--bp-line)] pb-4">
            <p className="font-mono text-[11px] text-[var(--bp-accent)]">ADMIN CMS PORTAL</p>
            <h1 className="mt-1 font-display text-lg font-bold text-[var(--bp-ink)]">
              {bundle.profile.name}
            </h1>
            <p className="font-mono text-[11px] text-[var(--bp-ink-muted)] truncate">{user?.email}</p>
          </div>

          <nav className="mt-4 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-2 text-left font-mono text-xs transition-colors whitespace-nowrap shrink-0 ${
                  tab === item.id
                    ? 'bg-[var(--bp-accent)] text-[var(--bp-accent-fg)] font-semibold'
                    : 'text-[var(--bp-ink-muted)] hover:text-[var(--bp-ink)] hover:bg-[var(--bp-line)]/15'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden lg:flex flex-col gap-2 border-t border-[var(--bp-line)] pt-4">
          <button
            type="button"
            onClick={onBackPublic}
            className="inline-flex items-center gap-2 border border-[var(--bp-line)] px-3 py-2 font-mono text-xs text-[var(--bp-ink)] hover:border-[var(--bp-accent)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            View Public Portfolio
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-2 border border-[var(--bp-line)] px-3 py-2 font-mono text-xs text-rose-400 hover:border-rose-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-[var(--bp-line)] bg-[var(--bp-surface-solid)]/90 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-xs text-[var(--bp-ink-muted)]">
            Admin Console / <span className="text-[var(--bp-ink)] font-semibold">{tab.toUpperCase()}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 border border-[var(--bp-line)] px-3 py-1.5 font-mono text-xs text-[var(--bp-ink)]"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 border border-[var(--bp-line)] px-3 py-1.5 font-mono text-xs text-[var(--bp-ink)]">
              <Upload className="h-3.5 w-3.5" />
              Import JSON
              <input type="file" accept="application/json" onChange={handleImportJson} className="hidden" />
            </label>
            <button
              type="button"
              onClick={onBackPublic}
              className="lg:hidden border border-[var(--bp-line)] px-3 py-1.5 font-mono text-xs text-[var(--bp-ink)]"
            >
              Public Site
            </button>
          </div>
        </header>

        <main className="p-6 max-w-6xl w-full space-y-6">
          {notice && (
            <div className="border border-[var(--bp-accent)] bg-[var(--bp-surface-solid)] px-4 py-2.5 font-mono text-xs text-[var(--bp-accent)]">
              {notice}
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Experiences', count: bundle.experiences.filter((i) => !i.deletedAt).length, icon: LayoutDashboard },
                  { label: 'Projects', count: bundle.projects.filter((i) => !i.deletedAt).length, icon: FileText },
                  { label: 'Unread Messages', count: unreadCount, icon: Inbox },
                  { label: 'Last ATS Score', count: `${bundle.siteSettings.lastAtsScore}/100`, icon: Shield },
                ].map((card) => (
                  <div key={card.label} className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-4">
                    <p className="font-mono text-xs text-[var(--bp-ink-muted)]">{card.label}</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-[var(--bp-ink)] tabular-nums">
                      {card.count}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-5">
                  <h3 className="font-display text-base font-semibold text-[var(--bp-ink)]">
                    Recent Contact Messages
                  </h3>
                  {messages.length === 0 ? (
                    <p className="mt-3 text-xs text-[var(--bp-ink-muted)]">No messages received yet.</p>
                  ) : (
                    <div className="mt-3 divide-y divide-[var(--bp-line)]">
                      {messages.slice(0, 4).map((m) => (
                        <div key={m.id} className="py-2.5">
                          <p className="text-sm font-medium text-[var(--bp-ink)]">{m.subject}</p>
                          <p className="font-mono text-xs text-[var(--bp-ink-muted)]">
                            {m.name} ({m.email})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-5 space-y-3">
                  <h3 className="font-display text-base font-semibold text-[var(--bp-ink)]">
                    Resume &amp; AI Studio Shortcuts
                  </h3>
                  <p className="font-mono text-xs text-[var(--bp-ink-muted)]">
                    Last resume build: {bundle.siteSettings.lastResumeBuildAt}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setTab('resume')}
                      className="bg-[var(--bp-accent)] px-4 py-2 font-mono text-xs font-semibold text-[var(--bp-accent-fg)]"
                    >
                      Open ATS Scorer
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('media')}
                      className="inline-flex items-center gap-1.5 border border-[var(--bp-line-strong)] px-4 py-2 font-mono text-xs text-[var(--bp-ink)]"
                    >
                      <Film className="h-3.5 w-3.5" />
                      Open AI Media Studio
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-6 space-y-5">
              <h3 className="font-display text-lg font-semibold text-[var(--bp-ink)]">
                Profile, Contact Details &amp; Site Settings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Full Name</span>
                  <input
                    type="text"
                    required
                    value={profileDraft.name}
                    onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent px-3 py-2 text-sm text-[var(--bp-ink)]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Primary Role</span>
                  <input
                    type="text"
                    required
                    value={profileDraft.role}
                    onChange={(e) => setProfileDraft({ ...profileDraft, role: e.target.value })}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent px-3 py-2 text-sm text-[var(--bp-ink)]"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Hero Headline</span>
                  <input
                    type="text"
                    required
                    value={profileDraft.headline}
                    onChange={(e) => setProfileDraft({ ...profileDraft, headline: e.target.value })}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent px-3 py-2 text-sm text-[var(--bp-ink)]"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Summary (Used in About &amp; Resume)</span>
                  <textarea
                    rows={4}
                    required
                    value={profileDraft.summary}
                    onChange={(e) => setProfileDraft({ ...profileDraft, summary: e.target.value })}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent p-3 text-sm text-[var(--bp-ink)]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Email</span>
                  <input
                    type="email"
                    required
                    value={profileDraft.email}
                    onChange={(e) => setProfileDraft({ ...profileDraft, email: e.target.value })}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent px-3 py-2 text-sm text-[var(--bp-ink)]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Phone</span>
                  <input
                    type="text"
                    value={profileDraft.phone}
                    onChange={(e) => setProfileDraft({ ...profileDraft, phone: e.target.value })}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent px-3 py-2 text-sm text-[var(--bp-ink)]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Location</span>
                  <input
                    type="text"
                    value={profileDraft.location}
                    onChange={(e) => setProfileDraft({ ...profileDraft, location: e.target.value })}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent px-3 py-2 text-sm text-[var(--bp-ink)]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Availability</span>
                  <input
                    type="text"
                    value={profileDraft.availability}
                    onChange={(e) => setProfileDraft({ ...profileDraft, availability: e.target.value })}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent px-3 py-2 text-sm text-[var(--bp-ink)]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">GitHub URL</span>
                  <input
                    type="text"
                    value={profileDraft.githubUrl}
                    onChange={(e) => setProfileDraft({ ...profileDraft, githubUrl: e.target.value })}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent px-3 py-2 text-sm text-[var(--bp-ink)]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">LinkedIn URL</span>
                  <input
                    type="text"
                    value={profileDraft.linkedinUrl}
                    onChange={(e) => setProfileDraft({ ...profileDraft, linkedinUrl: e.target.value })}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent px-3 py-2 text-sm text-[var(--bp-ink)]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Sheet Revision</span>
                  <input
                    type="text"
                    value={settingsDraft.sheetRevision}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, sheetRevision: e.target.value })}
                    className="mt-1 w-full border border-[var(--bp-line)] bg-transparent px-3 py-2 text-sm text-[var(--bp-ink)]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-xs text-[var(--bp-ink-muted)]">Resume Paper Size</span>
                  <select
                    value={profileDraft.resumeConfig.paperSize}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        resumeConfig: {
                          ...profileDraft.resumeConfig,
                          paperSize: e.target.value as 'LETTER' | 'A4',
                        },
                      })
                    }
                    className="mt-1 w-full border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-3 py-2 text-sm text-[var(--bp-ink)]"
                  >
                    <option value="LETTER">US Letter</option>
                    <option value="A4">A4</option>
                  </select>
                </label>
              </div>
              <button
                type="submit"
                className="bg-[var(--bp-accent)] px-5 py-2.5 font-mono text-xs font-semibold text-[var(--bp-accent-fg)]"
              >
                Save &amp; Sync Live Site
              </button>
            </form>
          )}

          {tab === 'experiences' && (
            <CollectionCrudPanel<Experience>
              entityKey="experiences"
              title="Work Experience"
              items={bundle.experiences}
              fields={[
                { key: 'role', label: 'Role Title', type: 'text', required: true },
                { key: 'company', label: 'Company', type: 'text', required: true },
                { key: 'location', label: 'Location', type: 'text' },
                { key: 'startDate', label: 'Start Date (Mon YYYY)', type: 'text', required: true },
                { key: 'endDate', label: 'End Date (Mon YYYY / Present)', type: 'text', required: true },
                { key: 'bullets', label: 'Achievement Bullets', type: 'lines' },
                { key: 'techStack', label: 'Tech Stack (comma separated)', type: 'csv' },
                { key: 'featured', label: 'Featured Role', type: 'checkbox' },
              ]}
              getTitle={(i) => `${i.role} — ${i.company}`}
              getSubtitle={(i) => `${i.startDate} – ${i.endDate} · ${i.location}`}
              createBlank={(order) => ({
                id: uid('exp'),
                company: '',
                role: '',
                location: 'Bengaluru, India',
                startDate: 'Jan 2025',
                endDate: 'Present',
                bullets: [],
                techStack: [],
                featured: false,
                order,
                visible: true,
                deletedAt: null,
                createdAt: nowIso(),
                updatedAt: nowIso(),
              })}
              onSave={(item, isNew) => handleCollectionSave('experiences', item, isNew)}
              onSoftDelete={(id) => handleSoftDelete('experiences', id)}
              onRestore={(id) => handleRestore('experiences', id)}
              onHardDelete={(id) => handleHardDelete('experiences', id)}
              onReorder={(ordered) => handleReorder('experiences', ordered)}
            />
          )}

          {tab === 'skills' && (
            <CollectionCrudPanel<Skill>
              entityKey="skills"
              title="Technical Skills"
              items={bundle.skills}
              fields={[
                { key: 'category', label: 'Category (Cloud, Kubernetes, CI/CD, IaC, Observability, Databases, Security, Scripting)', type: 'text', required: true },
                { key: 'name', label: 'Skill Name', type: 'text', required: true },
                { key: 'level', label: 'Proficiency (1-100)', type: 'number', required: true },
                { key: 'years', label: 'Years of Experience', type: 'number', required: true },
              ]}
              getTitle={(i) => i.name}
              getSubtitle={(i) => `${i.category} · ${i.level}% · ${i.years} years`}
              createBlank={(order) => ({
                id: uid('sk'),
                category: 'Kubernetes',
                name: '',
                level: 85,
                years: 2,
                order,
                visible: true,
                deletedAt: null,
                createdAt: nowIso(),
                updatedAt: nowIso(),
              })}
              onSave={(item, isNew) => handleCollectionSave('skills', item, isNew)}
              onSoftDelete={(id) => handleSoftDelete('skills', id)}
              onRestore={(id) => handleRestore('skills', id)}
              onHardDelete={(id) => handleHardDelete('skills', id)}
              onReorder={(ordered) => handleReorder('skills', ordered)}
            />
          )}

          {tab === 'projects' && (
            <CollectionCrudPanel<Project>
              entityKey="projects"
              title="Projects"
              items={bundle.projects}
              fields={[
                { key: 'title', label: 'Project Title', type: 'text', required: true },
                { key: 'role', label: 'Your Role', type: 'text', required: true },
                { key: 'summary', label: 'Architecture Summary', type: 'textarea', required: true },
                { key: 'outcomes', label: 'Quantified Outcomes', type: 'lines' },
                { key: 'techTags', label: 'Tech Tags (comma separated)', type: 'csv' },
                { key: 'githubUrl', label: 'GitHub URL', type: 'text' },
                { key: 'liveUrl', label: 'Live URL', type: 'text' },
                { key: 'imageUrl', label: 'Image URL', type: 'text' },
                { key: 'videoUrl', label: 'Video URL', type: 'text' },
                { key: 'featured', label: 'Featured Project', type: 'checkbox' },
              ]}
              getTitle={(i) => i.title}
              getSubtitle={(i) => `${i.role} · ${i.techTags.join(', ')}`}
              createBlank={(order) => ({
                id: uid('proj'),
                title: '',
                summary: '',
                role: 'Lead Engineer',
                outcomes: [],
                techTags: [],
                githubUrl: '',
                liveUrl: '',
                imageUrl: '',
                videoUrl: '',
                featured: false,
                order,
                visible: true,
                deletedAt: null,
                createdAt: nowIso(),
                updatedAt: nowIso(),
              })}
              onSave={(item, isNew) => handleCollectionSave('projects', item, isNew)}
              onSoftDelete={(id) => handleSoftDelete('projects', id)}
              onRestore={(id) => handleRestore('projects', id)}
              onHardDelete={(id) => handleHardDelete('projects', id)}
              onReorder={(ordered) => handleReorder('projects', ordered)}
            />
          )}

          {tab === 'education' && (
            <CollectionCrudPanel<Education>
              entityKey="education"
              title="Education"
              items={bundle.education}
              fields={[
                { key: 'degree', label: 'Degree', type: 'text', required: true },
                { key: 'institution', label: 'Institution', type: 'text', required: true },
                { key: 'years', label: 'Years', type: 'text', required: true },
                { key: 'score', label: 'Score / GPA', type: 'text' },
              ]}
              getTitle={(i) => i.degree}
              getSubtitle={(i) => `${i.institution} (${i.years})`}
              createBlank={(order) => ({
                id: uid('edu'),
                degree: '',
                institution: '',
                years: '',
                score: '',
                order,
                visible: true,
                deletedAt: null,
                createdAt: nowIso(),
                updatedAt: nowIso(),
              })}
              onSave={(item, isNew) => handleCollectionSave('education', item, isNew)}
              onSoftDelete={(id) => handleSoftDelete('education', id)}
              onRestore={(id) => handleRestore('education', id)}
              onHardDelete={(id) => handleHardDelete('education', id)}
              onReorder={(ordered) => handleReorder('education', ordered)}
            />
          )}

          {tab === 'certifications' && (
            <CollectionCrudPanel<Certification>
              entityKey="certifications"
              title="Certifications"
              items={bundle.certifications}
              fields={[
                { key: 'name', label: 'Certification Name', type: 'text', required: true },
                { key: 'issuer', label: 'Issuer', type: 'text', required: true },
                { key: 'date', label: 'Date (Mon YYYY)', type: 'text', required: true },
                { key: 'credentialId', label: 'Credential ID', type: 'text' },
                { key: 'credentialUrl', label: 'Verification URL', type: 'text' },
              ]}
              getTitle={(i) => i.name}
              getSubtitle={(i) => `${i.issuer} · ${i.date}`}
              createBlank={(order) => ({
                id: uid('cert'),
                name: '',
                issuer: '',
                date: '',
                credentialId: '',
                credentialUrl: '',
                badgeUrl: '',
                order,
                visible: true,
                deletedAt: null,
                createdAt: nowIso(),
                updatedAt: nowIso(),
              })}
              onSave={(item, isNew) => handleCollectionSave('certifications', item, isNew)}
              onSoftDelete={(id) => handleSoftDelete('certifications', id)}
              onRestore={(id) => handleRestore('certifications', id)}
              onHardDelete={(id) => handleHardDelete('certifications', id)}
              onReorder={(ordered) => handleReorder('certifications', ordered)}
            />
          )}

          {tab === 'achievements' && (
            <CollectionCrudPanel<Achievement>
              entityKey="achievements"
              title="Achievements"
              items={bundle.achievements}
              fields={[
                { key: 'title', label: 'Title', type: 'text', required: true },
                { key: 'issuer', label: 'Issuer', type: 'text' },
                { key: 'date', label: 'Date', type: 'text', required: true },
                { key: 'metric', label: 'Key Metric', type: 'text' },
                { key: 'description', label: 'Description', type: 'textarea' },
              ]}
              getTitle={(i) => i.title}
              getSubtitle={(i) => `${i.date} · ${i.metric}`}
              createBlank={(order) => ({
                id: uid('ach'),
                title: '',
                issuer: '',
                date: '',
                metric: '',
                description: '',
                order,
                visible: true,
                deletedAt: null,
                createdAt: nowIso(),
                updatedAt: nowIso(),
              })}
              onSave={(item, isNew) => handleCollectionSave('achievements', item, isNew)}
              onSoftDelete={(id) => handleSoftDelete('achievements', id)}
              onRestore={(id) => handleRestore('achievements', id)}
              onHardDelete={(id) => handleHardDelete('achievements', id)}
              onReorder={(ordered) => handleReorder('achievements', ordered)}
            />
          )}

          {tab === 'volunteering' && (
            <CollectionCrudPanel<Volunteering>
              entityKey="volunteering"
              title="Volunteering"
              items={bundle.volunteering}
              fields={[
                { key: 'organisation', label: 'Organisation', type: 'text', required: true },
                { key: 'role', label: 'Role', type: 'text', required: true },
                { key: 'dates', label: 'Dates', type: 'text', required: true },
                { key: 'impact', label: 'Impact Summary', type: 'textarea' },
              ]}
              getTitle={(i) => `${i.role} — ${i.organisation}`}
              getSubtitle={(i) => i.dates}
              createBlank={(order) => ({
                id: uid('vol'),
                organisation: '',
                role: '',
                dates: '',
                impact: '',
                order,
                visible: true,
                deletedAt: null,
                createdAt: nowIso(),
                updatedAt: nowIso(),
              })}
              onSave={(item, isNew) => handleCollectionSave('volunteering', item, isNew)}
              onSoftDelete={(id) => handleSoftDelete('volunteering', id)}
              onRestore={(id) => handleRestore('volunteering', id)}
              onHardDelete={(id) => handleHardDelete('volunteering', id)}
              onReorder={(ordered) => handleReorder('volunteering', ordered)}
            />
          )}

          {tab === 'resume' && (
            <AtsResumePanel
              bundle={bundle}
              onPublishStatusChange={async (score, published) => {
                await saveSiteSettings({
                  ...bundle.siteSettings,
                  lastAtsScore: score,
                  resumePublished: published,
                  lastResumeBuildAt: nowIso(),
                });
                await refreshAll();
                flash(`Resume published with ATS score ${score}/100.`);
              }}
            />
          )}

          {tab === 'media' && (
            <MediaStudioPanel
              assets={mediaAssets}
              projects={bundle.projects.filter((p) => !p.deletedAt)}
              onRefresh={refreshAll}
              onAssignToProject={handleAssignMediaToProject}
            />
          )}

          {tab === 'inbox' && (
            <div className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] divide-y divide-[var(--bp-line)]">
              {messages.length === 0 ? (
                <p className="p-6 font-mono text-xs text-[var(--bp-ink-muted)]">Inbox is empty.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="p-5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-[var(--bp-ink)]">
                          {m.subject} {!m.read && <span className="font-mono text-xs text-[var(--bp-accent)]">[NEW]</span>}
                        </p>
                        <p className="font-mono text-xs text-[var(--bp-ink-muted)]">
                          {m.name} &lt;{m.email}&gt; · {m.createdAt}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await markContactMessageRead(m.id, !m.read);
                            await refreshAll();
                          }}
                          className="border border-[var(--bp-line)] px-2.5 py-1 font-mono text-xs text-[var(--bp-ink)]"
                        >
                          {m.read ? 'Mark Unread' : 'Mark Read'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteContactMessage(m.id);
                            await refreshAll();
                          }}
                          className="border border-rose-500/50 px-2.5 py-1 font-mono text-xs text-rose-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--bp-ink)] whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'audit' && (
            <div className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-[var(--bp-line)] text-[var(--bp-ink-muted)]">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bp-line)]/50 text-[var(--bp-ink)]">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="p-3 whitespace-nowrap">{log.createdAt.slice(0, 19).replace('T', ' ')}</td>
                      <td className="p-3">{log.actorEmail}</td>
                      <td className="p-3 text-[var(--bp-accent)]">{log.action}</td>
                      <td className="p-3">{log.entity}/{log.entityId}</td>
                      <td className="p-3">{log.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
