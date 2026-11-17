# Content & Resume Management Guide

This guide explains how to update all portfolio content, generate blueprint visuals, and publish your ATS resume without touching code.

## 1. Signing In to the Admin Portal

1. Visit `/adminlogin` (or click **Admin Portal** in the portfolio footer).
2. Click **Continue with Google** and sign in with the verified owner Google account.
3. You will be redirected to `/adminlogin/dashboard`.

## 2. Replacing Placeholder Seed Data

All initial seed entries marked `(TODO: replace via admin)` are safe placeholders. Replace them section by section:

- **Profile & Settings**: Update your bio, availability status, phone, location, GitHub/LinkedIn URLs, headline stats, and preferred resume paper size (`US Letter` or `A4`).
- **Work Experience / Skills / Projects / Education / Certifications / Achievements / Volunteering**:
  - Click **+ Add Item** to create a new entry.
  - Click **Edit** on an existing placeholder to replace company names, dates (`Mon YYYY`), quantified bullets, and tech tags.
  - Use the **Up / Down** buttons to reorder items.
  - Use the **Hide / Show** button to toggle public visibility without deleting.
  - Click **Trash** to soft-delete an item; switch to **Show Trash** anytime to **Restore** or permanently delete.

Every save automatically updates the live public portfolio and writes an entry to the **Audit Log**.

## 3. Running the ATS Scorer & Publishing Your Resume

1. Open the **ATS Resume & Scorer** tab in the Admin Dashboard.
2. Optionally paste a target **Job Description** to check keyword coverage against that specific role.
3. Click **Run ATS Check**.
4. Review your 100-point breakdown and the **Actionable Fix List**.
5. Once your score is **90 or higher**, click **Publish Resume** to update the live `/resume.pdf` and `/api/resume` endpoints.

## 4. Generating Visuals in AI Media Studio

1. Open the **AI Media Studio** tab.
2. Choose **Image Studio** (1K/2K/4K resolution across 8 aspect ratios) or **Video Studio** (16:9 / 9:16 text-to-video or photo-to-video).
3. Save generated assets to the Media Library and click **Assign to Project** to attach them directly to any portfolio project card.

## 5. Backing Up Your Portfolio

Click **Export JSON** in the top bar of the Admin Dashboard to download a full snapshot of your portfolio. You can restore it later with **Import JSON**.
