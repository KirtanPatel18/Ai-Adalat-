import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { DraftRequest, AgentStreamEvent, DraftResponse } from "@trionic/shared";
import { runAgentChain } from "@trionic/agents";

export const runtime = "nodejs";
export const maxDuration = 300; // Allow 5 minutes since agents take time

export async function POST(req: Request) {
  let supabase;
  try {
    supabase = createRouteHandlerClient({ cookies });
  } catch (err) {
    return NextResponse.json({ error: "Supabase client initialization failed" }, { status: 500 });
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let draftReq: DraftRequest;
  try {
    draftReq = await req.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!draftReq?.document_id) {
    return NextResponse.json({ error: "Missing document_id" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const generator = runAgentChain(draftReq);

  const stream = new ReadableStream({
    async start(controller) {
      // Abort agent chain if client disconnects
      req.signal.addEventListener("abort", () => {
        generator.return(undefined).catch(() => {});
      });

      try {
        for await (const event of generator) {
          if (req.signal.aborted) {
            break;
          }

          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));

          if (event.type === "draft.final") {
            // Write new DocumentVersion row
            // Get current max version number
            const { data: latestVersion } = await supabase
              .from("document_versions")
              .select("version_number")
              .eq("document_id", draftReq.document_id)
              .order("version_number", { ascending: false })
              .limit(1)
              .single();

            const nextVersion = (latestVersion?.version_number || 0) + 1;

            const snapshotIds = Array.from(new Set(event.response.citations.map(c => c.snapshot_id)));
            const agentTraceId = event.response.trace_ids.length > 0 ? event.response.trace_ids[event.response.trace_ids.length - 1] : null;
            
            const rowData: any = {
              document_id: draftReq.document_id,
              version_number: nextVersion,
              content_md: event.response.body_markdown,
              is_agent_draft: true,
              created_by: session.user.id,
              snapshot_ids: snapshotIds,
            };
            if (agentTraceId) rowData.agent_trace_id = agentTraceId;

            await supabase.from("document_versions").insert(rowData);

            // Update document status to final
            await supabase.from("documents")
              .update({ status: "final" })
              .eq("id", draftReq.document_id);

            controller.close();
            break;
          } else if (event.type === "step.error") {
            // Update status to failed
            await supabase.from("documents")
              .update({ status: "failed" })
              .eq("id", draftReq.document_id);

            controller.close();
            break;
          }
        }
      } catch (err) {
        console.error("Agent chain error:", err);
        const errorEvent: AgentStreamEvent = {
          type: "step.error",
          agent: "system" as any, // fallback or safe cast since it's an unexpected error
          message: err instanceof Error ? err.message : String(err),
          ts: new Date().toISOString()
        };
        const data = `data: ${JSON.stringify(errorEvent)}\n\n`;
        controller.enqueue(encoder.encode(data));

        await supabase.from("documents")
          .update({ status: "failed" })
          .eq("id", draftReq.document_id);
          
        controller.close();
      }
    },
    cancel() {
      generator.return(undefined).catch(() => {});
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
