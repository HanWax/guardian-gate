# PRD: Initialize TanStack Start Project for GuardianGate

## Introduction

Set up the foundational TanStack Start project for GuardianGate, a child safety check-in system for Israeli nurseries. This establishes the technical foundation with TypeScript, Hebrew RTL support, and Supabase integration that all subsequent features will build upon.

## Goals

- Create a working TanStack Start application with TypeScript
- Configure proper Hebrew RTL layout support throughout the app
- Integrate Supabase client for database and auth connectivity
- Establish a clean project structure for future feature development
- Ensure the project is ready for Vercel deployment

## Tasks

### T-001: Initialize TanStack Start project
**Description:** Create a new TanStack Start project with TypeScript configuration.

**Acceptance Criteria:**
- [ ] Project created using TanStack Start starter template
- [ ] TypeScript configured with strict mode
- [ ] `npm run dev` starts the development server successfully
- [ ] `npm run build` completes without errors
- [ ] Basic index route renders "GuardianGate" text

### T-002: Configure Hebrew RTL support
**Description:** Set up the application for Hebrew right-to-left text direction with appropriate fonts.

**Acceptance Criteria:**
- [ ] HTML `dir="rtl"` and `lang="he"` attributes set
- [ ] Hebrew-friendly font loaded (e.g., Heebo, Assistant, or system Hebrew fonts)
- [ ] CSS configured for RTL layout (logical properties where applicable)
- [ ] Test page with Hebrew text displays correctly right-to-left
- [ ] Verify in browser: Hebrew text renders RTL properly

### T-003: Set up Supabase client
**Description:** Install and configure Supabase client library with environment variables.

**Acceptance Criteria:**
- [ ] `@supabase/supabase-js` installed
- [ ] Environment variables configured (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] `.env.example` file created with placeholder values
- [ ] `.env` added to `.gitignore`
- [ ] Supabase client utility created at `src/lib/supabase.ts`
- [ ] Client exports typed for future use

### T-004: Create base layout structure
**Description:** Establish the root layout with RTL support and basic styling foundation.

**Acceptance Criteria:**
- [ ] Root layout component created with HTML structure
- [ ] Global CSS file with RTL-aware base styles
- [ ] Tailwind CSS configured (if using) with RTL plugin
- [ ] Basic color scheme variables defined (can be adjusted later)
- [ ] Layout renders without console errors
- [ ] Verify in browser: Layout structure correct in RTL

### T-005: Set up project folder structure
**Description:** Create the directory structure for future features.

**Acceptance Criteria:**
- [ ] `src/routes/` - File-based routing (TanStack Start convention)
- [ ] `src/components/` - Reusable UI components
- [ ] `src/lib/` - Utilities and Supabase client
- [ ] `src/types/` - TypeScript type definitions
- [ ] `src/styles/` - Global styles
- [ ] README.md updated with project setup instructions

### T-006: Configure for Vercel deployment
**Description:** Add Vercel-specific configuration for future deployment.

**Acceptance Criteria:**
- [ ] `vercel.json` created with appropriate settings
- [ ] Build output compatible with Vercel
- [ ] Environment variable documentation added to README
- [ ] `.nvmrc` or `engines` field specifies Node version

## Functional Requirements

- FR-1: The application must use TanStack Start as the framework
- FR-2: All text must render right-to-left by default
- FR-3: The Supabase client must be configured but not require a live connection to start the dev server
- FR-4: TypeScript must be in strict mode with no `any` types in foundation code
- FR-5: The project must build successfully for production

## Non-Goals

- No authentication implementation (just Supabase client setup)
- No database schema or migrations
- No UI components beyond basic layout
- No WhatsApp integration
- No actual deployment to Vercel (just configuration)
- No testing setup (can be added later)

## Technical Considerations

- **TanStack Start** is relatively new; use stable patterns from documentation
- **RTL Support:** Use CSS logical properties (`margin-inline-start` vs `margin-left`) where possible for easier RTL
- **Supabase Types:** Will be generated from schema later; for now use placeholder types
- **Font Loading:** Consider performance; prefer `font-display: swap`

## Success Metrics

- Developer can clone repo and run `npm install && npm run dev` successfully
- Hebrew text displays correctly without additional configuration
- No TypeScript errors in IDE
- Build completes in under 60 seconds

## Open Questions

- Preferred Hebrew font family? (Defaulting to Heebo for readability)
- Include Tailwind CSS or plain CSS? (Assuming Tailwind based on modern stack)
- Preferred package manager? (Assuming npm for simplicity)
