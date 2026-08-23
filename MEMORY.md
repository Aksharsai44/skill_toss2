# Skill Toss LMS Project Memory

## Project Overview

Skill Toss is an AI-powered, multi-tenant SaaS learning-management platform for schools, colleges, coaching institutes, and training organizations. The product has Product Admin, Super Admin, Admin, Teacher, Student, and Parent experiences. The current repository combines a polished demo/local LMS experience with selected Supabase-backed features.

## Technology Stack

- React 18, TypeScript, Vite, React Router 6
- Tailwind CSS, Lucide React, Recharts, Anime.js
- Supabase JavaScript client and Supabase Auth/Realtime where integrated
- npm with the committed `package-lock.json`
- ESLint and TypeScript checks; no dedicated automated test script is currently defined

## Repository Architecture

- `src/App.tsx` - application shell and role-protected route map.
- `src/main.tsx` - React entry point and providers.
- `src/components/` - shared layout, auth, classroom, assignment, attachment, and UI components.
- `src/components/ui/` - reusable buttons, modals, tabs, tables, charts, layout primitives, badges, and stat cards.
- `src/portals/{product-admin,super-admin,admin,teacher,student}/` - portal-specific pages and route components.
- `src/lib/auth.tsx`, `authContext.ts`, `supabase.ts` - authentication, database-authoritative profiles, session state, Supabase client, and placeholder-config demo gating.
- `src/lib/lmsData.tsx`, `lmsDataContext.ts` - shared relational LMS state, selectors, actions, local persistence, and Supabase class-session synchronization.
- `src/lib/studentPortal.tsx`, `studentPortalContext.ts` - linked-student selection and Student/Parent viewer permissions.
- `src/lib/types.ts`, `mockData.ts` - domain types and demo seed data.
- `src/lib/attachmentConfig.ts`, `attachmentStorage.ts` - attachment validation and IndexedDB blob storage.
- `src/components/FileAttachmentPicker.tsx` - reusable drag/drop and file-input attachment picker.
- `src/lib/jitsiConfig.ts`, `src/components/JitsiMeeting.tsx`, `LiveClassroomPage.tsx` - shared live-classroom integration.
- `supabase/migrations/20260820000000_secure_tenant_identity_foundation.sql` - clean Phase 1 baseline for institutions, profiles, students, teachers, parent links, safe Auth provisioning, and tenant-aware RLS.
- `supabase/README.md` and `supabase/tests/phase1_schema_checks.sql` - controlled test-account bootstrap and non-mutating schema/RLS checks.
- `supabase/config.toml` - local Supabase CLI configuration for PostgreSQL 17; the ignored `.temp` link cache targets development project `tbtevazchmwouwxxuwcu`.

## Core Decisions

- Authentication uses Supabase Auth plus a database-authoritative `profiles` record for role, institution, name, email, avatar, and active status. New Auth users receive an inactive, unassigned Student profile and require controlled provisioning; editable Auth metadata never supplies role or institution. Demo fallback profiles are available only while Supabase uses placeholder configuration.
- The deployable Supabase migration chain is a clean, new-project Phase 1 baseline. `academic_courses` and `learning_courses` are reserved names for later academic and Course Builder phases and do not exist yet.
- Phase 1 is deployed and remotely verified on development project `tbtevazchmwouwxxuwcu`. Its public schema contains only the five Phase 1 tables, and the `Skill Toss Demo College` (`STDC`) institution exists. Auth test users and their academic identity links still require manual Dashboard creation/provisioning.
- Protected routes derive access from the authenticated profile role; users do not manually choose a role at login.
- Student and Parent share one portal architecture. A parent views linked students through `activeStudentId` and remains read-only for student data.
- LMS data is modeled relationally around institutions, departments, batches, courses, users, assignments, submissions, attendance, exams, fees, resources, notifications, and class sessions.
- Cross-portal behavior should use the shared LMS context and domain actions so teacher changes flow to student and parent views.
- Student/Parent dashboards and dedicated academic pages use `getStudentPortalInsights(studentId)` for deterministic assessment, attendance, weekly-summary, feedback, deadline, and course-progress values. Do not reintroduce portal-local KPI data.

## Current Interactive Features

- Role-specific dashboards and route structures for all supported portal roles.
- Shared local LMS store with relational seed data and local persistence under `skill-toss-lms-demo-v4`.
- Teacher class scheduling, Student/Teacher live-classroom views, Jitsi joining, attendance join/leave tracking, and class-session status synchronization.
- Assignment creation and notifications; student draft/submit flow; teacher grading and feedback; parent read-only assignment view.
- Assignment and resource material attachments with validation, IndexedDB storage, metadata, and same-browser download flows.
- Attendance marking and summaries, online attendance intervals, exam scheduling/results, invoices, demo payments, receipts, and fee history.
- Notifications, global search, goals CRUD, editable student profile fields, local profile avatar changes, and student notification settings.
- Dedicated shared Student/Parent Academic Progress, Attendance, Notifications, Timetable, Calendar, Goals, Certificate Wallet, and Digital Locker routes; Parent remains read-only through centralized portal permissions.
- Per-student resource bookmarks persisted in the shared local LMS state, with Saved Resources available to Student viewers.
- Parent linked-student switching and viewer permissions.
- Personal My Notes UI/CRUD remains present, but its former permissive backend table is intentionally absent from the clean Phase 1 database; notes do not currently support attachment upload.
- Teacher resources, community/forum interactions, course-builder flows, and Product Admin/Super Admin addon areas.

