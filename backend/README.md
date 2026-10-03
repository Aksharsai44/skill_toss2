# SkillToss Django foundation

This directory is the incremental Django REST Framework replacement for Supabase. PostgreSQL is
the only configured database backend; Docker and SQLite are not part of this architecture.

## Supabase-to-Django mapping

| Existing component | Django foundation equivalent |
| --- | --- |
| Supabase Auth | Custom UUID `accounts.User` plus Django password hashing and SimpleJWT |
| `profiles` | Custom `User` identity fields and authoritative role/institution assignment |
| `institutions` | `accounts.Institution` |
| `departments` | `academics.Department` |
| `academic_courses` | `academics.Course` |
| `subjects` | `academics.Subject` |
| `batches` | `academics.Batch` |
| `teachers` + `teacher_batch_assignments` | Teacher-role `User` + `academics.TeacherAssignment` |
| `students` + `student_enrollments` | Student-role `User` + `academics.StudentEnrollment` |
| `parent_student_links` | `academics.ParentStudentLink` between Parent and Student users |
| `attendance_sessions` + `attendance_records` | `learning.AttendanceSession` + `learning.AttendanceRecord` |
| `assignments` + `submissions` | `learning.Assignment` + `learning.Submission` |
| `daily_goals` + `daily_tasks` + activity | `tracker.DailyGoal`, `DailyTask`, `ActivityEvent` |
| Student notes and private file metadata | `resources.StudentNote`, `NoteFile`, `LearningResource`, `AssignmentResource`, `SubmissionAttachment` |
| RLS role helpers | Reusable DRF permissions and `accounts.policies` helpers |
| RLS tenant predicates | Queryset scoping plus object permission checks (required together) |
| Supabase Data API | Future DRF serializers/viewsets, one domain at a time |
| Supabase Storage | Future Django storage abstraction and private download authorization |
| SQL migrations | Django models and migrations |
| SQL/Auth security checks | Django API and policy tests |

The existing Supabase migrations, typed APIs, storage code, staging scripts, and security tests
remain untouched and are the reference contract for later domain migrations.

## Local setup

1. Install PostgreSQL directly and create a `skilltoss` database.
2. Copy `.env.example` to `.env` and set local values. Never commit `.env`.
3. Install dependencies: `python -m pip install -r requirements.txt`.
4. Run `python manage.py migrate` and `python manage.py check --database default`.
5. Set `SKILLTOSS_TEST_USER_PASSWORD` only in the current shell, then run
   `python manage.py provision_test_users`.
6. Run `python manage.py test`.

## Auth API

- `POST /api/auth/login/` with `email` and `password`
- `POST /api/auth/token/refresh/` with `refresh`
- `POST /api/auth/logout/` with a bearer access token and `refresh`
- `GET /api/auth/me/` with a bearer access token
- `POST /api/auth/set-password/` with invite `uid`, `token`, and confirmed new password
- `POST /api/auth/forgot-password/` with `email` (always returns the same generic response)
- `POST /api/auth/reset-password/` with reset `uid`, `token`, and confirmed new password
- `POST /api/auth/change-password/` with the current and confirmed new password

Refresh tokens rotate and are blacklisted after use. Logout blacklists the supplied refresh token.
Password changes/resets and account disable operations also increment a server-side auth version, so
previous access and refresh tokens are rejected immediately and a fresh login is required.

## User provisioning and account security

- `GET|POST /api/users/` lists or creates only users the requesting tenant manager may manage.
- `GET|PATCH /api/users/{id}/` is tenant-scoped; role escalation and institution reassignment are denied.
- `POST /api/users/{id}/disable/` and `/reactivate/` manage access without deleting accounts.

Admin may create Teacher, Student, and Parent accounts in their own institution. Super Admin may
also create Admin accounts in its institution. Product Admin and educational roles cannot provision
users. New accounts are inactive with an unusable password until their one-time Django setup token
is redeemed. Optional Teacher batch/subject, Student batch, or Parent/child relationships are
validated at invitation time and materialized atomically during activation.

