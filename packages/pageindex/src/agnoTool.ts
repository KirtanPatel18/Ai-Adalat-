/**
 * packages/pageindex/src/agnoTool.ts
 * ---------------------------------------------------------------------------
 * The PageIndex tool surface consumed by Team C (Agents).
 * Owner: DarshitSorathiya (PageIndex / Team D)
 *
 * Exposes three functions:
 *   pageindex.search()    - semantic search over Article/Schedule text
 *   pageindex.descend()   - tree traversal (node -> children)
 *   pageindex.get_text()  - fetch full text of one node by ID
 *
 * Local change: get_text() now reads the local PageIndex trees (query.ts)
 * and returns null when the node does not exist, so the Citator rejects
 * citations that cannot be resolved.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { get_text as localGetText } from "./query.js";
import { NodeNotFoundError } from "./errors.js";

// --- Types (inline, mirrors pageindex_nodes table) --------------------------

export type PageIndexNodeId = string; // "COI-1950/PART-III/ART-19"
export type SnapshotId = string; // "YYYY-MM-DD"

export interface SearchResult {
  node_id: PageIndexNodeId;
  snapshot_id: SnapshotId;
  /** Short excerpt of the matching text (max ~400 chars). */
  snippet: string;
  /** Cosine similarity score, 0-1. Higher = more relevant. */
  score: number;
}

export interface TreeNode {
  node_id: PageIndexNodeId;
  node_type:
    | "act"
    | "part"
    | "article"
    | "clause"
    | "schedule"
    | "schedule_entry";
  label: string; // e.g. "Article 19 - Protection of certain rights..."
  has_children: boolean;
  sort_order: number;
}

export interface NodeText {
  text: string;
  snapshot_id: SnapshotId;
}

export interface SearchParams {
  /** Natural-language query string. Will be embedded before search. */
  query: string;
  /**
   * Optional scope to narrow search.
   * Examples: "COI-1950/PART-III" (Fundamental Rights only)
   *           "COI-1950/SCH-1"    (First Schedule only)
   */
  scope?: PageIndexNodeId;
  /** Number of results to return. Default 5, max 20. */
  top_k?: number;
  /** Snapshot to search in. Defaults to latest. */
  snapshot_id?: SnapshotId;
}

export interface DescendParams {
  node_id: PageIndexNodeId;
  /** Snapshot to query. Defaults to latest. */
  snapshot_id?: SnapshotId;
}

export interface GetTextParams {
  node_id: PageIndexNodeId;
  /** Snapshot to query. Defaults to latest. */
  snapshot_id?: SnapshotId;
}

// --- Internal DB row shape ---------------------------------------------------

interface PageIndexRow {
  id: string;
  snapshot_id: string;
  parent_id: string | null;
  node_type: string;
  part_code: string | null;
  part_name: string | null;
  article_number: string | null;
  article_title: string | null;
  clause_number: string | null;
  schedule_number: number | null;
  schedule_title: string | null;
  text_content: string;
  sort_order: number;
  embedding: number[] | null;
  similarity?: number; // injected by pgvector RPC
}

// --- PageIndex class ---------------------------------------------------------

export class PageIndex {
  private supabase: SupabaseClient;
  private openaiApiKey: string;
  private latestSnapshotId: SnapshotId | null = null;

  constructor(supabaseUrl: string, supabaseKey: string, openaiApiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openaiApiKey = openaiApiKey;
  }

  // --- Public API ------------------------------------------------------------

  /**
   * Semantic search over Constitution text.
   * Used by the Drafter agent to find relevant Articles before writing.
   *
   * @example
   *   const results = await pageindex.search({
   *     query: "right to information government records",
   *     scope: "COI-1950/PART-III",
   *     top_k: 5,
   *   });
   */
  async search(params: SearchParams): Promise<SearchResult[]> {
    const { query, scope, top_k = 5, snapshot_id } = params;
    const k = Math.min(top_k, 20);

    const snapshotId = snapshot_id ?? (await this.getLatestSnapshotId());
    if (!snapshotId) {
      throw new Error(
        "PageIndex: no snapshots found. Run the ingestion script first.",
      );
    }

    // Embed the query
    const queryEmbedding = await this.embed(query);

    // Call Supabase RPC for vector similarity search
    const { data, error } = await this.supabase.rpc("pageindex_search", {
      query_embedding: queryEmbedding,
      p_snapshot_id: snapshotId,
      p_scope: scope ?? null,
      p_top_k: k,
    });

    if (error) {
      throw new Error(`PageIndex search RPC failed: ${error.message}`);
    }

    return (data as PageIndexRow[]).map((row) => ({
      node_id: row.id,
      snapshot_id: row.snapshot_id,
      snippet: this.makeSnippet(row),
      score: row.similarity ?? 0,
    }));
  }

