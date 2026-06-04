/**
 * packages/db/src/index.ts
 * Entry point for @trionic/db
 * Usage: import { supabase, supabaseAdmin } from '@trionic/db'
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type { Database } from './types';
export * from './types';

// ---------------------------------------------------------------------------
// Public (anon) client — safe for use in browser / Next.js server components
// Uses RLS for row-level access control
// ---------------------------------------------------------------------------
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ---------------------------------------------------------------------------
// Admin (service role) client — SERVER ONLY. Never expose to the client bundle.
// Bypasses RLS — used by API routes and agent pipelines.
// ---------------------------------------------------------------------------
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);