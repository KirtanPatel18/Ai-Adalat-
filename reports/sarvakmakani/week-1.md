# Week 1 — Sarvak Makani (@sarvakmakani)

## Deliverable
Drafted and opened Draft PR #70 for RFC-auth-onboarding (Issue #4). The RFC 
covers Supabase Auth email/password for v1, session handling with @supabase/ssr 
in Next.js 15 App Router, route protection via middleware, 3-step onboarding 
wizard, public.users table schema, and RLS policies.

## PR / Commit links
- PR: https://github.com/Trionic-Interns/trionic-ai-adalat/pull/70
- Commit: https://github.com/Trionic-Interns/trionic-ai-adalat/commit/b193897

## Demo
[Add Loom link here after recording — see below]

## Metrics
- RFC covers 6 protected routes, 1 DB table, 2 RLS policies, 3-step onboarding 
  wizard, 7 files to be created in Week 2

## Blockers
- Waiting on Om Patel (Backend) to confirm where the users insert trigger lives 
  in packages/db migrations
- Waiting on RFC review/approval from Sohil before marking PR ready for review

## Plan for Week 2
- Implement login + signup pages using shadcn/ui Form + Supabase browser client
