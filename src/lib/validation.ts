import { z } from 'zod';

export const idPattern = /^[a-zA-Z0-9_-]+$/;

export const validIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(idPattern, 'ID must contain only alphanumeric characters, underscores, or hyphens.');

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().min(2).max(160),
  headline: z.string().trim().min(2).max(240),
  typedTaglines: z.array(z.string().trim().min(1).max(140)).max(10),
  summary: z.string().trim().min(10).max(2500),
  location: z.string().trim().max(160),
  availability: z.string().trim().max(160),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(60),
  linkedinUrl: z.string().trim().max(300),
  githubUrl: z.string().trim().max(300),
  websiteUrl: z.string().trim().max(300),
  avatarUrl: z.string().trim().max(500),
  stats: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(40),
        unit: z.string().trim().max(40).optional(),
      })
    )
    .max(8),
  resumeConfig: z.object({
    paperSize: z.enum(['LETTER', 'A4']),
    includeVolunteering: z.boolean(),
    includeAchievements: z.boolean(),
    maxPages: z.union([z.literal(1), z.literal(2)]),
    targetRole: z.string().trim().max(160),
  }),
  updatedAt: z.string().max(60),
});

export const siteSettingsSchema = z.object({
  siteTitle: z.string().trim().min(2).max(160),
  sheetRevision: z.string().trim().min(1).max(30),
  defaultTheme: z.enum(['dark', 'light']),
  lastResumeBuildAt: z.string().max(60),
  lastAtsScore: z.number().min(0).max(100),
  resumePublished: z.boolean(),
  updatedAt: z.string().max(60),
});

const baseEntityFields = {
  id: validIdSchema,
  order: z.number().int().min(0).max(10000),
  visible: z.boolean(),
  deletedAt: z.string().max(60).nullable(),
  createdAt: z.string().max(60),
  updatedAt: z.string().max(60),
};

export const experienceSchema = z.object({
  ...baseEntityFields,
  company: z.string().trim().min(1).max(160),
  role: z.string().trim().min(1).max(160),
  location: z.string().trim().max(160),
  startDate: z.string().trim().min(1).max(40),
  endDate: z.string().trim().min(1).max(40),
  bullets: z.array(z.string().trim().min(1).max(400)).max(15),
  techStack: z.array(z.string().trim().min(1).max(60)).max(20),
  featured: z.boolean().optional(),
});

export const skillSchema = z.object({
  ...baseEntityFields,
  category: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  level: z.number().min(1).max(100),
  years: z.number().min(0).max(50),
});

export const projectSchema = z.object({
  ...baseEntityFields,
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(2000),
  role: z.string().trim().max(160),
  outcomes: z.array(z.string().trim().min(1).max(300)).max(10),
  techTags: z.array(z.string().trim().min(1).max(60)).max(20),
  githubUrl: z.string().trim().max(400),
  liveUrl: z.string().trim().max(400),
  imageUrl: z.string().trim().max(500),
  videoUrl: z.string().trim().max(500),
  featured: z.boolean(),
});

export const educationSchema = z.object({
  ...baseEntityFields,
  degree: z.string().trim().min(1).max(200),
  institution: z.string().trim().min(1).max(200),
  years: z.string().trim().min(1).max(60),
  score: z.string().trim().max(60),
});

export const certificationSchema = z.object({
  ...baseEntityFields,
  name: z.string().trim().min(1).max(200),
  issuer: z.string().trim().min(1).max(160),
  date: z.string().trim().min(1).max(40),
  credentialId: z.string().trim().max(120),
  credentialUrl: z.string().trim().max(400),
  badgeUrl: z.string().trim().max(500),
});

export const achievementSchema = z.object({
  ...baseEntityFields,
  title: z.string().trim().min(1).max(200),
  issuer: z.string().trim().max(160),
  date: z.string().trim().min(1).max(40),
  metric: z.string().trim().max(120),
  description: z.string().trim().max(1000),
});

export const volunteeringSchema = z.object({
  ...baseEntityFields,
  organisation: z.string().trim().min(1).max(180),
  role: z.string().trim().min(1).max(160),
  dates: z.string().trim().min(1).max(80),
  impact: z.string().trim().max(1000),
});

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Valid email is required').max(180),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(4000),
  honeypot: z.string().max(0).optional().default(''),
  turnstileToken: z.string().max(2048).optional().default(''),
});

export const portfolioBundleSchema = z.object({
  profile: profileSchema,
  siteSettings: siteSettingsSchema,
  experiences: z.array(experienceSchema),
  skills: z.array(skillSchema),
  projects: z.array(projectSchema),
  education: z.array(educationSchema),
  certifications: z.array(certificationSchema),
  achievements: z.array(achievementSchema),
  volunteering: z.array(volunteeringSchema),
});

export const imageGenRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(1200),
  model: z.enum(['gemini-3-pro-image-preview', 'gemini-nano-banana-2.1']),
  aspectRatio: z.enum(['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9']),
  imageSize: z.enum(['1K', '2K', '4K']).default('1K'),
});

export const videoGenRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(1200),
  aspectRatio: z.enum(['16:9', '9:16']),
  imageBase64: z.string().max(12_000_000).optional(),
  imageMimeType: z.string().max(60).optional(),
});

export function sanitizePlainText(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}
