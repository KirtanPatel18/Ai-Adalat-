import { NextResponse } from "next/server";
import type { AdminSupabaseClient } from "../lib";
import {
  createSupabaseClient,
  errorResponse,
  forbiddenResponse,
  isAdminUser,
  unauthorizedResponse,
} from "../lib";

type EvalRunRequestBody = {
  dataset_id: string;
  models: string[];
};

type EvalRunInsertData = {
  id: string;
};

type EvalRunInsertQueryResult = {
  data: EvalRunInsertData | null;
  error: { message?: string } | null;
};

function isEvalRunRequestBody(value: unknown): value is EvalRunRequestBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.dataset_id === "string" &&
    Array.isArray(candidate.models) &&
    candidate.models.length > 0 &&
    candidate.models.every((model) => typeof model === "string" && model.length > 0)
  );
}

function badRequestResponse(message: string) {
  return errorResponse(400, "bad_request", message, null);
}

function internalErrorResponse() {
  return errorResponse(500, "internal_error", "Failed to queue eval run", null);
}

export async function handleAdminEvalRun(
  supabase: AdminSupabaseClient,
  body: unknown,
  now = new Date(),
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedResponse();
  }

  if (!isAdminUser(user)) {
    return forbiddenResponse();
  }

  if (!isEvalRunRequestBody(body)) {
    return badRequestResponse("Invalid eval run payload");
  }

  const insertResult = (await supabase
    .from("eval_runs")
    .insert({
      run_name: `${body.dataset_id}-${now.toISOString()}`,
      eval_type: "per_llm_dashboard",
      config: {
        dataset_id: body.dataset_id,
        models: body.models,
      },
      run_by: user.id ?? null,
      status: "running",
    })
    .select("id")
    .single()) as EvalRunInsertQueryResult;

  if (insertResult.error || !insertResult.data?.id) {
    return internalErrorResponse();
  }

  return NextResponse.json({ run_id: insertResult.data.id }, { status: 202 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const supabase = await createSupabaseClient();
    return handleAdminEvalRun(supabase, body);
  } catch (error) {
    return errorResponse(
      500,
      "internal_error",
      error instanceof Error ? error.message : "Unknown error",
      process.env.NODE_ENV === "development" && error instanceof Error ? error.stack ?? null : null,
    );
  }
}