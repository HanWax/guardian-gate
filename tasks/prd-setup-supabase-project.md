# PRD: Setup Supabase Project

## Introduction

Establish the foundation for backend services by creating and configuring a Supabase project. This enables the TanStack Start application to connect to a hosted Postgres database with real-time capabilities, unblocking all future work on authentication, data storage, and API development.

## Goals

- Create a new Supabase project in the cloud dashboard
- Configure secure connection between local development environment and Supabase
- Document environment configuration for team collaboration
- Verify successful connectivity with testable health check

## Tasks

### T-001: Create Supabase Project and Obtain Credentials
**Description:** Create a new Supabase project through the dashboard and collect the required API keys and URL for connection configuration.

**Acceptance Criteria:**
- [ ] New Supabase project created with name "rolecall-mvp" or similar
- [ ] Project URL obtained from project settings
- [ ] Anon (public) API key obtained from project settings
- [ ] Service role key noted (but not used yet) for future admin operations
- [ ] Project region selected (choose closest to target users)

### T-002: Configure Environment Variables
**Description:** Set up local environment configuration files with Supabase credentials, ensuring secrets are not committed to version control.

**Acceptance Criteria:**
- [ ] `.env.local` file created with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] `.env.local.example` file created with placeholder values and documentation
- [ ] `.env.local` added to `.gitignore` (verify not tracked by git)
- [ ] Environment variables use correct naming convention for Vite (VITE_ prefix)
- [ ] Documentation includes instructions for other developers to set up their own `.env.local`

### T-003: Install Supabase Client Library
**Description:** Add the official Supabase JavaScript client library to the project dependencies.

**Acceptance Criteria:**
- [ ] `@supabase/supabase-js` package installed via npm/pnpm/yarn
- [ ] Package appears in `package.json` dependencies
- [ ] Lock file updated
- [ ] No installation errors or peer dependency warnings

### T-004: Initialize Supabase Client
**Description:** Create a centralized Supabase client instance that can be imported throughout the application.

**Acceptance Criteria:**
- [ ] Client initialization file created (e.g., `src/lib/supabase.ts` or `src/utils/supabase.ts`)
- [ ] Client configured with environment variables
- [ ] Client exported for use in other modules
- [ ] TypeScript types properly configured (if using TypeScript)
- [ ] File follows existing codebase patterns and conventions

### T-005: Implement and Verify Connection Test
**Description:** Create a simple test or health check endpoint/page that verifies the Supabase connection works correctly.

**Acceptance Criteria:**
- [ ] Test route or component created that attempts to connect to Supabase
- [ ] Test performs a simple operation (e.g., query public schema or check connection status)
- [ ] Success/failure state clearly displayed
- [ ] Connection verified working in local development environment
- [ ] **Verify in browser**: Navigate to test page and confirm successful connection message

## Functional Requirements

- FR-1: The system must connect to a cloud-hosted Supabase project
- FR-2: The system must load Supabase credentials from environment variables prefixed with `VITE_` for Vite compatibility
- FR-3: The system must expose a reusable Supabase client instance for use throughout the application
- FR-4: The system must prevent committing API keys or secrets to version control
- FR-5: The system must provide a verifiable way to test the Supabase connection

## Non-Goals (Out of Scope)

- Creating any database tables or schema
- Implementing authentication flows
- Setting up Row Level Security (RLS) policies
- Configuring production deployment or environment-specific settings
- Implementing any actual data queries beyond connection verification
- Setting up Supabase Edge Functions
- Configuring Storage buckets
- Setting up real-time subscriptions

## Technical Considerations

**Dependencies:**
- Requires existing TanStack Start project (already initialized per context)
- Requires Supabase account (free tier sufficient for MVP)

**Integration Points:**
- Vite environment variables (`import.meta.env`)
- TanStack Start routing (for test page if needed)

**Security:**
- Use anon key for client-side operations (safe to expose)
- Never commit service role key to repository
- Service role key grants admin access - store securely if needed later

**Performance:**
- Connection should be initialized once and reused (singleton pattern)
- Consider lazy initialization if needed for performance

## Success Metrics

- Connection test successfully queries Supabase without errors
- Other developers can clone repo and connect with their own `.env.local` in <5 minutes
- Zero API keys or secrets committed to git history
- Foundation ready for subsequent auth and database work

## Open Questions

- None - all requirements are clear and scoped appropriately for initial setup
