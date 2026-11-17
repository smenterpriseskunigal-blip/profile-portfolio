import { describe, expect, it } from 'vitest';
import { SEED_PORTFOLIO } from '../src/data/seed.ts';
import {
  contactFormSchema,
  imageGenRequestSchema,
  portfolioBundleSchema,
  sanitizePlainText,
  validIdSchema,
  videoGenRequestSchema,
} from '../src/lib/validation.ts';

describe('Schema & Security Validation', () => {
  it('validates the complete seed portfolio bundle', () => {
    const res = portfolioBundleSchema.safeParse(SEED_PORTFOLIO);
    expect(res.success).toBe(true);
  });

  it('rejects malformed or path-traversal IDs', () => {
    expect(validIdSchema.safeParse('exp-1_prod').success).toBe(true);
    expect(validIdSchema.safeParse('../admin').success).toBe(false);
    expect(validIdSchema.safeParse('bad/id').success).toBe(false);
    expect(validIdSchema.safeParse('').success).toBe(false);
  });

  it('rejects spam honeypot submissions and invalid contact emails', () => {
    const valid = contactFormSchema.safeParse({
      name: 'Priya Nair',
      email: 'priya@example.com',
      subject: 'Platform Engineer Role',
      message: 'We would love to discuss an EKS role.',
      honeypot: '',
    });
    expect(valid.success).toBe(true);

    const botHoneypot = contactFormSchema.safeParse({
      name: 'Bot',
      email: 'bot@example.com',
      subject: 'Spam',
      message: 'Buy crypto now',
      honeypot: 'http://spam.invalid',
    });
    expect(botHoneypot.success).toBe(false);

    const badEmail = contactFormSchema.safeParse({
      name: 'Test',
      email: 'not-an-email',
      subject: 'Hello',
      message: 'Valid message body here.',
    });
    expect(badEmail.success).toBe(false);
  });

  it('enforces allowed AI image and video models and aspect ratios', () => {
    expect(
      imageGenRequestSchema.safeParse({
        prompt: 'Isometric AWS EKS blueprint diagram',
        model: 'gemini-3-pro-image-preview',
        aspectRatio: '21:9',
        imageSize: '2K',
      }).success
    ).toBe(true);

    expect(
      imageGenRequestSchema.safeParse({
        prompt: 'Invalid ratio',
        model: 'gemini-nano-banana-2.1',
        aspectRatio: '5:4',
        imageSize: '1K',
      }).success
    ).toBe(false);

    expect(
      videoGenRequestSchema.safeParse({
        prompt: 'Camera sweep across blueprint EKS cluster',
        aspectRatio: '16:9',
      }).success
    ).toBe(true);

    expect(
      videoGenRequestSchema.safeParse({
        prompt: 'Bad aspect',
        aspectRatio: '1:1',
      }).success
    ).toBe(false);
  });

  it('strips HTML angle brackets in plain text sanitizer', () => {
    expect(sanitizePlainText(' <script>alert(1)</script>Hello ')).toBe('scriptalert(1)/scriptHello');
  });
});
