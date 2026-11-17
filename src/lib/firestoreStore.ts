import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { SEED_PORTFOLIO } from '../data/seed.ts';
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
} from '../types/portfolio.ts';
import { auth, db, handleFirestoreError, OperationType } from './firebase.ts';

export type CollectionEntityKey =
  | 'experiences'
  | 'skills'
  | 'projects'
  | 'education'
  | 'certifications'
  | 'achievements'
  | 'volunteering';

function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export async function logAudit(
  action: string,
  entity: string,
  entityId: string,
  summary: string
): Promise<void> {
  const path = 'auditLogs';
  try {
    const id = createId('audit');
    const actorEmail = auth.currentUser?.email || 'admin';
    const entry: AuditLog = {
      id,
      actorEmail,
      action,
      entity,
      entityId,
      summary: summary.slice(0, 500),
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, path, id), entry);
  } catch (err) {
    console.warn('Audit log write skipped:', err);
  }
}

async function fetchPublicCollection<T extends { order: number }>(
  colName: CollectionEntityKey,
  fallback: T[]
): Promise<T[]> {
  try {
    const q = query(
      collection(db, colName),
      where('visible', '==', true),
      where('deletedAt', '==', null)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return fallback;
    }
    return snap.docs
      .map((d) => d.data() as T)
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.warn(`Using seed fallback for ${colName}:`, error);
    return fallback;
  }
}

async function fetchAdminCollection<T extends { order: number }>(
  colName: CollectionEntityKey
): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, colName));
    return snap.docs
      .map((d) => d.data() as T)
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colName);
  }
}

export async function loadPublicPortfolio(): Promise<PortfolioBundle> {
  try {
    const [profileSnap, settingsSnap] = await Promise.all([
      getDoc(doc(db, 'siteContent', 'profile')).catch(() => null),
      getDoc(doc(db, 'siteContent', 'siteSettings')).catch(() => null),
    ]);

    const profile =
      profileSnap && profileSnap.exists()
        ? (profileSnap.data() as Profile)
        : SEED_PORTFOLIO.profile;

    const siteSettings =
      settingsSnap && settingsSnap.exists()
        ? (settingsSnap.data() as SiteSettings)
        : SEED_PORTFOLIO.siteSettings;

    const [
      experiences,
      skills,
      projects,
      education,
      certifications,
      achievements,
      volunteering,
    ] = await Promise.all([
      fetchPublicCollection<Experience>('experiences', SEED_PORTFOLIO.experiences),
      fetchPublicCollection<Skill>('skills', SEED_PORTFOLIO.skills),
      fetchPublicCollection<Project>('projects', SEED_PORTFOLIO.projects),
      fetchPublicCollection<Education>('education', SEED_PORTFOLIO.education),
      fetchPublicCollection<Certification>('certifications', SEED_PORTFOLIO.certifications),
      fetchPublicCollection<Achievement>('achievements', SEED_PORTFOLIO.achievements),
      fetchPublicCollection<Volunteering>('volunteering', SEED_PORTFOLIO.volunteering),
    ]);

    const bundle: PortfolioBundle = {
      profile,
      siteSettings,
      experiences,
      skills,
      projects,
      education,
      certifications,
      achievements,
      volunteering,
    };

    // Keep server resume snapshot updated passively
    void fetch('/api/resume/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle),
    }).catch(() => undefined);

    return bundle;
  } catch {
    return SEED_PORTFOLIO;
  }
}

export async function loadAdminPortfolio(): Promise<PortfolioBundle> {
  try {
    const [profileSnap, settingsSnap] = await Promise.all([
      getDoc(doc(db, 'siteContent', 'profile')),
      getDoc(doc(db, 'siteContent', 'siteSettings')),
    ]);

    const profile = profileSnap.exists()
      ? (profileSnap.data() as Profile)
      : SEED_PORTFOLIO.profile;
    const siteSettings = settingsSnap.exists()
      ? (settingsSnap.data() as SiteSettings)
      : SEED_PORTFOLIO.siteSettings;

    const [
      experiences,
      skills,
      projects,
      education,
      certifications,
      achievements,
      volunteering,
    ] = await Promise.all([
      fetchAdminCollection<Experience>('experiences'),
      fetchAdminCollection<Skill>('skills'),
      fetchAdminCollection<Project>('projects'),
      fetchAdminCollection<Education>('education'),
      fetchAdminCollection<Certification>('certifications'),
      fetchAdminCollection<Achievement>('achievements'),
      fetchAdminCollection<Volunteering>('volunteering'),
    ]);

    return {
      profile,
      siteSettings,
      experiences,
      skills,
      projects,
      education,
      certifications,
      achievements,
      volunteering,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'adminPortfolio');
  }
}

export async function seedFirestoreIfEmpty(): Promise<boolean> {
  try {
    const profileSnap = await getDoc(doc(db, 'siteContent', 'profile'));
    if (profileSnap.exists()) return false;
    await importBundleToFirestore(SEED_PORTFOLIO, 'Initial placeholder seed');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'siteContent/profile');
  }
}

export async function syncResumeWithServer(bundle: PortfolioBundle): Promise<void> {
  const token = await auth.currentUser?.getIdToken().catch(() => null);
  await fetch('/api/resume/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(bundle),
  }).catch(() => undefined);
}

