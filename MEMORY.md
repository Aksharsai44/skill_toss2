# Skill Toss LMS Project Memory

## Project Overview

Skill Toss is an AI-powered, multi-tenant SaaS learning-management platform for schools, colleges, coaching institutes, and training organizations. The product has Product Admin, Super Admin, Admin, Teacher, Student, and Parent experiences. The current repository combines a polished demo/local LMS experience with selected Supabase-backed features.

## Technology Stack

- React 18, TypeScript, Vite, React Router 6
- Tailwind CSS, Lucide React, Recharts, Anime.js
- Django REST/JWT authentication and account management; Supabase data/Realtime remains in deferred domains
- npm with the committed `package-lock.json`
- ESLint and TypeScript checks; no dedicated automated test script is currently defined

## Repository Architecture

- `src/App.tsx` - application shell and role-protected route map.
- `src/main.tsx` - React entry point and providers.
- `src/components/` - shared layout, auth, classroom, assignment, attachment, and UI components.
- `src/components/ui/` - reusable buttons, modals, tabs, tables, charts, layout primitives, badges, and stat cards.
- `src/portals/{product-admin,super-admin,admin,teacher,student}/` - portal-specific pages and route components.
- `src/lib/djangoApi.ts`, `auth.tsx`, `authContext.ts` - centralized Django API/JWT handling, `/me/` authority, session restore, refresh, logout, and account operations.
- `src/lib/supabase.ts` - data/Realtime client only; Supabase Auth persistence, refresh, and callback detection are disabled.
- `src/lib/lmsData.tsx`, `lmsDataContext.ts` - shared relational LMS state, selectors, actions, local persistence, and Supabase class-session synchronization.
- `src/lib/studentPortal.tsx`, `studentPortalContext.ts` - linked-student selection and Student/Parent viewer permissions.
- `src/lib/types.ts`, `mockData.ts` - domain types and demo seed data.
- `src/lib/attachmentConfig.ts`, `attachmentStorage.ts` - attachment validation and IndexedDB blob storage.
- `src/components/FileAttachmentPicker.tsx` - reusable drag/drop and file-input attachment picker.
- `src/lib/jitsiConfig.ts`, `src/components/JitsiMeeting.tsx`, `LiveClassroomPage.tsx` - shared live-classroom integration.
- `supabase/migrations/` - ordered tenant/identity, auth hardening, academic core, batch, attendance, assignment, daily tracker, private storage, and communication migrations.
- `supabase/README.md`, `PERMISSION_MATRIX.md`, `SCHEMA.md`, and `supabase/tests/` - deployment guidance, authorization/schema maps, and non-mutating structural checks.
- `src/lib/{batch,attendance,assignment,dailyTracker,file,community}Api.ts` - typed Supabase contracts. Configured builds hydrate shared portal state from the backend; assignment, submission/grading, attendance, goals, notes, and learning-resource mutations use these contracts.
- `src/lib/backendState.ts` - JWT-scoped backend-to-portal mapper. Configured builds start with empty state and never load the local demo seed.
- `supabase/config.toml` - local Supabase CLI configuration for PostgreSQL 17; the link cache currently targets staging project `cbtqosdhbsvoqeaswicb` (`skilltoss-staging`).

## Core Decisions

- Frontend authentication uses Django REST and SimpleJWT exclusively. Tokens are stored per-tab in `sessionStorage`; the centralized client performs a single shared refresh and one request retry, then clears auth on failure. `/api/auth/me/` is the only frontend source of role, institution, and active status. Development quick-select fills only an email and cannot fabricate identity or authority.
- The complete chain through `20261001001000` is deployed and remotely verified on staging project `cbtqosdhbsvoqeaswicb`; production has not been deployed.
- Admin and tenant-bound Super Admin account screens call Django `/api/users/` endpoints for list, create, edit, disable, and reactivate. Relationship selectors use Django batch/subject/user IDs. Supabase provisioning is retained only as reference code and has no frontend runtime path.
- Invite setup and password reset use `/set-password` and `/reset-password` with Django UID/token parameters. Forgot/change password use Django endpoints, and password changes clear the local JWT session for mandatory fresh login.
- `academic_courses` is the normalized academic catalog. It remains intentionally separate from the undeployed Course Builder `courses` contract so incompatible domains do not share records.
- Protected routes derive access from the authenticated profile role; users do not manually choose a role at login.
- Student and Parent share one portal architecture. A parent views linked students through `activeStudentId` and remains read-only for student data.
- LMS data is modeled relationally around institutions, departments, batches, courses, users, assignments, submissions, attendance, exams, fees, resources, notifications, and class sessions.
- Cross-portal behavior should use the shared LMS context and domain actions so teacher changes flow to student and parent views.
- Student/Parent dashboards and dedicated academic pages use `getStudentPortalInsights(studentId)` for deterministic assessment, attendance, weekly-summary, feedback, deadline, and course-progress values. Do not reintroduce portal-local KPI data.

