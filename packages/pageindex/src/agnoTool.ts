import { PageIndexNodeId, SnapshotId } from "@trionic/shared";

import { search } from "./search";
import { descend } from "./descend";
import { getText } from "./getText";

// Structure for descend() response
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
 * Locked contract from API_CONTRACTS.md
 */
export const pageindex = {
  /**
   * Search indexed legal nodes
   */
  search: async ({
    query,
    scope,
    top_k = 5
  }: SearchArgs): Promise<SearchResult[]> => {
    console.log(`[PageIndex] Searching for: "${query}"`);

    const results = search(query);

    return results.slice(0, top_k);
  },

  /**
   * Traverse act tree hierarchy
   */
  descend: async ({
    node_id
  }: DescendArgs): Promise<{ children: TreeNode[] }> => {
    console.log(`[PageIndex] Descending into: ${node_id}`);

    return {
      children: descend(node_id)
    };
  },

  /**
   * Retrieve full node text
   */
  get_text: async ({
    node_id
  }: GetTextArgs): Promise<{ text: string; snapshot_id: SnapshotId } | null> => {
    console.log(`[PageIndex] Fetching text for: ${node_id}`);

    const result = getText(node_id);

    if (!result) {
      return null;
    }

    return result;
  }
};