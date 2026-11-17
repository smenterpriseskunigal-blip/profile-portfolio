import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { SEED_PORTFOLIO } from './src/data/seed.ts';
import {
  contactFormSchema,
  imageGenRequestSchema,
  portfolioBundleSchema,
  videoGenRequestSchema,
} from './src/lib/validation.ts';
import { generateStudioImage, generateStudioVideo } from './src/server/ai/mediaService.ts';
import { createRateLimiter, requireAdmin } from './src/server/auth/verifyAdmin.ts';
import { evaluateAtsScore } from './src/server/resume/atsScorer.ts';
import { generateAtsResumePdf } from './src/server/resume/pdfGenerator.ts';
import type { PortfolioBundle } from './src/types/portfolio.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '15mb' }));

// Global security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (req.path.startsWith('/adminlogin') || req.path.startsWith('/api/admin')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});

// Live portfolio snapshot used for server-side PDF compilation & ATS scoring
let activePortfolioSnapshot: PortfolioBundle = structuredClone(SEED_PORTFOLIO);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'yashwanth-blueprint-portfolio' });
});

// Sync portfolio bundle from client/admin to server PDF engine
app.post('/api/resume/sync', (req, res) => {
  const parsed = portfolioBundleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid portfolio payload.', issues: parsed.error.issues });
    return;
  }
  activePortfolioSnapshot = parsed.data;
  res.json({ ok: true, syncedAt: new Date().toISOString() });
});

async function handleServeResume(req: express.Request, res: express.Response) {
  try {
    const inline = req.query.inline === '1';
    const result = await generateAtsResumePdf(activePortfolioSnapshot);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${result.filename}"`
    );
    res.setHeader('Cache-Control', 'no-store');
    res.send(result.buffer);
  } catch (err) {
    console.error('Resume PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate ATS resume PDF.' });
  }
}

app.get('/api/resume', handleServeResume);
app.get('/resume.pdf', handleServeResume);

app.post('/api/resume', async (req, res) => {
  try {
    const parsed = portfolioBundleSchema.safeParse(req.body);
    const targetBundle = parsed.success ? parsed.data : activePortfolioSnapshot;
    if (parsed.success) {
      activePortfolioSnapshot = parsed.data;
    }
    const result = await generateAtsResumePdf(targetBundle);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (err) {
    console.error('Resume POST error:', err);
    res.status(500).json({ error: 'Failed to compile resume PDF.' });
  }
});

// Extract text from generated PDF via pdf-parse and evaluate 100-pt ATS rubric
app.post('/api/ats/score', requireAdmin, async (req, res) => {
  try {
    const { bundle, jobDescription } = req.body as {
      bundle?: PortfolioBundle;
      jobDescription?: string;
    };
    const parsed = bundle ? portfolioBundleSchema.safeParse(bundle) : null;
    const target = parsed && parsed.success ? parsed.data : activePortfolioSnapshot;
    if (parsed && parsed.success) {
      activePortfolioSnapshot = parsed.data;
    }

    const pdf = await generateAtsResumePdf(target);
    let extractedText = '';
    let pageCount = pdf.pageCount;

    try {
      const pdfParseModule = await import('pdf-parse');
      const PDFParseClass = (pdfParseModule as { PDFParse?: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string; total?: number }> } }).PDFParse;
      if (PDFParseClass) {
        const parser = new PDFParseClass({ data: pdf.buffer });
        const parsedPdf = await parser.getText();
        extractedText = parsedPdf.text || '';
        pageCount = parsedPdf.total || pdf.pageCount;
      } else if (typeof (pdfParseModule as { default?: unknown }).default === 'function') {
        const fn = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string; numpages?: number }> }).default;
        const parsedPdf = await fn(pdf.buffer);
        extractedText = parsedPdf.text || '';
        pageCount = parsedPdf.numpages || pdf.pageCount;
      }
    } catch (parseErr) {
      console.warn('pdf-parse fallback used:', parseErr);
      extractedText = '';
    }

    const report = evaluateAtsScore(target, extractedText, pageCount, jobDescription);
    res.json(report);
  } catch (err) {
    console.error('ATS score error:', err);
    res.status(500).json({ error: 'Failed to evaluate ATS score.' });
  }
});

const contactRateLimit = createRateLimiter(8, 15 * 60 * 1000);

app.post('/api/contact', contactRateLimit, async (req, res) => {
  const parsed = contactFormSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid contact form data.' });
    return;
  }

  // Honeypot trap
  if (parsed.data.honeypot) {
    res.status(200).json({ ok: true });
    return;
  }

  // Optional Turnstile verification when configured
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret && parsed.data.turnstileToken) {
    try {
      const verifyResp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: parsed.data.turnstileToken,
        }),
      });
      const verifyJson = (await verifyResp.json()) as { success?: boolean };
      if (!verifyJson.success) {
        res.status(400).json({ error: 'Spam verification failed.' });
        return;
      }
    } catch (err) {
      console.warn('Turnstile verify error:', err);
    }
  }

  // Optional Resend email relay
  const resendKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL || activePortfolioSnapshot.profile.email;
  if (resendKey && toEmail) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Portfolio Contact <noreply@yashwanthgowdam.in>',
          to: [toEmail],
          subject: `[Portfolio] ${parsed.data.subject}`,
          text: `From: ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
        }),
      });
    } catch (err) {
      console.warn('Resend notification skipped:', err);
    }
  }

  res.json({ ok: true, receivedAt: new Date().toISOString() });
});

const mediaRateLimit = createRateLimiter(12, 10 * 60 * 1000);

app.post('/api/admin/media/image', requireAdmin, mediaRateLimit, async (req, res) => {
  const parsed = imageGenRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid image request.' });
    return;
  }

  try {
    const result = await generateStudioImage(parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Image generation failed.';
    const status = message.includes('403') || message.includes('PERMISSION_DENIED')
      ? 403
      : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
        ? 429
        : 500;
    res.status(status).json({ error: message });
  }
});

app.post('/api/admin/media/video', requireAdmin, mediaRateLimit, async (req, res) => {
  const parsed = videoGenRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid video request.' });
    return;
  }

  try {
    const result = await generateStudioVideo(parsed.data);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Video generation failed.';
    const status = message.includes('403') || message.includes('PERMISSION_DENIED')
      ? 403
      : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
        ? 429
        : 500;
    res.status(status).json({ error: message });
  }
});

// SEO endpoints
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/resume.pdf</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>`);
});

app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /adminlogin
Disallow: /api/admin

Sitemap: ${baseUrl}/sitemap.xml
`);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
