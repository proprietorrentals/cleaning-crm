# AI Workforce Phase 1

## Architecture Overview

AI Workforce is an internal Super Admin feature in ServiceOS for controlled AI-assisted drafting.

- Protected routes live under `/super-admin/(protected)` and inherit Super Admin authorization.
- UI uses a shared Super Admin shell and a reusable employee workspace component.
- AI generation is executed server-side through a provider abstraction.
- Every generated result is treated as draft content requiring human approval.

## Routes

- `/super-admin/ai-workforce`
- `/super-admin/ai-workforce/sales-manager`
- `/super-admin/ai-workforce/marketing-manager`
- API: `/api/super-admin/ai-workforce/generate`

## Database Tables

Migration: `supabase/migrations/20260716002000_ai_workforce_phase1.sql`

- `public.ai_employees`
- `public.ai_conversations`
- `public.ai_messages`
- `public.ai_tasks`
- `public.ai_saved_content`

Includes:

- RLS on all AI Workforce tables
- Super Admin-only policies using `public.is_super_admin()`
- Indexes for employee, status, and created-at query patterns
- Updated-at trigger handling
- Idempotent seed data for six AI employees

## Environment Variables

- `AI_PROVIDER` (`openai`, `anthropic`, or unset for mock)
- `AI_MODEL`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

No secrets are exposed to client components.

## Authorization Approach

- Super Admin protected layout enforces `requireSuperAdminAccess()` for all `/super-admin/(protected)` routes.
- API route verifies Super Admin access before processing generation requests.
- Database tables enforce RLS with Super Admin-only access policies.

## Provider Abstraction

Server-only abstraction in `src/lib/ai/provider.ts`:

- Shared provider interface
- OpenAI implementation
- Anthropic implementation
- Safe mock fallback when keys/provider are missing

Mock responses are visibly labeled as development output.

## Current Limitations

- Phase 1 workspaces are active only for Sales Manager and Marketing Manager.
- Remaining AI employees are listed as Coming Soon.
- Generated output is draft content and does not execute external actions.

## Human Approval Rules

Approval states used in UI and schema:

- Draft
- Awaiting Approval
- Approved
- Rejected
- Completed

Phase 1 does not perform automatic email sending, social posting, calling, lead scraping, billing changes, or destructive account actions.

## Planned Phase 2 Integrations

- Persisted conversation and task workflows connected to production AI Workforce tables.
- Approval queue integration with internal review workflows.
- Additional employee workspaces: Lead Researcher, Customer Success Manager, Operations Manager, and Voice Representative.
- Optional provider enhancements, telemetry, and usage reporting.
