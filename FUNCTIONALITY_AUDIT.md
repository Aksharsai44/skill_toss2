# Skill Toss — Unified Institutional LMS Functionality Audit

**Audit update date:** 2026-09-02
**Status:** Unified Institutional LMS Redesign & Cross-Portal Consistency Complete.
- Design Tokens & Primitives: Standardized typography (`tabular-nums`), responsive touch targets, accessible modals, tabs, search, and badges.
- Landing & Auth: Refined public landing page to showcase practical institutional LMS workflows. Secured search results and demo prefill UX.
- Portal Consistency: Unified Product Admin, Super Admin, Institution Admin, Teacher, Student, and Parent viewer navigation and account menus.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `WORKING` | Action produces a real, deterministic result and the affected views update. |
| `PARTIAL` | Action works but is incomplete, or a subset of its options do nothing distinct. |
| `NO-OP` | Visible, enabled control with no handler. Clicking does nothing. |
| `STATIC` | Rendered value is a hardcoded literal that should be derived from records. |
| `BROKEN` | Action runs but produces a wrong, misleading, or contradictory result. |
| `BACKEND-MISSING` | Code targets a Supabase table that does not exist in any migration. |

## Backend reality check (drives every `BACKEND-MISSING` row)

Phase 1 migration `20260820000000_secure_tenant_identity_foundation.sql` creates exactly **five** tables:
`institutions`, `profiles`, `students`, `teachers`, `parent_student_links`.

Tables the application queries:

| Table queried | Exists? | Queried from |
| --- | --- | --- |
| `profiles` | **yes** | `src/lib/auth.tsx` |
| `class_sessions` | no | `src/lib/lmsData.tsx` — **correctly gated** on `isClassSessionSyncEnabled` |
| `courses` | no | `StudentCourses`, `CourseBuilder` |
| `course_lessons` | no | `CourseViewer`, `CourseBuilder` |
| `notes` | no | `MyNotes` |
| `leave_requests` | no | `StudentLeaves`, `AdminLeaveTable`, teacher leave views |
| `certificate_templates` | no | `CourseBuilder` certificate modal |

`class_sessions` is the one honest case: `lmsData.tsx:42` returns early unless the feature flag is on, so nothing silently fails. **That is the pattern the other five should follow.** Everywhere else the code uses `if (!error && data)` and discards the error, so a missing table renders as "no data yet" instead of "not available".

---

## 1. Landing page — `src/components/LandingPage.tsx` (line-read via scan + anchor verification)

| Portal | Page | Visible control/action | Status | Data source | Expected behavior | Issue found |
| --- | --- | --- | --- | --- | --- | --- |
| Public | Landing | Header nav `Features` / `Roles` / `Automation` / `Pricing` (l.62–65) | `WORKING` | in-page anchors | Scroll to section | None — all four `id=` targets exist (l.188, 212, 252, 306) |
| Public | Landing | Header `Sign In` (l.67) | `WORKING` | `onLogin` prop | Navigate to `/login` | None |
| Public | Landing | Hero primary CTA (l.90) | `WORKING` | `onLogin` | Navigate to `/login` | None |
| Public | Landing | Hero secondary `#features` (l.93) | `WORKING` | anchor | Scroll to features | None |
| Public | Landing | Role cards ×6 (l.221) | `WORKING` | `onLogin` | Navigate to `/login` | Every role card opens the same generic login; no role prefill. Acceptable, not a defect. |
| Public | Landing | Pricing CTA (l.310) | `WORKING` | `onLogin` | Navigate to `/login` | None |

**Landing page has zero dead controls.**

## 2. Login — `src/components/LoginPage.tsx` (line-read)