Sensitive account actions are written to `accounts_securityauditevent` without passwords or raw
tokens. The default local email backend prints setup/reset messages to the console. For production,
set `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` and configure `EMAIL_HOST`,
`EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`/`EMAIL_USE_SSL`,
`DEFAULT_FROM_EMAIL`, and `FRONTEND_BASE_URL`. `PASSWORD_RESET_TIMEOUT` defaults to 259200 seconds.

## Core academic API

- Read: `GET /api/institutions/`, `/api/departments/`, `/api/courses/`, `/api/subjects/`
- Batch read/management: `GET|POST /api/batches/`, `GET|PATCH /api/batches/{id}/`
- Teacher assignments: `GET|POST /api/teacher-assignments/`, `GET|PATCH /api/teacher-assignments/{id}/`
- Student enrollments: `GET|POST /api/student-enrollments/`, `GET|PATCH /api/student-enrollments/{id}/`
- Parent links: `GET|POST /api/parent-student-links/`, `GET|PATCH|DELETE /api/parent-student-links/{id}/`

Super Admin and Admin mutations are limited to their institution. Product Admin receives institution
metadata but no academic records. Teacher, Student, and Parent batch querysets are derived only from
active assignments, active enrollments, and explicit parent links respectively.

## Attendance and assignment API

- Attendance sessions: `GET|POST /api/attendance-sessions/`, `GET|PATCH /api/attendance-sessions/{id}/`
- Attendance records: `GET|POST /api/attendance-records/`, `GET|PATCH /api/attendance-records/{id}/`
- Assignments: `GET|POST /api/assignments/`, `GET|PATCH /api/assignments/{id}/`
- Submissions: `GET|POST /api/submissions/`, `GET|PATCH /api/submissions/{id}/`
- Grading: `POST /api/submissions/{id}/grade/`

Only tenant managers and actively assigned teachers can create or change attendance and assignments.
Students can create and edit only their own work for published assignments before the deadline.
Parents are read-only and see only linked-child records. Product Admin has no learning-record access.
Institution, ownership, creator/marker/grader, and audit timestamps are server-controlled; attempts to
send them are rejected. PostgreSQL triggers independently protect cross-table tenant relationships,
active enrollment/staff assignment, immutable identities, deadlines, and submission state transitions.

## Daily tracker API

- Goals: `GET|POST /api/daily-goals/`, `GET|PATCH /api/daily-goals/{id}/`
- Tasks: `GET|POST /api/daily-tasks/`, `GET|PATCH /api/daily-tasks/{id}/`
- Activity: `GET /api/activity-events/`, `GET /api/activity-events/{id}/`

Students own and mutate their tracker. Assigned teachers, linked parents, and tenant managers receive
read-only scoped views. Activity events are generated by PostgreSQL triggers and cannot be posted or
edited through the API.

## Notes, resources, and private files

- Student notes: `GET|POST /api/notes/`, `GET|PATCH|DELETE /api/notes/{id}/`
- Note files: `GET|POST /api/note-files/`, `GET|DELETE /api/note-files/{id}/`
- Learning resources: `GET|POST /api/learning-resources/`, `GET|DELETE /api/learning-resources/{id}/`
- Assignment resources: `GET|POST /api/assignment-resources/`, `GET /api/assignment-resources/{id}/`
- Submission files: `GET|POST /api/submission-files/`, `GET|DELETE /api/submission-files/{id}/`
- Every file endpoint has `GET /api/{resource}/{id}/download/` for authorization-gated streaming.

Files use Django's default storage abstraction under `DJANGO_MEDIA_ROOT` (default: `backend/media`).
That directory is ignored by Git and is not routed as public media. Stored paths use server-generated
UUID names; API responses expose only display metadata and protected download URLs. Uploads are limited
to 10 MB and five files per multi-file owner, with extension, declared MIME, and content-signature checks.
Changing the configured Django storage backend later allows S3/R2 use without changing domain logic.

## Frontend compatibility plan

Do not switch the React provider until these backend tests pass against PostgreSQL. The smallest
later change is to replace `signInWithPassword()` with `/api/auth/login/`, keep access and refresh
tokens behind one auth client abstraction, replace the profile query with `/api/auth/me/`, and
retain the current lowercase role values and `ROLE_HOME_ROUTES`. Supabase domain APIs remain in
place until their corresponding DRF modules are migrated and verified.
