# Deployment, Custom Domain DNS & Rollback Guide (`yashwanthgowdam.in`)

## 1. Environment Variables

Configure these in your hosting environment (Cloud Run / Railway / Render / Fly.io):

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | Optional (`3000`) | HTTP listen port |
| `APP_URL` | Recommended | Canonical public origin, e.g. `https://yashwanthgowdam.in` |
| `ADMIN_EMAIL` | Optional | Defaults to `smenterpriseskunigal@gmail.com` |
| `GEMINI_API_KEY` | For AI Studio | Server-side key for AI Media Studio (`image` / `video`) |
| `RESEND_API_KEY` | Optional | Sends email copy when visitors submit the Contact form |
| `CONTACT_TO_EMAIL` | Optional | Recipient inbox for Contact form alerts |
| `TURNSTILE_SECRET_KEY` | Optional | Cloudflare Turnstile server verification secret |
| `VITE_TURNSTILE_SITE_KEY` | Optional | Client-side Turnstile site key |

> Never commit `.env` files or API keys to Git.

## 2. Production Build & Start

```bash
npm ci
npm run lint
npm run lint:rules
npm test
npm run build
NODE_ENV=production npm start
```

The production Express server (`server.ts`) serves static Vite assets from `dist/`, mounts `/api/*` and `/resume.pdf`, enforces security headers (`HSTS`, `X-Content-Type-Options`, `X-Robots-Tag: noindex` on `/adminlogin`), and falls back to `dist/index.html` for SPA routes.

## 3. Custom Domain DNS (`yashwanthgowdam.in`)

In your domain registrar DNS panel:

1. **Apex (`yashwanthgowdam.in`)**:
   - Point an `A` / `ALIAS` / `ANAME` record to your Cloud Run / load balancer IPv4 address (and `AAAA` if IPv6 is enabled).
2. **`www` Subdomain (`www.yashwanthgowdam.in`)**:
   - Create a `CNAME` record pointing `www` to your hosting target hostname (e.g. `ghs.googlehosted.com` for Cloud Run custom domain mapping), and configure a `301` redirect to `https://yashwanthgowdam.in`.
3. **Firebase Authorized Domains**:
   - In Firebase Console → Authentication → Settings → Authorized domains, add `yashwanthgowdam.in` and `www.yashwanthgowdam.in` so Google Sign-In works on `/adminlogin`.
4. **TLS / HTTPS**:
   - Managed automatically once DNS propagates (`Strict-Transport-Security` header is already active in `server.ts`).

## 4. Firestore Rules Deployment

Whenever `firestore.rules` changes:

```bash
npm run lint:rules
firebase deploy --only firestore:rules
```

## 5. Rollback Procedure

1. **Application rollback**: Re-deploy the previous immutable container revision / Git commit tag from Cloud Run or GitHub Releases (`git checkout <tag>` or traffic-split 100% back to the previous revision).
2. **Content rollback**: Open `/adminlogin/dashboard` → click **Export JSON** regularly before large edits, and use **Import JSON** to restore the entire portfolio state cleanly in one atomic batch write.

## 6. Post-Deploy Smoke-Test Checklist

- [ ] `GET https://yashwanthgowdam.in/` returns HTTP `200` and renders Sheet 01–10 cleanly.
- [ ] `GET https://yashwanthgowdam.in/api/health` returns `{"status":"ok"}`.
- [ ] `GET https://yashwanthgowdam.in/resume.pdf` downloads `Yashwanth_Gowda_M_Resume.pdf` with selectable text.
- [ ] `GET https://yashwanthgowdam.in/sitemap.xml` and `/robots.txt` return valid XML/text (`Disallow: /adminlogin`).
- [ ] `/adminlogin` blocks non-owner emails and unlocks `/adminlogin/dashboard` for the owner account.
- [ ] Contact form submission saves to Firestore `messages` and appears in Admin Inbox.