| Portal | Page | Visible control/action | Status | Data source | Expected behavior | Issue found |
| --- | --- | --- | --- | --- | --- | --- |
| Public | Login | Email / Password inputs | `WORKING` | React state | Controlled, editable | None |
| Public | Login | Show/hide password (l.165) | `WORKING` | local state | Toggle input type | None |
| Public | Login | `Sign In` submit (l.204) | `WORKING` | `signIn` → Supabase Auth → `profiles` | Authenticate, route by **profile** role | None; destination is taken from `userProfile.role`, not the clicked demo button |
| Public | Login | **`Remember me` checkbox (l.178)** | **`NO-OP`** | none | Persist session preference | Uncontrolled, no `checked`, no `onChange`. Toggling it changes nothing. |
| Public | Login | **`Forgot password?` (l.190)** | **`PARTIAL`** | none | Start a recovery flow | Fires `alert('Please contact your administrator…')`. A native `alert` is not a product surface and the link is an `<a href="#forgot">` acting as a button. |
| Public | Login | Demo Quick Select ×6 (l.235) | `WORKING` | `DEMO_ACCOUNTS` | Prefill email + password, focus Sign In | Behaviour correct. **Presentation regressed**: off-palette `text-cyan-600` / `bg-cyan-50` / `border-cyan-500` (l.227–244) — `cyan` is not a project token; `grid-cols-3` + `h-9` + `truncate` (l.231, 242, 249) clips `Product Admin`; selected state is colour-only (no `<Check>`), failing "not colour-only". |
| Public | Login | Demo Quick Select **visibility** | **`BROKEN`** | `isDemoQuickSelectEnabled` | Hidden unless demo mode | `demoAccounts.ts:112` is hardcoded `= true`, contradicting its own doc comment. Quick Select would ship enabled in production. |

### 2a. Auth layer — `src/lib/auth.tsx` (line-read) — security regression

| Portal | Page | Visible control/action | Status | Data source | Expected behavior | Issue found |
| --- | --- | --- | --- | --- | --- | --- |
| Public | Login | `signIn` failure path (l.129–148) | **`BROKEN`** | `DEMO_PROFILES` | Surface the auth error | **Any failed Supabase Auth attempt on a `@skilltoss.demo` email mints a fake local session and grants the portal.** `isSupabaseConfigured` is imported (l.3) but never checked here, so the fallback is live against the real dev project. |

## 3. Shared layout — `src/components/DashboardLayout.tsx` (line-read)

| Portal | Page | Visible control/action | Status | Data source | Expected behavior | Issue found |
| --- | --- | --- | --- | --- | --- | --- |
| All | Shell | Sidebar nav links | `WORKING` | `nav.ts` + `getNavigationForRole` | Route + active state | None |
| All | Shell | Sidebar badge counts | `STATIC` | hardcoded strings in `nav.ts` | Derived counts | Demo Requests `'4'`, Admin Fees `'6'`, Teacher Leave Requests `'3'` are literals. |
| All | Shell | Institution name in header | `STATIC` | `profile.institutionId \|\| 'Bright Future College'` | Real institution name | Falls back to an invented college even though `state.institution` exists in `lmsData`. |
| All | Shell | Profile menu → `Profile` / `Settings` | **`BROKEN`** for admin roles | `/${profile.role}/profile` | Route to the role's profile page | Produces `/admin/profile`, `/super_admin/profile`, `/product_admin/profile` — no such routes; falls through to `*` → `/`, i.e. logs the impression of a logout. |
| All | Shell | Profile menu container | `PARTIAL` (a11y) | — | Valid menu semantics | `role="listbox"` with `<button>` children (invalid: needs `option` children), and `aria-modal` on a non-modal popover. |
| All | Shell | Mobile sidebar (< lg) | `PARTIAL` (a11y) | — | Focus contained while open | Off-canvas panel stays in the tab order when closed. |
| All | Shell | Global search | `PARTIAL` | `searchRecords` | Results the viewer can open | Returns `/admin/students` and `/admin/batches` paths for **every** role, and matches **all** students — a Student/Parent gets other children's names and unreachable links. |
| All | Shell | Feedback banner (l.320) | `WORKING` | `feedback` in `lmsData` | Show, auto-clear at 4 s | None |
| All | Shell | `Sign out` | `WORKING` | `signOut` | Clear session, redirect | None |

## 4. Shared UI primitives — `src/components/ui/*` (line-read)

