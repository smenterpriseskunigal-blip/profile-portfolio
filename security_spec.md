# Security Specification — Portfolio & Admin CMS Firestore Rules

## 1. Data Invariants
1. **Default Deny**: All unmatched paths deny read and write access (`allow read, write: if false;`).
2. **Owner-Only Admin Privilege**: Only verified Google Sign-In accounts matching the bootstrapped owner email (`smenterpriseskunigal@gmail.com`) or an explicit document in `/admins/{uid}` with `request.auth.token.email_verified == true` may mutate portfolio records, read contact messages, read/write audit logs, or manage media assets.
3. **PII Isolation on Contact Messages**: Public visitors may only `create` valid `/messages/{msgId}` documents (`read: false` initial state enforced, bounded lengths, valid keys only). Public `get`, `list`, `update`, and `delete` on `/messages` are strictly denied.
4. **Soft-Delete & Visibility Enforcement on Queries**: Public `list` queries on portfolio collections only return documents where `resource.data.visible == true && resource.data.deletedAt == null`, preventing unauthenticated scraping of drafts or soft-deleted records.
5. **Immutable Audit Trail**: `/auditLogs/{logId}` entries can only be created by verified admins and cannot be updated or deleted.
6. **Path ID & Payload Bounds**: Every single-document operation enforces `isValidId()` (`^[a-zA-Z0-9_-]+$`, <=128 chars) and strict `keys().hasAll(...)` / `keys().hasOnly(...)` + `.size()` checks on every string and array.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated write to `/siteContent/profile` (privilege escalation).
2. Unverified email JWT (`email_verified: false`) attempting admin update on `/projects/p1`.
3. Non-admin authenticated user attempting to `list` or `get` `/messages/{msgId}` (PII leak).
4. Shadow field injection on `/messages/m1` adding `isAdmin: true` or `read: true` on create.
5. Unauthenticated `list` on `/experiences` without `visible == true && deletedAt == null` filter.
6. Oversized >1.5KB ID injection (`id Poisoning`) on `/projects/<1500chars>`.
7. Oversized >1MB string injection inside `/messages/m1.message` (Denial of Wallet).
8. Non-admin attempt to write `/admins/{uid}` (self-assigned role escalation).
9. Admin attempt to `update` or `delete` `/auditLogs/{logId}` (audit tampering).
10. Unauthenticated `create` on `/experiences/exp1` with valid schema.
11. Malicious update on `/siteContent/profile` injecting extra unapproved keys (`shadowField`).
12. Unauthenticated `list` on `/auditLogs` or `/mediaAssets` where `visible == false`.
