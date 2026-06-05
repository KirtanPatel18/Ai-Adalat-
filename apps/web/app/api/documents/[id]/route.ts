import { NextResponse } from "next/server";

interface PatchPayload {
  content: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // The frontend sends `content`, which will eventually map to `body_markdown`
    const payload: PatchPayload = {
      content: body.content,
    };

    // Mock network delay (simulate DB update)
    await new Promise((resolve) => setTimeout(resolve, 800));

    console.log(`[Mock API] Autosaved document ${id}:`, payload.content?.slice(0, 50) + "...");

    return NextResponse.json({ success: true, id, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Failed to patch document", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