| Portal | Page | Visible control/action | Status | Data source | Expected behavior | Issue found |
| --- | --- | --- | --- | --- | --- | --- |
| All | `Modal.tsx` | Dialog open/close | `PARTIAL` (a11y) | — | Trap focus, restore on close, lock scroll | Declares `role="dialog" aria-modal="true"` but has **no focus trap**, no focus restore to the trigger, no body scroll lock; `id="modal-title"` is static so two dialogs collide. |
| All | `Tabs.tsx` | Tab list | `PARTIAL` (a11y) | — | Arrow-key roving tabindex | Declares `role="tab"` without arrow-key support; `id={`tab-${i}`}` collides when two `Tabs` render on one page. |
| All | `Tabs.tsx` → `Select` | Every `<Select>` in the app | `PARTIAL` (a11y) | — | Programmatic name from its visible label | Hardcoded `aria-label="Select option"` for **every instance**; no `label`/`aria-label` prop exists. |
| All | `Button.tsx` | `<Button>` inside a `<form>` | `PARTIAL` | — | Default `type="button"` | No default `type`, so any `<Button>` in a form implicitly submits it. |
| All | `Button.tsx` | `size="icon"` | `PARTIAL` (a11y) | — | Require an accessible name | Nothing enforces `aria-label`. |
| All | `StatCard.tsx` | `to` link focus ring | `PARTIAL` (a11y) | — | Visible ring on page bg | `focus-ring` uses `ring-offset-white`; dashboard pages are `bg-ink-50`. |
| All | `Charts.tsx` | Bar/line/pie charts | `PARTIAL` (a11y) | `CHART` palette | Text alternative | No `role="img"` or summary; chart data is unavailable to a screen reader. |
| All | `index.css` | `.btn-ghost` icon-only buttons | `PARTIAL` (a11y) | — | ≥ 44×44 px target | `px-3 py-2 text-sm` ≈ 36 px tall, under the minimum. |
| All | `DataTable.tsx` | Scroll region, `scope="col"`, row Enter/Space | `WORKING` | — | — | None. |
| All | `Badge.tsx`, `Layout.tsx` | Badges, `PageHeader`, `Card`, `EmptyState`, `LoadingState` | `WORKING` | — | — | None. |
| All | `ProtectedRoute.tsx` | Role gate | `WORKING` | `profile.role` | Redirect to role home | Correct but silent — a cross-portal search hit looks like a bug to the user. |

## 5. Student / Parent portal — `src/portals/student/index.tsx` (line-read in full)

Parent is a **viewer** of the same Student data (`ROLE_HOME_ROUTES.parent === '/student'`, `viewerRole` from `profile.role`). No separate portal exists — correct per architecture.

### 5a. Dashboard (`/student`, l.40–451)

| Portal | Page | Visible control/action | Status | Data source | Expected behavior | Issue found |
| --- | --- | --- | --- | --- | --- | --- |
| Student/Parent | Dashboard | Child switcher (parent only) | `WORKING` | `studentPortal` + `parent_student_links` shape | Swap `selectedStudent`, all views follow | None |
| Student/Parent | Dashboard | KPI stat cards | `WORKING` | `getStudentSummary` | Derived counts, link to detail | None |
| Student/Parent | Dashboard | **Attendance threshold caption (l.138–142)** | **`STATIC`** | literal `1%` | `${75 - attendanceVal}% below minimum` | Says "1% below minimum threshold" for **any** shortfall — a student at 60 % is told 1 %. |
| Student/Parent | Dashboard | **Fee due card title (l.260)** | **`STATIC`** | literal | `nextFee.title` | Hardcoded `Semester 7 Fee Due` while `nextFee.title` is in scope on the same line. |
| Student/Parent | Dashboard | **Greeting name (l.51)** | **`STATIC`** | `profile?.fullName \|\| 'Arjun Verma'` | Real name or a neutral fallback | Invents a specific person's name when the profile has none. |
| Student/Parent | Dashboard | Deadline / activity lists | `WORKING` | `getStudentPortalInsights` | Navigate to source page | None |

### 5b. Pages backed by the shared local provider — all `WORKING`

| Page | Route | Controls | Status | Data source |
| --- | --- | --- | --- | --- |
| Attendance | `/student/attendance` | filters, month view | `WORKING` | `lmsData.attendance` |
| Results | `/student/results` | result table | `WORKING` | `state.examResults` |
| Notifications | `/student/notifications` | mark read, mark all read | `WORKING` | `markNotificationRead`, `markAllNotificationsRead` |
| Saved | `/student/saved` | bookmark toggle | `WORKING` | `toggleResourceBookmark` |
| Classes | `/student/classes` | join live, session list | `WORKING` | `state.classSessions` |
| Recordings | `/student/recordings` | list, open | `WORKING` | `state.classSessions` |
| Resources | `/student/resources` | search, bookmark, download | `WORKING` | `state.resources` |
| Assignments | `/student/assignments` | submit, view grade, attach files | `WORKING` | `saveSubmission` + `attachmentStorage` |
| Timetable | `/student/timetable` | weekly grid | `WORKING` | `state.timetable` |
| Calendar | `/student/calendar` | grouped deadlines, click → source page | `WORKING` | `getStudentPortalInsights` |
| Goals | `/student/goals` | add / edit / progress / delete | `WORKING` | `saveGoal`, `deleteGoal` |
| Profile | `/student/profile` | edit + avatar upload | `WORKING` | `updateStudentProfile`, `updateProfileAvatar` |
| Certifications | `/student/certifications` | empty state + link to locker | `WORKING` | honest: counts are `0`, text states the demo issues none |

