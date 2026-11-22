# Trinetray Workspace

A Next.js workspace foundation using Firebase Authentication and Supabase for workspace data.

## Included
- Invitation-only Firebase email/password registration, sign-in and password reset\n- Password strength spark-feed indicator
- Email verification gate
- Server-side Firebase ID-token verification
- Server-side email whitelist check and employee profile provisioning
- Supabase Firebase UID mapping while preserving internal UUID profile IDs
- Liquid-rail desktop navigation and responsive mobile layout
- Shared ease-in/ease-out motion on buttons, controls and cards
- Reduced-motion accessibility support

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Fill in the Firebase web app configuration and Supabase URL/public anon key.
3. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` and `SUPABASE_SERVICE_ROLE_KEY` only in server-side environment variables. Never prefix them with `NEXT_PUBLIC_`, commit them, or share them in chat.
4. Install dependencies with `npm install`.
5. Run `npm run dev`.

## Required Vercel environment variables
Set all variables from `.env.example` in Vercel. `FIREBASE_SERVICE_ACCOUNT_JSON` must be the complete Firebase service account JSON string, stored only as an encrypted server environment variable. `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.

## Authentication provisioning
After a verified Firebase sign-in, `/api/auth/provision` verifies the Firebase ID token, checks `email_whitelist`, creates a pending employee profile if needed, and assigns Firebase's `role: authenticated` custom claim using Firebase Admin SDK. New registrations must be whitelisted and provide a name and mobile number. The browser refreshes the token on its next request/sign-in. The claim is a database transport role only; workspace permissions remain in the Supabase profile.

## Important implementation notes
- Public account creation is intentionally not exposed in the UI.
- The eligibility endpoint is informational only; the provisioning route performs the authoritative whitelist check.
- Admin SDK credentials and Supabase service-role credentials are never sent to the browser.
- The dashboard is a UI foundation. Task writes, DMs, storage, analytics, admin approval screens, and notification delivery still require their dedicated server-side authorization and database implementation.
- Do not treat a successful Firebase login as employee approval. New profiles are `pending`.
- Do not deploy until required environment variables and the database policies are reviewed.

## Motion
Interactive elements use a shared cubic-bezier easing curve with ease-out emphasis, hover lift, active press feedback and a `prefers-reduced-motion` override.
