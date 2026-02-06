# PRD: Configure Supabase Auth with Magic Link

## Introduction

Set up Supabase authentication with magic link (passwordless email) login for the RoleCall admin dashboard. This provides secure authentication without requiring database migrations, enabling role-based access control for admin, manager, and teacher users. Magic links offer a secure, user-friendly authentication method suitable for internal admin tools.

## Goals

- Enable magic link email authentication for admin dashboard access
- Configure role-based access control (admin, manager, teacher) using Supabase metadata
- Integrate Supabase Auth client with TanStack Start routing and state management
- Provide Hebrew-language error messages and UI text
- Implement protected routes with automatic redirect for unauthenticated users
- Ensure session persistence across page refreshes

## Tasks

### T-001: Configure Supabase Auth Client
**Description:** Create Supabase client configuration with auth settings and Hebrew error message translations.

**Acceptance Criteria:**
- [ ] Create `lib/supabase.ts` with Supabase client configuration
- [ ] Environment variables for `SUPABASE_URL` and `SUPABASE_ANON_KEY` configured
- [ ] Hebrew error message translations defined for common auth errors
- [ ] Auth state change listener configured
- [ ] Quality checks pass

### T-002: Create Login Page with Magic Link Form
**Description:** Build login page with email input form that sends magic link via Supabase Auth.

**Acceptance Criteria:**
- [ ] Create login route at `/login` with email input form
- [ ] Form validates email format before submission
- [ ] Magic link sent via `supabase.auth.signInWithOtp()`
- [ ] Success message displayed in Hebrew after link sent
- [ ] Error messages displayed in Hebrew on failure
- [ ] Quality checks pass
- [ ] **Verify in browser:** Enter email, receive magic link email

### T-003: Create Auth Callback Handler
**Description:** Implement callback route to handle magic link verification and redirect authenticated users.

**Acceptance Criteria:**
- [ ] Create callback route at `/auth/callback`
- [ ] Exchanges auth code for session using Supabase client
- [ ] Redirects to dashboard (`/`) on success
- [ ] Displays Hebrew error message on failure
- [ ] Sets auth cookie/session for persistence
- [ ] Quality checks pass
- [ ] **Verify in browser:** Click magic link, redirects to dashboard

### T-004: Implement Protected Route Middleware
**Description:** Add middleware to protect routes and redirect unauthenticated users to login.

**Acceptance Criteria:**
- [ ] Create auth middleware that checks session on protected routes
- [ ] Redirects to `/login` if no valid session exists
- [ ] Allows access to `/login` and `/auth/callback` without authentication
- [ ] Session persists across page refreshes
- [ ] Quality checks pass
- [ ] **Verify in browser:** Navigate to `/` without auth → redirects to login

### T-005: Add Role Configuration and Context
**Description:** Define role types (admin, manager, teacher) and create auth context provider for accessing user role throughout the app.

**Acceptance Criteria:**
- [ ] Define TypeScript role types: `admin | manager | teacher`
- [ ] Create React context provider exposing current user and role
- [ ] Role read from `user.user_metadata.role` (configured in Supabase dashboard)
- [ ] Context provides `user`, `role`, `loading`, and `signOut` function
- [ ] Quality checks pass
- [ ] **Verify in browser:** Log in, check role accessible in React DevTools

## Functional Requirements

- FR-1: The system must allow users to request a magic link by entering their email address
- FR-2: When a user enters an email, the system must send a magic link to that email via Supabase Auth
- FR-3: When a user clicks the magic link, the system must authenticate the session and redirect to the dashboard
- FR-4: The system must display all auth-related messages (errors, success, instructions) in Hebrew
- FR-5: The system must protect dashboard routes by checking for valid session
- FR-6: When an unauthenticated user accesses a protected route, the system must redirect to `/login`
- FR-7: The system must persist auth session across page refreshes using cookies
- FR-8: The system must expose user role (admin, manager, teacher) via React context for authorization checks
- FR-9: The system must store role in `user.user_metadata.role` (assigned via Supabase dashboard, not in database schema)

## Non-Goals (Out of Scope)

- No user registration UI (admin creates users directly in Supabase dashboard)
- No password-based authentication
- No social authentication providers (Google, GitHub, etc.)
- No role management UI (roles assigned manually via Supabase dashboard)
- No database migrations or schema changes
- No email template customization (use Supabase default templates)
- No "remember me" functionality (session timeout uses Supabase defaults)
- No multi-factor authentication (MFA)

## Technical Considerations

- **No Database Changes:** Role stored in Supabase `user_metadata`, not in custom database tables
- **TanStack Start Integration:** Use TanStack Start's file-based routing and server functions
- **Hebrew RTL Support:** Leverage existing RTL configuration from project initialization
- **Environment Variables:** Requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- **Email Delivery:** Relies on Supabase's built-in email service (configure SMTP in Supabase dashboard if needed)
- **Session Storage:** Use Supabase's cookie-based session management for SSR compatibility

## Success Metrics

- User can receive and click magic link to authenticate in <30 seconds
- Protected routes reliably redirect unauthenticated users to login
- Session persists across page refreshes without re-authentication
- All error messages display in Hebrew with proper RTL formatting
- Auth flow completes end-to-end without console errors

## Open Questions

- Should session timeout be customized, or use Supabase default (1 hour)?
- Should there be a logout button in the UI, or rely on session expiration?
- Should the login page include instructions for requesting a magic link in Hebrew?

---

**Estimated Completion Time:** 2-4 hours
**Dependencies:** TanStack Start project initialized, Supabase project created with environment variables configured