### 5c. Student/Parent defects

| Portal | Page | Visible control/action | Status | Data source | Expected behavior | Issue found |
| --- | --- | --- | --- | --- | --- | --- |
| Student/Parent | Fees | **`View Details` / `Paid in Full` (l.1315)** | **`NO-OP`** | none | Open the invoice, or not be a button | The **only** dead button in the portal. `permissions.canPayFees` is `false` for `student`, so **every Student sees it**. |
| Student/Parent | Fees | Total-fee progress bar (l.1302–1304) | `BROKEN` (edge) | `fee.paid / fee.total` | `0%` when there are no invoices | Divide-by-zero → `NaN%` width and `NaN% paid`. |
| Student/Parent | Fees | Receipt `Download` (l.1327) | `PARTIAL` | `window.print()` | Produce that receipt | `Download` icon + `Receipt` label but prints the entire page including nav chrome. |
| Student/Parent | Fees | Record Demo Payment | `WORKING` | `recordPayment` | Bounded, honest, banner discloses no gateway | None |
| Student/Parent | Settings | **Assignment / exam notification toggles (l.1540–1543)** | **`NO-OP`** | `localStorage` keys nothing reads | Change delivery behaviour | `skill-toss-assignment-notifications` and `skill-toss-exam-reminders` appear **only** in `StudentSettings`. Writes go nowhere. |
| Student | Courses | Course cards (`StudentCourses.tsx` l.70, 76) | `BACKEND-MISSING` + a11y | `.from('courses')` — table absent | Show courses, or say the feature isn't available | Error is swallowed (`if (!error && data)`), so it always renders **"Your teachers haven't published any courses yet. Check back soon!"** — a false claim about teachers. Cards are `<div onClick>`: not keyboard reachable. |
| Student | Courses | Lesson completion | `PARTIAL` (honest) | session state | Persist | Correctly disclosed as session-only. |
| Student | My Notes | Create / edit / delete note | **`BROKEN`** | `.from('notes')` — table absent | Persist, or refuse honestly | `save()` (l.796–807) **ignores the insert/update error, closes the modal and reports success**. The note is silently lost. The list then shows "No notes yet". This is faked backend success. |
| Student | My Notes | Download note (l.813) | `WORKING` | in-memory blob | Download `.txt` | None |
| Student | Leaves | Request Leave submit | `WORKING` (honest failure) | `.from('leave_requests')` — table absent | Surface an error | `submit()` **does** check `error` and shows a truthful message (l.922). Good. |
| Student | Leaves | Leave list fetch (l.891–901) | `BACKEND-MISSING` | same absent table | Say it isn't available | Fetch error swallowed → empty state claims **"You'll be notified via WhatsApp & email"**, directly contradicted by the banner below it (l.952) which says external delivery is not configured. |
| Student/Parent | Exams | `Completed Exams` subtitle (l.1116) | **`BROKEN`** | literal | Describe the real source | Says **"Instant AI-graded results"**. Results come from `state.examResults`, entered by a teacher. No AI exists. |
| Student/Parent | Exams | Practice quiz button (l.1108) | `WORKING` (honest) | — | Disabled + explained | Correctly `disabled` with the label "Practice quiz not configured". |
| Student | Community | Community list items (l.1184) | **`NO-OP`** | 3 hardcoded literals | Switch the open chat | `<div className="cursor-pointer">` with no handler — not clickable, not focusable, but styled as clickable. Unread badges `2 / 0 / 1` are literals. |
| Student | Community | Chat header (l.1192–1195) | `STATIC` | literals `CS-2024-A`, `32 members` | Follow the selected community | Never changes. |
| Student | Community | Send message (l.1209) | `PARTIAL` | local `useState`, author hardcoded `'Arjun Verma'` (l.1172) | Post as the signed-in user, persist | Message appears, then is lost on navigation; attributed to a hardcoded name regardless of who is signed in. |
| Student | Forum | Publish post (l.1221) | `PARTIAL` | local `useState`, author hardcoded `'Arjun Verma'` | Post as the signed-in user, persist | Same as Community. |
| Student | Forum | Likes / comments counts (l.1240–1241) | `STATIC` | `forumPosts` literals | — | Rendered as plain `<span>`, not buttons — correctly **not** fake-interactive. Trending Topics (l.1251) are literals. |
| Student/Parent | Reports | Report-type `Select` (l.1363) | **`PARTIAL`** | `reportType` | 4 distinct reports | `overview` renders the analysis card; `attendance`, `marks` and `custom` all render the **same** table (l.1399). Three options, one result. |
| Student/Parent | Reports | `Print Report` (l.1367) | `WORKING` | `window.print()` | Print | Prints page chrome too, but is a real action. |
| Student/Parent | Reports | Analysis card | `WORKING` (honest) | `getStudentSummary` | Derived | Explicitly labelled "deterministic demo analysis, not an AI prediction". |
| Student/Parent | Digital Locker | Category tiles (l.529–538) | `STATIC` | 4 literals | Derived counts | `['Certificates','Not issued']`, `['Reports','Available']`, `['Hall tickets','Not issued']` are literals; only `receipts.length` is derived. |
| Student/Parent | Digital Locker | `Print` buttons | `PARTIAL` | `window.print()` | Print that document | Prints the whole page. Browser-local storage limitation is honestly disclosed. |
| Student/Parent | Notifications | Filter buttons (l.513) | `PARTIAL` (a11y) | `category` state | Valid tab semantics | `role="tab"` + `aria-selected` on `.btn-secondary` with **no** `tablist`→`tabpanel` relationship and no arrow keys. Also `academic` overlaps the separate `assignment` and `exam` tabs. |
| Student/Parent | Goals | Delete goal (l.549) | `PARTIAL` | `window.confirm` | Use the app's `Modal` | Native `confirm()` is inconsistent with every other destructive action. |
| Student/Parent | Goals | Goal modal (l.550) | `PARTIAL` | `form.category` | Editable category | `form.category` exists and the card displays it, but the modal has **no Category field** — the value can never be changed. |
| Student/Parent | Classes | Batch resolution (l.560) | `BROKEN` (fragile) | `selectedStudent?.batch === 'EE-2024-B' ? 'batch_002' : 'batch_001'` | `summary.student.batchId` | Hardcoded two-batch mapping; any third batch silently resolves to `batch_001`. |
| Student/Parent | Diary | `/student/diary` | `PARTIAL` | `StudentDiary = StudentGoals` (l.1161) | Its own page or no route | Duplicate alias; route exists but **no nav entry points at it**. |
| Student | AI Hub | `/student/ai-hub` | orphan route | — | — | No nav entry. Brief forbids adding AI features. |
| Student/Parent | — | `studentPortal.tsx:50-52` linkage | `BROKEN` (fragile) | name equality between `profile.fullName` and `student.name` | Link by id | Parent→child resolution matches on **name string equality**, with a `'demo-parent-id'` literal fallback. Two students with the same name break it. |