  /**
   * Return direct children of a node (tree traversal).
   * Used by the Drafter to drill into a Part -> Articles, or Article -> Clauses.
   *
   * @example
   *   const children = await pageindex.descend({ node_id: "COI-1950/PART-III" });
   *   // -> [ { node_id: "COI-1950/PART-III/ART-12", label: "Article 12...", ... }, ... ]
   */
  async descend(params: DescendParams): Promise<{ children: TreeNode[] }> {
    const { node_id, snapshot_id } = params;
    const snapshotId = snapshot_id ?? (await this.getLatestSnapshotId());

    const { data, error } = await this.supabase
      .from("pageindex_nodes")
      .select(
        "id, node_type, article_number, article_title, clause_number, schedule_number, schedule_title, part_name, sort_order, parent_id, snapshot_id",
      )
      .eq("parent_id", node_id)
      .eq("snapshot_id", snapshotId)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(`PageIndex descend failed: ${error.message}`);
    }

    const rows = data as PageIndexRow[];

    // Check which nodes have children (one extra query)
    const childIds = rows.map((r) => r.id);
    const { data: grandchildren } =
      childIds.length > 0
        ? await this.supabase
            .from("pageindex_nodes")
            .select("parent_id")
            .in("parent_id", childIds)
        : { data: [] };

    const hasChildSet = new Set(
      (grandchildren ?? []).map((r: { parent_id: string }) => r.parent_id),
    );

    return {
      children: rows.map((row) => ({
        node_id: row.id,
        node_type: row.node_type as TreeNode["node_type"],
        label: this.makeLabel(row),
        has_children: hasChildSet.has(row.id),
        sort_order: row.sort_order,
      })),
    };
  }

  /**
   * Fetch the full text of a single node from the local PageIndex trees.
   * Used by the Citator to validate that a cited node actually exists.
   * Returns null when the node is not found, so the Citator rejects it.
   *
   * @example
   *   const res = await pageindex.get_text({ node_id: "NI-1881/S-138" });
   *   if (res) console.log(res.text, res.snapshot_id);
   */
  async get_text(params: GetTextParams): Promise<NodeText | null> {
    const { node_id } = params;
    try {
      const node = await localGetText(node_id);
      return { text: node.text, snapshot_id: node.snapshot_id };
    } catch (err) {
      if (err instanceof NodeNotFoundError) return null;
      throw err;
    }
  }

  // --- Private helpers -------------------------------------------------------

  private async getLatestSnapshotId(): Promise<SnapshotId | null> {
    if (this.latestSnapshotId) return this.latestSnapshotId;

    const { data, error } = await this.supabase
      .from("pageindex_snapshots")
      .select("id")
      .eq("act_code", "COI-1950")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    this.latestSnapshotId = (data as { id: string }).id;
    return this.latestSnapshotId;
  }

  private async embed(text: string): Promise<number[]> {
    if (this.openaiApiKey === "dummy-key") {
      return Array(1536).fill(0.0);
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 2048), // hard cap
        encoding_format: "float",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI embed failed: ${err}`);
    }

    const json = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    return json.data[0].embedding;
  }

  private makeSnippet(row: PageIndexRow): string {
    const parts: string[] = [];
    if (row.article_number && row.article_title) {
      parts.push(`Art. ${row.article_number} - ${row.article_title}`);
    } else if (row.schedule_number) {
      parts.push(`Schedule ${row.schedule_number}`);
    }
    parts.push(row.text_content.slice(0, 300));
    return parts.join(": ").trim();
  }

  private makeLabel(row: PageIndexRow): string {
    if (row.node_type === "article") {
      return `Article ${row.article_number}${row.article_title ? ` - ${row.article_title}` : ""}`;
    }
    if (row.node_type === "clause") {
      return `Article ${row.article_number}(${row.clause_number})`;
    }
    if (row.node_type === "schedule") {
      return `Schedule ${row.schedule_number} - ${row.schedule_title ?? ""}`;
    }
    if (row.node_type === "schedule_entry") {
      return row.text_content.slice(0, 80);
    }
    if (row.node_type === "part") {
      return row.part_name ?? row.id;
    }
    return row.id;
  }
}

// --- Singleton factory (for use by agents) ----------------------------------

let _instance: PageIndex | null = null;

/**
 * Get (or create) the singleton PageIndex instance.
 * Reads credentials from environment variables.
 *
 * @example
 *   import { getPageIndex } from "@trionic/pageindex";
 *   const pageindex = getPageIndex();
 *   const results = await pageindex.search({ query: "right to information" });
 */
export function getPageIndex(): PageIndex {
  if (_instance) return _instance;

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "PageIndex: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set.",
    );
  }
  if (!openaiKey) {
    console.warn(
      "PageIndex: OPENAI_API_KEY is not set. Vector search will return empty results.",
    );
  }

  _instance = new PageIndex(supabaseUrl, supabaseKey, openaiKey || "dummy-key");
  return _instance;
}

// Default export for convenience
export default getPageIndex;