## Current Interactive Features

- Role-specific dashboards and route structures for all supported portal roles.
- Local development without Supabase configuration retains the relational demo store under `skill-toss-lms-demo-v4`; configured staging builds do not load or reset to demo data.
- Teacher class scheduling, Student/Teacher live-classroom views, Jitsi joining, attendance join/leave tracking, and class-session status synchronization.
- Assignment creation and notifications; student draft/submit flow; teacher grading and feedback; parent read-only assignment view.
- Assignment and resource material attachments with validation, IndexedDB storage, metadata, and same-browser download flows.
- Attendance marking and summaries, online attendance intervals, exam scheduling/results, invoices, demo payments, receipts, and fee history.
- Notifications, global search, goals CRUD, editable student profile fields, local profile avatar changes, and student notification settings.
- Dedicated shared Student/Parent Academic Progress, Attendance, Notifications, Timetable, Calendar, Goals, Certificate Wallet, and Digital Locker routes; Parent remains read-only through centralized portal permissions.
- Per-student resource bookmarks persisted in the shared local LMS state, with Saved Resources available to Student viewers.
- Parent linked-student switching and viewer permissions.
- Private note and learning-resource UI paths now use hosted tables/Storage in configured builds. Submission metadata is hosted, while assignment attachment UI still needs a complete server-backed handoff.
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

- Backend hydration and core academic mutations are integrated, but deferred domains (fees, exams, class sessions, product/super-admin operational data, and complete community UI mutation wiring) block production readiness.
- Local IndexedDB attachment and avatar blobs are not cross-device.
- Jitsi conference-wide termination and moderator authority are not guaranteed on public `meet.jit.si`.
- Class-session Realtime, leave, and Course Builder persistence remain deferred. Notes now have a private backend migration/API, but the current portal stays on the demo/local path until deployment and integration verification.
- There is no proper automated test command; `test-page.js` is a Puppeteer smoke helper.
- `npm run verify:auth:local` is a localhost-only exception: it creates temporary six-role Auth users with a random password, verifies Auth/session/browser routing, and deletes the fixtures. `supabase/tests/authorization_behavior_checks.sql` verifies role and tenant RLS with rollback-only fixtures.
- `npm run seed:staging` is the idempotent local/staging fixture mechanism. It requires runtime-only Supabase server credentials and `SKILLTOSS_SEED_PASSWORD`, refuses non-local targets unless the exact staging project is explicitly confirmed, creates the six `@skilltoss.test` Auth users, and seeds one minimal relationship-complete academic dataset. `npm run verify:seed:auth` validates those persistent fixtures through real Auth, browser routing, and RLS.
- `npm run verify:staging:security` is staging-only and exact-ref gated. It verifies hosted signup/profile authority, forged metadata, direct REST/anonymous denial, role/delete denial, inactive users, generated recovery callbacks/password updates, private Storage access, signed URLs, MIME and 10 MB limits, and cleanup. Hosted email throttling prevented delivery verification on 2026-10-01.
- `npm run verify:staging:provisioning` verifies the deployed role/elevation/cross-tenant/browser-tampering denial matrix and is designed to exercise real Admin UI invites, Auth/profile UUIDs, relationship rows, setup-password callbacks, role routing, duplicates, and cleanup. On 2026-10-01 the denial matrix passed, but the successful hosted invite journey was blocked by Supabase's built-in SMTP two-email/hour quota; configure custom SMTP or a Send Email hook before rerunning the full three-role journey.
- Migration `20261001000000_fix_daily_tracker_activity_trigger.sql` fixes invalid shared-trigger field access between `daily_goals` and `daily_tasks`; it does not change tracker ownership or RLS semantics.
- Supabase course lesson completion remains component-session state; no durable enrollment/activity model or recording playback URL/progress model exists yet.
- Certificate issuance, downloadable certificate files, and QR verification are not implemented. The Certificate Wallet reports this honestly rather than generating demo certificates.

## Current Priorities

- Keep cross-portal data synchronization consistent and honest.
- Finish production-grade Supabase persistence and server-backed attachments where required.
- Harden Jitsi authority/session completion with verified deployment configuration.
- Preserve accessibility, responsive behavior, and focused incremental changes.

## Django Migration Foundation

- `backend/` is the incremental Django REST Framework replacement foundation. It uses PostgreSQL
  only, a UUID/email custom user, the existing six lowercase role values, SimpleJWT with rotating
  blacklisted refresh tokens, and reusable role/tenant/object policy helpers.