**Student/Parent totals:** 1 `NO-OP` button, 2 `NO-OP` toggles, 1 `NO-OP` fake-clickable list, 3 `BACKEND-MISSING` pages (1 of which fakes success), 4 false/misleading claims, 5 `STATIC` values that should be derived, 2 fragile lookups, 1 `PARTIAL` Select, ~10 a11y gaps (most in shared primitives).

## 6. Teacher portal — `src/portals/teacher/index.tsx` (scan-derived; not line-read in full)

| Portal | Page | Visible control/action | Status | Data source | Expected behavior | Issue found |
| --- | --- | --- | --- | --- | --- | --- |
| Teacher | Dashboard | `View Students` (l.141), `Take Attendance` (l.142) | `NO-OP` | none | Navigate | No handler |
| Teacher | Batches | icon button (l.255) | `NO-OP` | none | — | No handler, no accessible name |
| Teacher | Salary | `Download Payslip` (l.633), icon (l.644) | `NO-OP` | hardcoded history literals | Produce a payslip | No handler; `TeacherSalary` (l.609) history is literals |
| Teacher | Profile | `Edit Profile` (l.835, live via `TeacherProfile`) | `NO-OP` | none | Open edit form | No handler |
| Teacher | Forum | like (l.957), comment (l.958), share (l.959) | `NO-OP` | none | Record the interaction | Fake-interactive buttons wrapping static counts |
| Teacher | Calendar | `Add Event` (l.1015), icons (l.1021–1022) | `NO-OP` | none | Create an event | No handler |
| Teacher | Community | list item (l.988) | `NO-OP` | literals | Switch chat | `cursor-pointer` div, no handler |
| Teacher | Courses | `CourseBuilder` create/edit/publish, lessons, certificate template | `BACKEND-MISSING` | `courses`, `course_lessons`, `certificate_templates` absent | Persist | All controls wired, all writes target absent tables |
| Teacher | Leaves | leave approve/reject | `BACKEND-MISSING` | `leave_requests` absent | Persist | — |
| Teacher | — | `DraftCommunityView` (658), `DraftForumView` (716), `DraftCalendarView` (778), `LegacyProfileView` (1053) | dead code | — | — | Exported, never imported. 6 of the dead buttons above live here and are unreachable. |

