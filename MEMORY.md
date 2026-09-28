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
- `src/lib/auth.tsx`, `authContext.ts`, `supabase.ts` - authentication, profiles, session state, and Supabase client.
- `src/lib/lmsData.tsx`, `lmsDataContext.ts` - shared relational LMS state, selectors, actions, local persistence, and Supabase class-session synchronization.
- `src/lib/studentPortal.tsx`, `studentPortalContext.ts` - linked-student selection and Student/Parent viewer permissions.
- `src/lib/types.ts`, `mockData.ts` - domain types and demo seed data.
- `src/lib/attachmentConfig.ts`, `attachmentStorage.ts` - attachment validation and IndexedDB blob storage.
- `src/components/FileAttachmentPicker.tsx` - reusable drag/drop and file-input attachment picker.
- `src/lib/jitsiConfig.ts`, `src/components/JitsiMeeting.tsx`, `LiveClassroomPage.tsx` - shared live-classroom integration.
- `supabase/migrations/20260818090000_create_class_sessions.sql` - class-session table, RLS, and Realtime publication.

## Core Decisions

- Authentication uses Supabase Auth plus a `profiles` record for the user role, institution, name, and avatar. Demo fallback profiles remain available when configured sign-in is unavailable.
- Protected routes derive access from the authenticated profile role; users do not manually choose a role at login.
- Student and Parent share one portal architecture. A parent views linked students through `activeStudentId` and remains read-only for student data.
- LMS data is modeled relationally around institutions, departments, batches, courses, users, assignments, submissions, attendance, exams, fees, resources, notifications, and class sessions.
- Cross-portal behavior should use the shared LMS context and domain actions so teacher changes flow to student and parent views.

## Current Interactive Features

- Role-specific dashboards and route structures for all supported portal roles.
- Shared local LMS store with relational seed data and local persistence under `skill-toss-lms-demo-v4`.
- Teacher class scheduling, Student/Teacher live-classroom views, Jitsi joining, attendance join/leave tracking, and class-session status synchronization.
- Assignment creation and notifications; student draft/submit flow; teacher grading and feedback; parent read-only assignment view.
- Assignment and resource material attachments with validation, IndexedDB storage, metadata, and same-browser download flows.
- Attendance marking and summaries, online attendance intervals, exam scheduling/results, invoices, demo payments, receipts, and fee history.
- Notifications, global search, goals CRUD, editable student profile fields, local profile avatar changes, and student notification settings.
- Parent linked-student switching and viewer permissions.
- Supabase-backed personal My Notes CRUD/search/download; notes do not currently support attachment upload.
- Teacher resources, community/forum interactions, course-builder flows, and Product Admin/Super Admin addon areas.

## Jitsi Architecture

`JITSI_DOMAIN` comes from `VITE_JITSI_DOMAIN`, defaulting to `meet.jit.si`. Room names are deterministic: `skilltoss-{institutionId}-{sessionId}`. `JitsiMeeting` wraps the Jitsi External API and reports join/leave/readiness/participant events. `LiveClassroomPage` is shared by Teacher and Student; the teacher can transition a scheduled session to live and request end-of-class handling, while the student receives completed state and attendance details.

The `class_sessions` Supabase migration and Realtime subscription provide the intended authoritative cross-browser status path. The public `meet.jit.si` domain may not support moderator privileges or `endConference` reliably; the app must not claim that a teacher can forcibly terminate every public conference. Production enforcement requires verified JaaS/JWT or self-hosted Jitsi configuration, deployed Supabase migration, and authenticated RLS access. A separate-browser end-to-end test has not been completed.

## Attachments Architecture

Accepted attachments are centralized in `attachmentConfig.ts`, with a 10 MB per-file limit, up to five files, and the configured document/archive/image extensions. Metadata is stored in LMS state; blobs are stored in the `skill-toss-local-files` IndexedDB database under `submission-attachments`. This supports student submissions plus teacher assignment/resource materials and same-browser download flows.