export async function saveProfile(profile: Profile): Promise<void> {
  const path = 'siteContent/profile';
  try {
    const payload = { ...profile, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'siteContent', 'profile'), payload);
    await logAudit('UPDATE', 'profile', 'profile', 'Updated owner profile and contact metadata');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  const path = 'siteContent/siteSettings';
  try {
    const payload = { ...settings, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'siteContent', 'siteSettings'), payload);
    await logAudit('UPDATE', 'siteSettings', 'siteSettings', 'Updated site settings & resume state');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertEntity<T extends { id: string; createdAt: string; updatedAt: string }>(
  colName: CollectionEntityKey,
  item: T,
  isNew: boolean
): Promise<void> {
  const path = `${colName}/${item.id}`;
  try {
    const now = new Date().toISOString();
    const payload: T = {
      ...item,
      createdAt: isNew ? now : item.createdAt || now,
      updatedAt: now,
    };
    await setDoc(doc(db, colName, item.id), payload);
    await logAudit(isNew ? 'CREATE' : 'UPDATE', colName, item.id, `${isNew ? 'Created' : 'Updated'} item in ${colName}`);
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function softDeleteEntity(colName: CollectionEntityKey, id: string): Promise<void> {
  const path = `${colName}/${id}`;
  try {
    const ref = doc(db, colName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    await setDoc(ref, {
      ...data,
      deletedAt: new Date().toISOString(),
      visible: false,
      updatedAt: new Date().toISOString(),
    });
    await logAudit('SOFT_DELETE', colName, id, `Soft-deleted ${colName}/${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function restoreEntity(colName: CollectionEntityKey, id: string): Promise<void> {
  const path = `${colName}/${id}`;
  try {
    const ref = doc(db, colName, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    await setDoc(ref, {
      ...data,
      deletedAt: null,
      visible: true,
      updatedAt: new Date().toISOString(),
    });
    await logAudit('RESTORE', colName, id, `Restored ${colName}/${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function hardDeleteEntity(colName: CollectionEntityKey, id: string): Promise<void> {
  const path = `${colName}/${id}`;
  try {
    await deleteDoc(doc(db, colName, id));
    await logAudit('DELETE', colName, id, `Permanently deleted ${colName}/${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function reorderEntities<T extends { id: string; order: number; updatedAt: string }>(
  colName: CollectionEntityKey,
  orderedItems: T[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    orderedItems.forEach((item, index) => {
      batch.set(doc(db, colName, item.id), {
        ...item,
        order: index,
        updatedAt: now,
      });
    });
    await batch.commit();
    await logAudit('REORDER', colName, 'batch', `Reordered ${orderedItems.length} items in ${colName}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, colName);
  }
}

export async function importBundleToFirestore(
  bundle: PortfolioBundle,
  reason = 'JSON backup import'
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.set(doc(db, 'siteContent', 'profile'), { ...bundle.profile, updatedAt: now });
    batch.set(doc(db, 'siteContent', 'siteSettings'), { ...bundle.siteSettings, updatedAt: now });

    const collections: CollectionEntityKey[] = [
      'experiences',
      'skills',
      'projects',
      'education',
      'certifications',
      'achievements',
      'volunteering',
    ];

    for (const colName of collections) {
      const items = bundle[colName] as Array<{ id: string }>;
      for (const item of items) {
        batch.set(doc(db, colName, item.id), item);
      }
    }

    await batch.commit();
    await logAudit('IMPORT', 'portfolio', 'bundle', reason);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'portfolioBundle');
  }
}

export async function submitContactMessageToFirestore(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<ContactMessage> {
  const id = createId('msg');
  const path = `messages/${id}`;
  const payload: ContactMessage = {
    id,
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    read: false,
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'messages', id), payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchContactMessages(): Promise<ContactMessage[]> {
  try {
    const snap = await getDocs(collection(db, 'messages'));
    return snap.docs
      .map((d) => d.data() as ContactMessage)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'messages');
  }
}

export async function markContactMessageRead(id: string, read: boolean): Promise<void> {
  const path = `messages/${id}`;
  try {
    await updateDoc(doc(db, 'messages', id), { read });
    await logAudit('UPDATE', 'messages', id, `Marked message ${id} as ${read ? 'read' : 'unread'}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteContactMessage(id: string): Promise<void> {
  const path = `messages/${id}`;
  try {
    await deleteDoc(doc(db, 'messages', id));
    await logAudit('DELETE', 'messages', id, `Deleted contact message ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  try {
    const snap = await getDocs(collection(db, 'auditLogs'));
    return snap.docs
      .map((d) => d.data() as AuditLog)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'auditLogs');
  }
}

export async function fetchMediaAssets(): Promise<MediaAsset[]> {
  try {
    const snap = await getDocs(collection(db, 'mediaAssets'));
    return snap.docs
      .map((d) => d.data() as MediaAsset)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'mediaAssets');
  }
}

export async function saveMediaAsset(asset: Omit<MediaAsset, 'id' | 'createdAt'>): Promise<MediaAsset> {
  const id = createId('media');
  const full: MediaAsset = {
    ...asset,
    id,
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'mediaAssets', id), full);
    await logAudit('CREATE', 'mediaAssets', id, `Saved ${asset.kind} generated with ${asset.model}`);
    return full;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `mediaAssets/${id}`);
  }
}

export async function deleteMediaAsset(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'mediaAssets', id));
    await logAudit('DELETE', 'mediaAssets', id, `Deleted media asset ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `mediaAssets/${id}`);
  }
}