## 7. Institution Admin — `src/portals/admin/index.tsx` (scan-derived)

16 `NO-OP` controls: l.65, 66 (unlabelled icons), 136 `Edit Profile`, 137 `Message`, 259 `Download Report`, 260 `WhatsApp Parent`, 293 `Create Batch`, 319 `Manage Batch`, 354 `Export`, 431 `Run Payroll`, 449 `Pay`, 449 `Slip`, 650 `Configure`/`Connect Now`, 780 `Add Event`, 786, 787 (unlabelled icons).

`WhatsApp Parent` (260) is additionally a **false capability** — no external messaging is configured anywhere in the project. Leave management is `BACKEND-MISSING` (`leave_requests`).

## 8. Super Admin — `src/portals/super-admin/index.tsx` (scan-derived)

1 `NO-OP`: l.309 `Export`. Route `/super-admin/leads` is an orphan (no nav entry).

## 9. Product Admin — `src/portals/product-admin/index.tsx` (scan-derived)

**Zero dead controls.** Sidebar `Demo Requests` badge is the static `'4'` from `nav.ts`.

## 10. Live classroom / Jitsi (scan-derived)

| Portal | Page | Visible control/action | Status | Data source | Expected behavior | Issue found |
| --- | --- | --- | --- | --- | --- | --- |
| Student/Teacher | `LiveClassroomPage.tsx` | leave, attendance, end class, back | `WORKING` | `lmsData` session actions | — | All 8 controls wired |
| Student/Teacher | `JitsiMeeting.tsx` | reload, leave | `WORKING` | — | — | Both wired |
| All | `FileAttachmentPicker.tsx` | choose files, remove file | `WORKING` | `attachmentStorage` (IndexedDB) | — | Browser-local only; disclosed at the call sites |

## Orphan routes (route exists, no nav entry)

`/student/ai-hub`, `/student/diary`, `/super-admin/leads`. No nav entry points at a missing route.

---

## Summary counts

| Status | Count | Where |
| --- | --- | --- |
| `NO-OP` buttons | **38** | admin 16, teacher 18 (6 unreachable in dead code), super-admin 1, **student 1**, product-admin 0 |
| Fake-clickable `div`s | 3 | `student/index.tsx:1184`, `teacher/index.tsx:767`, `:988` |
| Keyboard-inaccessible cards | 2 | `StudentCourses.tsx:70`, `:76` |
| `BACKEND-MISSING` tables | 6 of 7 queried | only `profiles` exists |
| Faked backend success | 1 | `MyNotes.save()` |
| False user-facing claims | 6 | courses empty state, leaves empty state, "Instant AI-graded results", "WhatsApp Parent", "1% below minimum", "Semester 7 Fee Due" |
| Security regressions | 1 | `auth.tsx` demo fallback ungated |
| Config regressions | 2 | `isDemoQuickSelectEnabled = true`; Quick Select off-palette |

**Design system verdict:** `src/index.css` is already sound (focus-visible, `.card`, `.btn-*`, `.input` at 44 px, reduced-motion, reduced-transparency, forced-contrast, scrollbars). Remaining design work is narrow and belongs in the shared primitives, not in pages: `.btn-ghost` touch target, `Select` labelling, `Modal` focus trap/restore, `Tabs` arrow keys, `StatCard` ring-offset, chart text alternatives, `Button` default `type`. No page-specific visual system is needed.
