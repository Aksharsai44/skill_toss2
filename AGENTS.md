# Skill Toss LMS Agent Instructions

- This repository is the Skill Toss LMS React + TypeScript application.
- Read `MEMORY.md` before making changes. Treat it as shared project context and ADR notes, then inspect the actual code; code wins if they disagree.
- Update `MEMORY.md` after meaningful architecture, feature, decision, limitation, or workflow changes. Do not update it for trivial edits.
- Reuse existing components, contexts, services, types, and utilities. Keep changes focused; avoid random abstractions, duplicate state, and unrelated refactors.
- Keep integrations honest: do not describe demo/local behavior as production backend behavior.
- Run the relevant checks before handoff and report anything not run or still limited.

## Package Manager

Use npm with the committed `package-lock.json`.

## File-Scoped Commands

- `npm run dev` - start the Vite development server.
- `npm run typecheck` - run TypeScript checks.
- `npm run lint` - run ESLint.
- `npm run build` - create the production build.

## Commit Attribution

When creating a commit, use a clear conventional message describing the user-facing change. Do not rewrite existing history or commit unrelated work.

## Key Conventions

- React, TypeScript, Vite, Tailwind CSS, Lucide, Recharts, Anime.js, and Supabase are the established stack.
- Shared LMS state belongs in the existing `src/lib` contexts and domain types; portal pages should consume those shared abstractions.
- Preserve the unified Student/Parent portal model and role-protected routing.
- Preserve accessibility patterns such as semantic controls, keyboard behavior, focus handling, and reduced-motion support.
- Verify storage, Jitsi, and Supabase behavior against their documented limitations in `MEMORY.md`.