- Local PostgreSQL 17 runs directly on `localhost:5432`; Django migrations now cover identity/auth,
  the core academic graph, attendance, assignments, submissions, and grading.
- React authentication and account management now use Django. Existing Supabase migrations, typed
  data APIs, and staging scripts remain as reference/runtime data integrations until each academic
  domain migration is independently completed; they no longer provide frontend authentication.
- Phase 2 adds `apps.academics` with Department, Course, Subject, Batch, TeacherAssignment,
  StudentEnrollment, and ParentStudentLink. Teacher/Student/Parent identities remain the custom
  `User`; no duplicate profile or role-specific account model exists.
- Core academic DRF querysets reproduce the Supabase visibility contract: tenant managers see their
  institution, teachers assigned batches, students active enrollments, parents linked children,
  and Product Admin no educational records. React remains on Supabase until frontend migration.
- Phase 3 adds `apps.learning` with AttendanceSession, AttendanceRecord, Assignment, and Submission.
  Learning APIs use queryset-scoped IDOR protection, server-controlled ownership/audit fields, exact
  submission state transitions, deadline enforcement, staff grading, and linked-parent read access.
- Cross-table rules that cannot be expressed as Django checks are duplicated in PostgreSQL triggers:
  tenant consistency, active batch/enrollment/teacher assignment, immutable ownership, attendance
  session openness, assignment deadlines, and grade ranges. The React client is intentionally not
  integrated in Phase 3.
- Phase 4 adds `apps.tracker` for Student-owned goals/tasks and immutable, trigger-generated activity
  history. Assigned teachers, linked parents, and tenant managers receive scoped read-only views;
  Product Admin receives no tracker records.
- Phase 4 adds `apps.resources` for private Student notes, note files, general learning resources,
  assignment resources, and submission attachments. Files use Django storage under configurable
  `DJANGO_MEDIA_ROOT`; no public media route exists, raw paths are not serialized, and downloads are
  authorization-gated. The default filesystem backend can later be replaced by S3/R2 through Django
  storage configuration without changing business logic.
- Private uploads retain the 10 MB and five-file product limits and validate sanitized names,
  extension, declared MIME type, and practical content signatures. PostgreSQL triggers independently
  protect tenant/owner/uploader relationships and immutable file identity. React remains unchanged.
- Phase 4.5 adds tenant-scoped Django user management, inactive/unusable-password invitations,
  Django-native one-time setup and reset tokens, generic forgot-password responses, authenticated
  password changes, disable/reactivate actions, and immutable security audit events. Admin can
  create Teacher/Student/Parent; tenant-bound Super Admin can additionally create Admin; Product
  Admin remains excluded. Optional academic relationships are validated at invite time and created
  atomically on activation. Password changes, resets, and disable operations version JWT sessions
  and blacklist outstanding refresh tokens so all previous tokens are rejected.
- Django email defaults to the console backend for development and is SMTP-configurable entirely
  through environment variables. Real SMTP delivery remains unverified.
- The frontend auth/account cutover adds `VITE_API_BASE_URL`, dedicated setup/reset routes,
  Django-backed Admin/Super Admin management, per-tab JWT restore/rotation, immediate disabled-user
  eviction, and a repeatable six-role Puppeteer smoke. No `supabase.auth` runtime call remains.

## Recently Completed

- Verified the target Supabase project contains no CLARA tables, Auth users, or Storage buckets; confirmed the Phase 1 migration, UUID relationships, private helpers, triggers, RLS, and anonymous-access denial remotely; created only the `STDC` development institution.
- Added shared Jitsi live classroom/session completion and Supabase class-session Realtime plumbing.
- Added reusable validated attachments for student submissions and teacher assignment/resource materials with local IndexedDB persistence.
- Added profile avatar persistence/removal, profile/settings navigation behavior, and teacher/admin/product-admin addon areas.
- Reworked the shared Student/Parent portal with record-derived academic progress, attendance recovery math, weekly summaries, feedback, deadlines, course progress, categorized notifications, resource bookmarks, document locker presentation, leave categories, and global linked-child switching.
- Finished Product Admin and Super Admin frontend dashboards by replacing placeholder text/charts with functional `Recharts` and adding `Modal` forms for all creation actions (Branches, Campaigns, Roadmaps, AI Betas).
- Completed global institutional LMS redesign across all 6 portals, public landing, login/auth, shared shell navigation, search scoping, and UI primitives (tabular-nums, accessible modals, tabs, status badges, page headers) to deliver a unified institutional application experience.

## Update Rules and Source of Truth

Update this file after meaningful feature, architecture, workflow, decision, or limitation changes. Keep it concise and factual. Use the application code, migrations, package manifest, and actual runtime behavior as the source of truth; this memory file is shared context, not a replacement for inspection.
