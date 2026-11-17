import type { NextFunction, Request, Response } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const adminAuth = getAuth();

export const ALLOWED_ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || 'smenterpriseskunigal@gmail.com'
).toLowerCase();

export interface AdminRequest extends Request {
  adminUser?: DecodedIdToken;
}

export async function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing bearer token.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    if (!decoded.email_verified || email !== ALLOWED_ADMIN_EMAIL) {
      res.status(403).json({ error: 'Forbidden: Verified owner credentials required.' });
      return;
    }
    req.adminUser = decoded;
    next();
  } catch (err) {
    console.error('Admin token verification failed:', err);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded. Please wait before retrying.',
      });
      return;
    }

    existing.count += 1;
    next();
  };
}
