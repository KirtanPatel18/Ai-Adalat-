import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export type AdminUser = {
  id?: string;
  user_metadata?: { role?: string | null } | null;
  app_metadata?: { role?: string | null } | null;
} | null;

export interface AdminSupabaseClient {
  auth: {
    getUser: () => Promise<{
      data: { user: AdminUser };
      error: { message?: string } | null;
    }>;
  };
  from(table: "agent_traces"): {
    select: (columns: string) => {
      gte: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<TraceQueryResult>;
      };
    };
  };
  from(table: "eval_runs"): {
    insert: (
      values: Record<string, unknown>,
    ) => {
      select: (columns: string) => {
        single: () => Promise<EvalRunInsertQueryResult>;
      };
    };
  };
}

export type TraceRow = {
  model?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  cost_usd?: number | null;
  latency_ms?: number | null;
  timestamp?: string | null;
};

export type TraceQueryResult = {
  data: TraceRow[] | null;
  error: { message?: string } | null;
};

type EvalRunInsertRow = {
  id: string;
};

type EvalRunInsertQueryResult = {
  data: EvalRunInsertRow | null;
  error: { message?: string } | null;
};

export const WINDOW_DAYS = 14;
export const WINDOW_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

export function isAdminUser(user: AdminUser | undefined): boolean {
  const role = user?.user_metadata?.role ?? user?.app_metadata?.role;
  return role === "admin";
}

export function errorResponse(
  status: 400 | 401 | 403 | 500,
  error: string,
  message: string,
  details: string | null = null,
) {
  return NextResponse.json({ error, message, details }, { status });
}

export function unauthorizedResponse() {
  return errorResponse(401, "unauthorized", "No active Supabase session", null);
}

export function forbiddenResponse() {
  return errorResponse(403, "forbidden", "Admin role required", null);
}

export async function createSupabaseClient(): Promise<AdminSupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const mod: any = await import("@supabase/auth-helpers-nextjs").catch(() => null);

  if (mod && typeof mod.createRouteHandlerClient === "function") {
    return mod.createRouteHandlerClient({ headers, cookies }) as unknown as AdminSupabaseClient;
  }

  throw new Error("Supabase auth helper 'createRouteHandlerClient' not available");
}
