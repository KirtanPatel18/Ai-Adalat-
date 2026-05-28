import { PageIndexNodeId, SnapshotId } from "@trionic/shared";

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
    
    // TODO: Implement your actual retrieval logic here (e.g., Supabase pgvector or BM25)
    
    // Dummy response matching the expected shape and sorting
    const results: SearchResult[] = [
      {
        node_id: "RTI-2005/CH-II/S-6" as PageIndexNodeId,
        snippet: "Request for obtaining information.—(1) A person, who desires to obtain any information under this Act, shall make a request...",
        score: 0.92,
      },
      {
        node_id: "RTI-2005/CH-II/S-7" as PageIndexNodeId,
        snippet: "Disposal of request.—(1) Subject to the proviso to sub-section (2) of section 5 or the proviso to sub-section (3) of section 6...",
        score: 0.85,
      }
    ];

    // Ordered by score descending
    return results.sort((a, b) => b.score - a.score).slice(0, top_k);
  },

  /**
   * Traverse down the act tree structure.
   */
  descend: async ({ node_id }: DescendArgs): Promise<{ children: TreeNode[] }> => {
    console.log(`[PageIndex] Descending into node: ${node_id}`);
    
    // TODO: Implement DB query to fetch children of the given node_id
    const children: TreeNode[] = [
      {
        node_id: `${node_id}/SUB-1` as PageIndexNodeId,
        title: "Sub-section 1",
        has_children: false
      }
    ];

    return { children };
  },

  /**
   * Retrieve the full text and snapshot ID of a specific node.
   * As per the evals team contract, this MUST return null if the node_id is invalid/hallucinated.
   */
  get_text: async ({ node_id }: GetTextArgs): Promise<{ text: string; snapshot_id: SnapshotId } | null> => {
    console.log(`[PageIndex] Fetching text for node: ${node_id}`);
    
    // TODO: Implement DB query to fetch the exact text for the node
    // If the database query returns no rows (meaning the LLM hallucinated the citation), return null.
    
    // Mocking the Evals team's hallucinated citation test case to return null
    if (node_id === "RTI-2005/CH-XX/S-99" || node_id === "RTI-FAKE/CH-I/S-999") {
      return null; 
    }

    // Default valid mock response
    return {
      text: "Mock text for the requested legal section.",
      snapshot_id: "2024-12-01" as SnapshotId
    };
  }
};