## Jitsi Architecture

`JITSI_DOMAIN` comes from `VITE_JITSI_DOMAIN`, defaulting to `meet.jit.si`. Room names are deterministic: `skilltoss-{institutionId}-{sessionId}`. `JitsiMeeting` wraps the Jitsi External API and reports join/leave/readiness/participant events. `LiveClassroomPage` is shared by Teacher and Student; the teacher can transition a scheduled session to live and request end-of-class handling, while the student receives completed state and attendance details.

The app retains class-session synchronization code as the intended authoritative cross-browser status path, but the clean Phase 1 database does not create `class_sessions`. Realtime and writes are disabled unless real Supabase configuration and `VITE_SUPABASE_CLASS_SESSIONS_ENABLED=true` are both present; do not enable that flag before the later tenant-safe migration. The public `meet.jit.si` domain may not support moderator privileges or `endConference` reliably. Production enforcement also requires verified JaaS/JWT or self-hosted Jitsi configuration. A separate-browser end-to-end test has not been completed.

## Attachments Architecture

Accepted attachments are centralized in `attachmentConfig.ts`, with a 10 MB per-file limit, up to five files, and the configured document/archive/image extensions. Metadata is stored in LMS state; blobs are stored in the `skill-toss-local-files` IndexedDB database under `submission-attachments`. This supports student submissions plus teacher assignment/resource materials and same-browser download flows.

IndexedDB blobs are local to a browser profile. Metadata can appear in another browser or device while the actual file is unavailable. Real cross-device teacher/student sharing requires Supabase Storage or another server-backed file service. Legacy `attachmentName` fields remain for seed/backward compatibility.

Resource bookmarks are LMS-state metadata persisted in localStorage. They are per-student but remain browser-local and are not synchronized to Supabase.

## UI and Design Direction

Use the existing restrained white/blue institutional SaaS visual language: Tailwind layouts, cards, tables, lists, Lucide icons, Recharts, and shared dashboard navigation. Reuse `DashboardLayout` and the UI primitives before adding new patterns. Preserve responsive behavior, semantic HTML, keyboard interaction, visible focus, dialog Escape handling, skip navigation, and reduced-motion behavior from the existing motion helpers.

## Coding Rules

- Inspect nearby code and existing domain types before introducing a new abstraction.
- Keep shared state and cross-portal mutations in `src/lib/lmsData.tsx` and its context rather than duplicating state in portal pages.
- Keep role and permission checks explicit and preserve the Student/Parent read-only boundary.
- Keep async persistence/error states visible to users and avoid silent fake success.
- Do not add a provider or backend claim unless it is wired and verified.
- Keep demo/local, Supabase-backed, and browser-local behavior clearly distinguishable.
- Run `npm run typecheck`, `npm run lint`, and `npm run build` when changes could affect them.

## Demo vs Production Boundaries

Most LMS seed data and many interactions still use local context state. Demo payments, community/forum interactions, and some AI-oriented areas are not full production integrations. Real email/WhatsApp delivery is not implemented. Profile image persistence currently uses a local browser-backed object URL rather than shared server storage.

Teacher assignment/resource creation currently creates open/shared local records immediately; a complete server-backed draft/publish/edit lifecycle is not implemented. Notes retain their Supabase client code but their database table is intentionally deferred beyond Phase 1, and they have no attachment upload. These boundaries must be stated accurately in future work and documentation.

## Known Limitations

- Local LMS persistence is not a substitute for full backend synchronization.
- Local IndexedDB attachment and avatar blobs are not cross-device.
- Jitsi conference-wide termination and moderator authority are not guaranteed on public `meet.jit.si`.
- Class-session Realtime, notes, leave, and Course Builder persistence are intentionally not present in the Phase 1 database. Those UI areas remain demo/local where supported or report backend errors until their secure domain migrations are implemented.
- There is no proper automated test command; `test-page.js` is a Puppeteer smoke helper.
- Supabase course lesson completion remains component-session state; no durable enrollment/activity model or recording playback URL/progress model exists yet.
- Certificate issuance, downloadable certificate files, and QR verification are not implemented. The Certificate Wallet reports this honestly rather than generating demo certificates.

## Current Priorities

- Keep cross-portal data synchronization consistent and honest.
- Finish production-grade Supabase persistence and server-backed attachments where required.
- Harden Jitsi authority/session completion with verified deployment configuration.
- Preserve accessibility, responsive behavior, and focused incremental changes.

## Recently Completed

- Verified the target Supabase project contains no CLARA tables, Auth users, or Storage buckets; confirmed the Phase 1 migration, UUID relationships, private helpers, triggers, RLS, and anonymous-access denial remotely; created only the `STDC` development institution.
- Added shared Jitsi live classroom/session completion and Supabase class-session Realtime plumbing.
- Added reusable validated attachments for student submissions and teacher assignment/resource materials with local IndexedDB persistence.
- Added profile avatar persistence/removal, profile/settings navigation behavior, and teacher/admin/product-admin addon areas.
- Reworked the shared Student/Parent portal with record-derived academic progress, attendance recovery math, weekly summaries, feedback, deadlines, course progress, categorized notifications, resource bookmarks, document locker presentation, leave categories, and global linked-child switching.

## Update Rules and Source of Truth

Update this file after meaningful feature, architecture, workflow, decision, or limitation changes. Keep it concise and factual. Use the application code, migrations, package manifest, and actual runtime behavior as the source of truth; this memory file is shared context, not a replacement for inspection.
