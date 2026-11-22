TRINETRAY WORKSPACE - FEATURE IMPLEMENTATION FILES

Included:
- lib/workspace-auth.ts: verifies Firebase ID token, verified email, and approved profile on the server.
- app/api/workspace/route.ts: real database-backed tasks, task visibility, completion/reopen, directory, notifications, conversations, messaging, analytics, admin approvals and search APIs.
- app/api/admin/access/route.ts: server-side admin identity + two-step access phrase/PIN validation and short-lived HTTP-only admin cookie.
- app/admin/page.tsx: admin access gate UI.

Database change already applied to the linked Supabase project:
- conversations
- conversation_members
- messages
All three tables have RLS enabled. API access is performed server-side with the service role after Firebase identity and profile authorization checks.

IMPORTANT INTEGRATION NOTES:
1. Merge these files into the existing repository; do not replace the whole repository.
2. Confirm Vercel has server-only variables WORKSPACE_ADMIN_SEARCH_CODE and WORKSPACE_ADMIN_PIN set for Production and Preview. Never use NEXT_PUBLIC_ prefixes for them.
3. Set ADMIN_SESSION_SECRET to a long random value in Vercel. This signs the short-lived admin cookie. Do not share it in chat.
4. The current app/dashboard/page.tsx still needs its UI wired to /api/workspace and its search control wired to /api/workspace?type=search&q=... . These API endpoints are provided here, but the existing dashboard file is intentionally not overwritten by this package to avoid losing the current layout.
5. Admin gate route is /admin. After verification, it returns to /dashboard?view=admin; dashboard admin view must be wired to the admin API.
6. Before enabling for employees, run a full build and test with non-company test accounts. Do not use real company employee data for testing.

The existing database was inspected before creating these additions. No fake profiles, tasks, messages or analytics records were inserted.

Additional UI file now included:
- app/dashboard/page.tsx: dashboard wired to the workspace API for task creation/completion, directory, messaging, notifications, search, actual-record analytics and pending approval review.

NOTE: Review the code before merging. The admin dashboard view is currently reachable from the dashboard navigation state only after the admin gate redirects with ?view=admin; if the current page doesn't initialize the view from query parameters, open the Admin item via the admin navigation link or adjust the initial active view. The API still verifies the profile role server-side.

Security hardening in this package:
- Admin API read/review operations require the short-lived signed HTTP-only workspace_admin cookie created only after both access steps.
- The cookie is validated server-side against the Firebase UID and expiry; the profile role alone is not sufficient.
- Set ADMIN_SESSION_SECRET in Vercel to a long random secret before using the admin gate.

Admin entry flow:
- Open the dashboard search control and submit the administrator access phrase. The phrase is sent directly to the server-side verification endpoint, not compared in browser code.
- On success, the app opens /admin?step=pin. The six-digit PIN is then verified by the same server-side endpoint.
