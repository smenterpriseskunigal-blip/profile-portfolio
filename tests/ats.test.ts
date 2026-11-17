import { describe, expect, it } from 'vitest';
import { SEED_PORTFOLIO } from '../src/data/seed.ts';
import { evaluateAtsScore, extractKeywordsFromJd } from '../src/server/resume/atsScorer.ts';
import { generateAtsResumePdf } from '../src/server/resume/pdfGenerator.ts';

async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const pdfParseModule = await import('pdf-parse');
  const PDFParseClass = (
    pdfParseModule as unknown as {
      PDFParse?: new (opts: { data: Buffer }) => {
        getText: () => Promise<{ text: string; total?: number }>;
      };
    }
  ).PDFParse;

  if (PDFParseClass) {
    const parser = new PDFParseClass({ data: buffer });
    const parsed = await parser.getText();
    return { text: parsed.text || '', pages: parsed.total || 1 };
  }

  const fallbackFn = (
    pdfParseModule as unknown as {
      default?: (buf: Buffer) => Promise<{ text: string; numpages?: number }>;
    }
  ).default;
  if (typeof fallbackFn === 'function') {
    const parsed = await fallbackFn(buffer);
    return { text: parsed.text || '', pages: parsed.numpages || 1 };
  }

  throw new Error('Unable to resolve pdf-parse parser API');
}

describe('ATS Resume PDF Generator & Scorer', () => {
  it('generates a selectable-text single-column PDF scoring >= 90 on the ATS rubric', async () => {
    const pdf = await generateAtsResumePdf(SEED_PORTFOLIO);
    expect(pdf.buffer.byteLength).toBeGreaterThan(1500);
    expect(pdf.filename).toBe('Yashwanth_Gowda_M_Resume.pdf');

    const extracted = await extractPdfText(pdf.buffer);
    expect(extracted.text).toContain('Yashwanth Gowda M');
    expect(extracted.text).toContain('SUMMARY');
    expect(extracted.text).toContain('WORK EXPERIENCE');
    expect(extracted.text).toContain('Amazon EKS');
    expect(extracted.text).toContain('Kubernetes');
    expect(extracted.text).toContain('Terraform');

    const report = evaluateAtsScore(SEED_PORTFOLIO, extracted.text, extracted.pages);
    expect(report.totalScore).toBeGreaterThanOrEqual(90);
    expect(report.publishable).toBe(true);
    expect(report.extractedWordCount).toBeGreaterThanOrEqual(150);
    expect(report.estimatedPages).toBeLessThanOrEqual(2);
  });

  it('blocks publishing when ATS score falls below 90 on stripped data', async () => {
    const stripped = {
      ...SEED_PORTFOLIO,
      profile: {
        ...SEED_PORTFOLIO.profile,
        summary: 'Short placeholder bio.',
        phone: '',
        linkedinUrl: '',
        githubUrl: '',
      },
      experiences: [],
      skills: [],
      projects: [],
    };
    const pdf = await generateAtsResumePdf(stripped);
    const extracted = await extractPdfText(pdf.buffer);
    const report = evaluateAtsScore(stripped, extracted.text, extracted.pages);
    expect(report.totalScore).toBeLessThan(90);
    expect(report.publishable).toBe(false);
    expect(report.fixList.length).toBeGreaterThan(0);
  });

  it('extracts relevant DevOps keywords from a pasted job description', () => {
    const jd =
      'Looking for a Senior Platform Engineer with Amazon EKS, Terraform, ArgoCD, Prometheus, Grafana, and OPA Gatekeeper experience.';
    const keywords = extractKeywordsFromJd(jd);
    expect(keywords).toContain('amazon eks');
    expect(keywords).toContain('terraform');
    expect(keywords).toContain('argocd');
    expect(keywords).toContain('prometheus');
  });
});
