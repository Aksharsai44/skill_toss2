# Skill Toss LMS

Skill Toss is a responsive, role-based learning management system for education businesses, institutions, teachers, students, and parents. It brings academic operations, learning workflows, reporting, and fee management into a single React application.

## Highlights

- Six protected portals: Product Admin, Super Admin, Admin, Teacher, Student, and Parent
- Course, batch, student, teacher, attendance, assignment, exam, resource, and fee workflows
- Parent access with linked-student switching and read-only permissions where appropriate
- Dashboards, KPI cards, charts, reports, calendars, community, and profile management
- Django/PostgreSQL authentication with rotating JWT refresh tokens and server-authoritative roles
- Seeded demo data with browser-local persistence for interactive demonstrations
- Responsive navigation and accessible UI states
- Subtle Anime.js transitions with reduced-motion support
- Route-level code splitting and optimized production chunks

## Tech stack

- React 18 and TypeScript
- Vite 5
- Tailwind CSS
- React Router
- Django REST Framework and PostgreSQL for authentication/account management
- Supabase for deferred data domains still awaiting their Django frontend migration
- Recharts
- Anime.js
- Lucide React

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm
- Python and PostgreSQL for the Django backend

### Installation

```bash
git clone https://github.com/Aksharsai44/skill_toss2.git
cd skill_toss2
npm install
```

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The `.env` file is ignored by Git. Never commit production credentials.

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Development accounts

Provision the six Django development users with a runtime-only password, then use the development quick-select to fill an email. The password is never bundled into the frontend.

```powershell
$env:SKILLTOSS_TEST_USER_PASSWORD='choose-a-local-password'
python backend/manage.py provision_test_users
```

| Role | Email |
| --- | --- |
| Product Admin | `productadmin@skilltoss.test` |
| Super Admin | `superadmin@skilltoss.test` |
| Admin | `admin@skilltoss.test` |
| Teacher | `teacher@skilltoss.test` |
| Student | `student@skilltoss.test` |
| Parent | `parent@skilltoss.test` |

Authentication always uses Django. `/api/auth/me/` supplies the authoritative role, institution, and active status. Supabase configuration is optional for auth and applies only to deferred data modules.

## Supabase setup

Database migrations are located in [`supabase/migrations`](supabase/migrations). Apply them to a Supabase project in timestamp order using the Supabase CLI or SQL editor. They create the LMS tables, authentication profiles, supported roles, policies, and related workflows.

Create production accounts through the Django Admin/Super Admin user-management screens. New accounts receive a one-time Django setup link; administrators never choose a permanent password.

Supported roles are:

```text
product_admin, super_admin, admin, teacher, student, parent
```

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run typecheck` | Run TypeScript checks without emitting files |
| `npm run lint` | Run ESLint across the project |
| `npm run build` | Create an optimized production build in `dist` |
| `npm run preview` | Preview the production build locally |
| `npm run verify:django-auth` | Run the six-role Django browser auth smoke against running local servers |

## Project structure

```text
src/
├── components/       Shared pages and reusable UI components
├── lib/              Authentication, LMS state, data, types, and motion
├── portals/          Role-specific portal screens
├── App.tsx           Application providers and route definitions
└── index.css         Tailwind layers and global design tokens
supabase/
└── migrations/       Database schema and authentication migrations
```

## Data behavior

The interactive LMS demo starts from seeded data and stores changes in browser `localStorage` under `skill-toss-lms-demo-v3`. This makes workflows such as assignments, attendance, payments, resources, exams, and goals persist across refreshes on the same browser.

To reset the interactive demo, remove that key from browser storage.

## Production verification

Before deploying, run:

```bash
npm run typecheck
npm run lint
npm run build
```

Deploy the generated `dist` directory to any static host that supports SPA fallback routing to `index.html`.