IndexedDB blobs are local to a browser profile. Metadata can appear in another browser or device while the actual file is unavailable. Real cross-device teacher/student sharing requires Supabase Storage or another server-backed file service. Legacy `attachmentName` fields remain for seed/backward compatibility.

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

Teacher assignment/resource creation currently creates open/shared records immediately; a complete server-backed draft/publish/edit lifecycle is not implemented. Notes are Supabase-backed but have no attachment upload. These boundaries must be stated accurately in future work and documentation.

## Known Limitations

- Local LMS persistence is not a substitute for full backend synchronization.
- Local IndexedDB attachment and avatar blobs are not cross-device.
- Jitsi conference-wide termination and moderator authority are not guaranteed on public `meet.jit.si`.
- Class-session Realtime behavior depends on the migration, Supabase configuration, authentication, and RLS being deployed correctly.
- There is no proper automated test command; `test-page.js` is a Puppeteer smoke helper.

## Current Priorities

- Keep cross-portal data synchronization consistent and honest.
- Finish production-grade Supabase persistence and server-backed attachments where required.
- Harden Jitsi authority/session completion with verified deployment configuration.
- Preserve accessibility, responsive behavior, and focused incremental changes.

## Recently Completed

- Pulled remote repository `https://github.com/Aksharsai44/skill_toss2.git` (`origin/main` commit `60db53f`) and resolved all merge conflicts cleanly. Merged Super Admin RBAC Role Builder (`RoleBuilder.tsx`), Product Admin Enterprise Management Suite (`ProductAdminAddons.tsx`), Super Admin Addons (`SuperAdminAddons.tsx`), and synchronized domain types & router paths in `App.tsx`.
- Completely decoupled Community Chat (`/teacher/community`, `CommunityChatWorkspace.tsx`) and Discussion Forum (`/teacher/forum`, `DiscussionForumHub.tsx`) into separate top-level components and routes across Teacher, Student, and Admin portals.
- Fixed Notes & Resources PDF downloads by generating standard `%PDF-1.4` binary stream structures for fallback/seed files, and fixed LINK resource URL opening with automatic protocol resolution.
- Redesigned and fully implemented Notes & Resources module with real-time Supabase PostgreSQL persistence, atomic stored procedure `increment_resource_download`, working native browser file downloads, LINK URL opening, real-time search/filter, delete confirmation modal, and multi-tab BroadcastChannel sync across Teacher and Student portals.
- Redesigned and fully implemented Community platform (`CommunityChatWorkspace.tsx`, `lmsData.tsx`, `types.ts`) into a full-width (~95% viewport width) Team Community / Academic Community collaboration space (Microsoft Teams & LinkedIn feed style) across Teacher, Student, and Admin portals. Features: 1) Page Header with live online presence badge (`🟢 Members Online`), 2) Horizontal filter bar (`All`, `My Batches`, `Announcements`, `Faculty`) and dynamic database Batch Selector dropdown reading all batches from database without hardcoding (`CS-2024-A`, `CS-2024-B`, `EE-2024-A`, `ECE-2024-A`, `DS-2024-A`, `AI-2025-A`, etc.), 3) Full-width Large Share/Announcement Composer Card with attachment picker, post type selector (`Update`, `Announcement`, `Assignment`, `Class Reminder`, `Important Notice`, `Discussion`), and target batch picker (`All Students` or specific batch), 4) Clean single full-width search bar (`Search updates, announcements, messages...`), 5) Wide Activity Feed with role badges (`✓ TEACHER`, `Student`, `ADMIN`), announcement banner highlights, attachment download cards, upvoting, saving, pinning, three-dot action menus, inline reply composer, nested reply streams (`└── [User Name]`), real-time Supabase PostgreSQL & BroadcastChannel sync, and strict batch-based visibility rules. Removed all dashboard statistics cards and heavy channel sidebars.
- Redesigned Teacher Dashboard Batch Management section into a clean, professional 5-part architecture (Header with batch dropdown selector, 3 summary stats, main Student Roster table with presence/attendance, Student Details panel, Quick Actions bar, Recent Activity log, and Batch Analytics with AI Insights) connected to real-time Supabase PostgreSQL data.
- Redesigned and fully implemented Course Management System with multi-step Course Builder, Curriculum Builder (Modules & Lessons), 9 Lesson Types (Video, PDF, Doc, PPT, Text, External Link, Coding Exercise, Quiz, Assignment), AI Course Assistant ("✨ Generate with AI"), Admin Review Workflow (Approve, Request Changes with feedback, Reject, Publish), Course Versioning, Real-Time Supabase & BroadcastChannel sync, Student Course Learning Player, Course Analytics, and AI Learning Insights.
- Redesigned Discussion Forum (`DiscussionForumHub.tsx`, `DiscussionCard.tsx`, `AskQuestionModal.tsx`, `20260828190000_realtime_discussion_forum.sql`) into a full-width 1-column Quora-inspired academic hub across Teacher, Student, and Admin portals. Enforced exact page layout order: 1) Page Header, 2) Large prominent Quora-inspired Ask/Share composer card, 3) Single Search Bar (`Search questions, topics, code snippets, or tags...`), 4) Horizontal `ACADEMIC FILTERS` bar (`COURSE`, `BATCH`, `SUBJECT`, `STATUS`, `SORT BY`), and 5) Large full-width discussion feed. Completely removed duplicate search bars and all sidebars (Left Categories, Trending Topics, Top Contributors). Main feed features inline answers stream & answer composer, inline threaded replies (`└── [User Name]`), persistent upvoting, bookmarks, Best Answer toggling (`🟢 SOLVED`), real-time Supabase PostgreSQL & BroadcastChannel sync, and Admin Moderation panel.
- Added shared Jitsi live classroom/session completion and Supabase class-session Realtime plumbing.
- Added reusable validated attachments for student submissions and teacher assignment/resource materials with local IndexedDB persistence.
- Redesigned and fully implemented Class Recordings workflow (`20260903180000_create_class_recordings.sql`, `VideoPlayerModal.tsx`, `AttendeesModal.tsx`, `CreateRecordingModal.tsx`, `lmsData.tsx`, `lmsDataContext.ts`, `types.ts`) across Teacher, Student, and Admin portals. Key capabilities: 1) Professional HTML5 Video Player modal with play/pause, timeline scrubber seek bar, time duration display, volume slider, playback speed control (0.5x-2.0x), fullscreen mode, processing state handling, and missing/failed URL error handling with retry, 2) Supabase PostgreSQL persistence + Realtime channel (`skill-toss-class-recordings`) and multi-tab `BroadcastChannel('skilltoss_recordings_channel')` sync, 3) Real student attendees roster modal (`AttendeesModal.tsx`) showing present/absent/online student list from database attendance records, 4) Session-based de-duplicated view count tracking in backend (`recording_views`), 5) Working file download handler with loading state and error fallback, 6) Publish/Upload recording modal (`CreateRecordingModal.tsx`) for teachers and admins, 7) Role-based access control (teachers see assigned batches/courses, students see enrolled courses/batches, admin sees global recordings), and 8) Functional multi-field search (title, course, subject, batch, teacher).
- Redesigned and fully implemented the Real-Time Academic Calendar System (`20260903190000_create_academic_calendar_events.sql`, `AcademicCalendarView.tsx`, `CreateEventModal.tsx`, `EventDetailsModal.tsx`, `lmsData.tsx`, `lmsDataContext.ts`, `types.ts`) across Teacher, Student, and Admin portals. Features: 1) Automatic aggregation of events from Live Classes (`state.classSessions`), Exams (`state.exams`), Assignments (`state.assignments`), and custom events (`academic_events` DB table) without duplicate data, 2) Supabase PostgreSQL Realtime channel (`skill-toss-academic-events`) + multi-tab `BroadcastChannel('skilltoss_calendar_channel')` sync, 3) Today, Week, and Month views with date navigation, 4) Event creation modal with real-time **Schedule Conflict Detection** (`⚠️ Schedule Conflict Warning`) checking batch & teacher time overlaps, 5) Event details modal with deep route action buttons (`Join Live Class`, `View Recording`, `View Exam`, `View Assignment`), 6) Role-based visibility (teachers see assigned batches/courses, students see enrolled batch/courses, admin sees global events), 7) Dynamic upcoming schedule sidebar sorted chronologically, and 8) Dynamic smart academic reminders (`Class starting soon`, `Assignment deadline near`, `Upcoming Assessment`).
- Redesigned and fully implemented Teacher Dashboard → Exams & Assessments & complete Real-Time Exam Management Lifecycle (`20260903200000_create_exams_and_submissions.sql`, `CreateExamModal.tsx`, `TeacherExamDetailsModal.tsx`, `StudentExamPlayerModal.tsx`, `lmsData.tsx`, `lmsDataContext.ts`, `types.ts`) across Teacher, Student, and Admin portals. Key features: 1) Removed the static 3-step Assessment Workflow section, 2) Added 5 compact real-time stat cards (`TOTAL EXAMS`, `UPCOMING`, `PENDING EVALUATION`, `EVALUATED`, `AVERAGE SCORE`) dynamically computed from DB/state, 3) Filter bar (`All Batches`, `All Courses`, `All Subjects`, `Exam Status`, `Date`, `Search`), 4) Schedule Exam Modal (`CreateExamModal.tsx`) with interactive Question Paper builder & document upload, schedule conflict checks, and Save as Draft / Schedule actions, 5) Exam Details & Real-Time Analytics Modal (`TeacherExamDetailsModal.tsx`) with student submission roster, inline paper grading, and Publish Results action, 6) Student Portal Live Exam Banner & Interactive Player (`StudentExamPlayerModal.tsx`) with countdown timer and instant objective score auto-calculation, 7) Automatic Academic Calendar event creation/sync and batch student notifications, 8) Admin Exam Monitor (`AdminExams` in `src/portals/admin/index.tsx`), and 9) Dual real-time sync via Supabase PostgreSQL channel (`skill-toss-exams`) + multi-tab `BroadcastChannel('skilltoss_exams_channel')`.
- Redesigned and fully implemented Teacher Dashboard → My Profile into a Google-Style Real-Time Account Management System (`20260903210000_enhance_teacher_profiles.sql`, `TeacherProfileManager.tsx`, `lmsData.tsx`, `lmsDataContext.ts`, `types.ts`). Features: 1) Google Account-inspired hero header card with avatar uploader (supports file upload, image URL, remove photo with persistent Supabase DB & local storage), 2) Dynamic Profile Completion Score (0-100% meter with missing fields breakdown), 3) 5 Google-style section tabs (`Personal Information`, `Professional Information`, `Education & Experience`, `Contact & Availability`, `Profile Visibility & Privacy`), 4) Section-specific editing modals with validation (read-only auth email, phone, DOB, address, designation, department, employee ID, subjects taught tags, expertise tags, education CRUD, work experience CRUD, consultation office hours & available days), 5) Profile visibility controls (`Students & Admin`, `Students in my batches + Admin`, `Admin only`), 6) Supabase PostgreSQL `teachers` table persistence + Realtime channel (`skill-toss-teachers`) and `BroadcastChannel('skilltoss_teacher_profile_channel')` sync, and 7) Automatic real-time profile propagation across Top Navigation, Community Posts, Discussion Forum, Student portal, and Admin portal.
- Added profile avatar persistence/removal, profile/settings navigation behavior, and teacher/admin/product-admin addon areas.
- Redesigned and fully implemented the unified Teacher Dashboard UI/UX and API-Ready Frontend Architecture across `src/components/teacher/` (`TeacherOverview.tsx`, `TeacherBatchesView.tsx`, `StudentRosterTable.tsx`, `StudentDetailModal.tsx`, `TeacherAttendanceView.tsx`, `TeacherAssignmentsView.tsx`, `TeacherAnnouncementsView.tsx`, `TeacherNotificationsView.tsx`, `TeacherAnalyticsView.tsx`) and `src/services/teacherService.ts`. Enforced core workflow **Batches → Students → Attendance → Pending Work → Student Status → Teacher Actions**, removed duplicate inline components in `src/portals/teacher/index.tsx`, preserved shared LMS relational data models across Admin, Student, and Parent portals, and decoupled UI from hardcoded mock data for real-time backend readiness.
- Finished Product Admin and Super Admin frontend dashboards by replacing placeholder text/charts with functional `Recharts` and adding `Modal` forms for all creation actions (Branches, Campaigns, Roadmaps, AI Betas).
- Redesigned and simplified the Teacher Dashboard Batch Management section (`TeacherBatches` in `src/portals/teacher/index.tsx`) into a clean, modern, data-driven "Teacher Batch Control Center". Removed the separate Live Activity card completely to keep the page focused. Features: 1) Page Header with dynamic assigned batch selector, real-time student search, live status badge (`● Live`), and `+ Announcement` trigger, 2) Compact Batch Summary Overview bar with 4 live metric pills (Total Students, Avg Attendance %, Pending Tasks, Currently Online count), 3) Student Roster (Main Visual Focal Point) with desktop/tablet table view (`STUDENT`, `STUDENT ID`, `ATTENDANCE`, `PENDING WORK`, `STATUS`, `ACTION`) and mobile stacked card view, real-time presence indicators (`● Online` / `○ Offline`), attendance % badges, unsubmitted task counts, and Student View drawer/modal, 4) Streamlined `[ Actions ▼ ]` dropdown menu connecting directly to attendance, assignment creation, announcement composer, batch community messaging, and AI diagnostic performance analytics, 5) Post Announcement modal with target batch selection and `FileAttachmentPicker` integration, and 6) Complete real-time integration with `useLmsData` state without fake static data or separate demo pages.
- Completed Phase 2: Teacher Dashboard Backend Core & Data Integration (`20260923220000_teacher_dashboard_backend_api.sql`, `src/services/teacherBackendApi.ts`, `src/services/teacherService.ts`, `src/services/__tests__/teacherBackendApi.test.ts`, and `src/components/teacher/`). Key achievements: 1) Connected Teacher Dashboard views (`TeacherOverview`, `TeacherBatchesView`, `TeacherAttendanceView`, `TeacherAssignmentsView`, `TeacherAnnouncementsView`, `StudentDetailModal`) to direct asynchronous backend API service layer, 2) Extended SQL RLS policies and RPC stored procedures (`mark_batch_attendance`, `grade_student_submission`, `verify_teacher_batch_access`, `create_teacher_announcement`) to enforce multi-tenant isolation (`institution_id`) and server-side RBAC, 3) Integrated teacher batch scoping, student roster querying, atomic bulk attendance marking, assignment creation, submission grading, class sessions, resources, and community announcement creation, 4) Established a clean single source of truth across Admin, Teacher, Student, and Parent experiences without duplicate models or APIs, and 5) Verified clean TypeScript checks (`npm run typecheck`), ESLint (`npm run lint`), and production build (`npm run build`).
- Redesigned Teacher Dashboard → Batch Management into a minimal, clean, professional Enterprise LMS workspace (`TeacherBatchesView.tsx`, `StudentRosterTable.tsx`). Key achievements: 1) Compact header with integrated breadcrumb batch selector (`My Batches / CS-2024-A ▼`), clear batch title & course info, inline text metric summary (`32 students · 91% attendance · 8 pending`), and working `+ Announcement` button, 2) Clean Student Roster area dominating the page with search input and a single compact Filter popover button, 3) Minimal table structure (`Student`, `Attendance`, `Pending Work`, `Status`, `Action`) with Name + STU ID stacked layout, subtle visual attendance bar, simple pending text, online status, and single text `View` action opening `StudentDetailModal`, 4) Removed all card-in-card outer containers, decorative stat icons, pulse badges, non-essential tabs, and non-functional buttons, 5) Mobile responsive layout without horizontal scrolling, and 6) Preserved all LMS context state, modals, and backend readiness.


## Update Rules and Source of Truth

Update this file after meaningful feature, architecture, workflow, decision, or limitation changes. Keep it concise and factual. Use the application code, migrations, package manifest, and actual runtime behavior as the source of truth; this memory file is shared context, not a replacement for inspection.



