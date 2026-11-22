# Trinetray Workspace

A responsive Next.js starter for an independent, employee-initiated workspace concept.

## Included
- Next.js App Router + TypeScript
- Responsive concept landing page
- Accessible navigation and reduced-motion support
- No authentication or database credentials included
- Search indexing disabled while this is a private concept

## Run locally
1. Install Node.js 20.9 or newer.
2. In this folder, run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

## Upload to GitHub
Upload the **contents** of this ZIP into the root of the existing `TrinetrayWorkspace` repository. Make sure `package.json`, `app/`, and `next.config.ts` are at the repository root, not nested inside an extra folder.

Vercel is already linked to the repository in the current project setup. After committing the files, Vercel should start a new deployment automatically.

## Important
This is only the first frontend foundation. Sign-in, approval workflows, tasks, messaging, file uploads, notifications, and database integration are not implemented yet. Do not enable public registration until server-side email-whitelist and approval checks are completed.

This is an independent employee-initiated concept and is not an official company service or endorsement.
