import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { User } from "@trionic/shared";

function getSupabaseClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((cookie: { name: string; value: string }) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Can be ignored when called from Server Components or route handlers
        }
      },
    },
  });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseClient(cookieStore);

    // Fetch the authenticated user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Attempt to query Om Patel's users table
    try {
      const { data: profile, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!dbError && profile) {
        return NextResponse.json(profile);
      }
      
      console.warn(
        "Could not find user profile in DB, falling back to auth metadata:",
        dbError?.message
      );
    } catch (dbQueryException) {
      console.warn(
        "Users table query threw an exception, falling back to auth metadata:",
        dbQueryException
      );
    }

    // Fallback: Construct User record from Supabase Auth metadata
    const fallbackUser: User = {
      id: user.id,
      email: user.email ?? "",
      display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || null,
      default_language: (user.user_metadata?.default_language || "en") as User["default_language"],
      onboarded_at: user.user_metadata?.onboarded_at || null,
      created_at: user.created_at,
    };

    return NextResponse.json(fallbackUser);
  } catch (error) {
    console.error("GET /api/users/me server error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseClient(cookieStore);

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { display_name, default_language, onboarded } = body;

    const updateData: Record<string, unknown> = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (default_language !== undefined) updateData.default_language = default_language;
    if (onboarded === true) updateData.onboarded_at = new Date().toISOString();

    // 1. Attempt to update the users table in PostgreSQL database
    let profileUpdated = false;
    let updatedProfile = null;

    try {
      const { data, error: dbError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user.id)
        .select()
        .single();

      if (!dbError && data) {
        updatedProfile = data;
        profileUpdated = true;
      } else {
        console.warn("Database users table update unsuccessful:", dbError?.message);
      }
    } catch (dbUpdateException) {
      console.warn("Database users table update threw an exception:", dbUpdateException);
    }

    // 2. Persist to auth user metadata so the fallback session matches
    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: {
        ...updateData,
      },
    });

    if (authUpdateError) {
      console.warn("Failed to update auth user metadata:", authUpdateError.message);
    }

    if (profileUpdated && updatedProfile) {
      return NextResponse.json(updatedProfile);
    }

    // Fallback: Construct updated User record from payload and session
    const fallbackUser: User = {
      id: user.id,
      email: user.email ?? "",
      display_name: display_name !== undefined ? display_name : (user.user_metadata?.display_name || null),
      default_language: default_language !== undefined ? default_language : (user.user_metadata?.default_language || "en"),
      onboarded_at: onboarded === true ? new Date().toISOString() : (user.user_metadata?.onboarded_at || null),
      created_at: user.created_at,
    };

    return NextResponse.json(fallbackUser);
  } catch (error) {
    console.error("PATCH /api/users/me server error:", error);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
