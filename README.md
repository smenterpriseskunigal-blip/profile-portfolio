# Yashwanth Gowda M — 3D Blueprint Portfolio & Admin CMS

A production-grade personal portfolio, protected admin CMS, and automated ATS resume compiler built for **Yashwanth Gowda M** (DevOps / Cloud / Kubernetes Engineer) on `yashwanthgowdam.in`.

## Architecture

```
Browser (React 19 + Three.js WebGL Blueprint + Tailwind CSS v4)
  ├── Public Portfolio (/) — 10 drafting-sheet sections + Dark/Cyanotype Light themes
  ├── Admin Gate (/adminlogin) — Firebase Auth (verified owner Google account)
  ├── Admin Dashboard (/adminlogin/dashboard) — Full CRUD, Drag/Reorder, Soft-Delete/Restore, JSON Export/Import
  │
  ├── Firebase Firestore ──► Persists Profile, Experience, Skills, Projects, Education, Certs, Achievements, Volunteering, Messages, Media, Audit Logs
  │
  └── Express Server (server.ts, port 3000)
        ├── GET /api/resume & /resume.pdf ──► PDFKit single-column selectable-text PDF compiler
        ├── POST /api/ats/score ──► pdf-parse extraction + 100-pt ATS rubric scorer
        ├── POST /api/contact ──► Zod + honeypot + Turnstile + rate-limit + optional Resend email
        ├── POST /api/admin/media/image ──► Server-side Gemini image generation (1K/2K/4K, 8 aspect ratios)
        ├── POST /api/admin/media/video ──► Server-side Gemini Omni video generation (16:9 / 9:16)
        └── GET /sitemap.xml & /robots.txt
```

## Key Features

- **Engineering Blueprint Aesthetic**: Dark Blueprint (`#0A2A5E` to `#0E3A7D`) and Cyanotype Inverse Light (`#F4F8FF`) modes with `8px/64px` double grids, corner title blocks, registration marks, and `Outfit` / `DM Sans` / `JetBrains Mono` typography.
- **Interactive 3D Scenes (Three.js)**:
  - **Hero AWS EKS Blueprint**: 1 VPC boundary, 3 AZ subnets (`us-east-1a/b/c`), worker nodes, pulsing pods, Application Load Balancer hub, animated instanced traffic pulses, hover/click inspection callouts, and automatic SVG blueprint fallback for reduced-motion or low-GPU environments.
  - **Skills Tech Cluster**: Orbiting 3D category cluster synchronized with skill category filter tabs.
- **Protected Admin CMS (`/adminlogin`)**: Edit every section, reorder items, toggle visibility/featured flags, soft-delete and restore items, manage contact inbox, inspect audit logs, export/import full JSON backups, and generate blueprint visuals via AI Media Studio.
- **Single-Source ATS Resume PDF (`/resume.pdf`)**: Automatically generated in selectable plain-text single-column layout (`Yashwanth_Gowda_M_Resume.pdf`) and checked against a 100-point ATS rubric before publishing.

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and populate secrets as needed (`GEMINI_API_KEY`, optional `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`).
3. Start development server (Express + Vite SSR/middleware on port `3000`):
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — Start development server on `http://localhost:3000`
- `npm run build` — Build production Vite client bundle (`dist/`)
- `npm start` — Run Express server (`tsx server.ts`)
- `npm run lint` — Run TypeScript typechecking (`tsc --noEmit`)
- `npm run lint:rules` — Validate `firestore.rules` with `@firebase/eslint-plugin-security-rules`
- `npm test` — Run Vitest unit & ATS resume tests (`tests/`)

## Documentation

- [Deployment, DNS & Rollback Guide](docs/DEPLOYMENT.md)
- [Non-Developer Content & Resume Guide](docs/CONTENT_GUIDE.md)
- [Security Spec](security_spec.md)
