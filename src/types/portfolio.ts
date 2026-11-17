export interface ProfileStat {
  label: string;
  value: string;
  unit?: string;
}

export interface ResumeConfig {
  paperSize: 'LETTER' | 'A4';
  includeVolunteering: boolean;
  includeAchievements: boolean;
  maxPages: 1 | 2;
  targetRole: string;
}

export interface Profile {
  name: string;
  role: string;
  headline: string;
  typedTaglines: string[];
  summary: string;
  location: string;
  availability: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  websiteUrl: string;
  avatarUrl: string;
  stats: ProfileStat[];
  resumeConfig: ResumeConfig;
  updatedAt: string;
}

export interface BaseEntity {
  id: string;
  order: number;
  visible: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Experience extends BaseEntity {
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
  techStack: string[];
  featured?: boolean;
}

export type SkillCategory =
  | 'Cloud'
  | 'Kubernetes'
  | 'CI/CD'
  | 'IaC'
  | 'Observability'
  | 'Databases'
  | 'Security'
  | 'Scripting';

export interface Skill extends BaseEntity {
  category: SkillCategory | string;
  name: string;
  level: number;
  years: number;
}

export interface Project extends BaseEntity {
  title: string;
  summary: string;
  role: string;
  outcomes: string[];
  techTags: string[];
  githubUrl: string;
  liveUrl: string;
  imageUrl: string;
  videoUrl: string;
  featured: boolean;
}

export interface Education extends BaseEntity {
  degree: string;
  institution: string;
  years: string;
  score: string;
}

export interface Certification extends BaseEntity {
  name: string;
  issuer: string;
  date: string;
  credentialId: string;
  credentialUrl: string;
  badgeUrl: string;
}

export interface Achievement extends BaseEntity {
  title: string;
  issuer: string;
  date: string;
  metric: string;
  description: string;
}

export interface Volunteering extends BaseEntity {
  organisation: string;
  role: string;
  dates: string;
  impact: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  kind: 'image' | 'video';
  prompt: string;
  model: string;
  aspectRatio: string;
  resolution?: string;
  mediaUrl: string;
  visible: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface SiteSettings {
  siteTitle: string;
  sheetRevision: string;
  defaultTheme: 'dark' | 'light';
  lastResumeBuildAt: string;
  lastAtsScore: number;
  resumePublished: boolean;
  updatedAt: string;
}

export interface PortfolioBundle {
  profile: Profile;
  siteSettings: SiteSettings;
  experiences: Experience[];
  skills: Skill[];
  projects: Project[];
  education: Education[];
  certifications: Certification[];
  achievements: Achievement[];
  volunteering: Volunteering[];
}

export interface AtsCategoryBreakdown {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  notes: string[];
}

export interface AtsScoreReport {
  totalScore: number;
  publishable: boolean;
  breakdown: AtsCategoryBreakdown[];
  matchedKeywords: string[];
  missingKeywords: string[];
  fixList: string[];
  extractedWordCount: number;
  estimatedPages: number;
  disclaimer: string;
}
