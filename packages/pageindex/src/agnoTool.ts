import { PageIndexNodeId, SnapshotId } from "@trionic/shared";
import { search as localSearch } from "./search.js";
import { descend as localDescend } from "./descend.js";
import { getText as localGetText } from "./getText.js";

// Structure for the descend() method response.
export interface TreeNode {
  node_id: PageIndexNodeId;
  title: string;
  has_children: boolean;
}

export interface SearchArgs {
  query: string;
  scope?: string[];
  top_k?: number;
}

export interface SearchResult {
  node_id: PageIndexNodeId;
  snippet: string;
  score: number;
}

export interface DescendArgs {
  node_id: PageIndexNodeId;
}

export interface GetTextArgs {
  node_id: PageIndexNodeId;
}

/**
 * PageIndex Tool Surface for Agents
 * This is the exact contract defined in docs/API_CONTRACTS.md
 * and consumed by packages/evals for the citation validity harness.
 */
export const pageindex = {
  /**
   * Search across indexed acts.
   * Returns top-k { node_id, snippet, score } ordered by score.
   */
  search: async ({ query, scope, top_k = 5 }: SearchArgs): Promise<SearchResult[]> => {
    console.log(`[PageIndex] Searching for: "${query}" (top_k: ${top_k})`);

    const rawResults = localSearch(query);
    const results: SearchResult[] = rawResults.map((r) => ({
      node_id: r.node_id as PageIndexNodeId,
      snippet: r.snippet,
      score: r.score,
    }));

    return results.slice(0, top_k);
  },

  /**
   * Traverse down the act tree structure.
   */
  descend: async ({ node_id }: DescendArgs): Promise<{ children: TreeNode[] }> => {
    console.log(`[PageIndex] Descending into node: ${node_id}`);

    const rawChildren = localDescend(node_id) || [];
    const children: TreeNode[] = rawChildren.map((child: any) => ({
      node_id: child.node_id as PageIndexNodeId,
      title: child.title || "",
      has_children: !!(child.children && child.children.length > 0),
    }));

    return { children };
  },

  /**
   * Retrieve the full text and snapshot ID of a specific node.
   * As per the evals team contract, this MUST return null if the node_id is invalid/hallucinated.
   */
  get_text: async ({ node_id }: GetTextArgs): Promise<{ text: string; snapshot_id: SnapshotId } | null> => {
    console.log(`[PageIndex] Fetching text for node: ${node_id}`);

    const found = localGetText(node_id);
    if (!found) {
      return null;
    }

    return {
      text: found.text,
      snapshot_id: found.snapshot_id as SnapshotId,
    };
  },
};
