import { PageIndexNodeId, SnapshotId } from "@trionic/shared";
import { search, descend, get_text } from "./query.js";

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

export const pageindex = {
  search: async ({
    query,
    scope,
    top_k = 5
  }: SearchArgs): Promise<SearchResult[]> => {
    console.log(`[PageIndex] Searching for: "${query}"`);
    
    // Parse scope array into SearchScope object
    const searchScope: any = {};
    if (scope && scope.length > 0) {
      for (const item of scope) {
        if (item === "CRPC-1973" || item === "IPC-1860" || item === "RTI-2005" || item === "ICA-1872") {
          searchScope.act_code = item;
        } else if (["act", "part", "chapter", "section", "sub_section", "clause"].includes(item)) {
          searchScope.level = item;
        }
      }
    }

    const results = await search(query, searchScope);

    return results.slice(0, top_k).map(r => ({
      node_id: r.node.node_id as PageIndexNodeId,
      snippet: r.node.text || r.node.title,
      score: r.relevance
    }));
  },

  descend: async ({
    node_id
  }: DescendArgs): Promise<{ children: TreeNode[] }> => {
    console.log(`[PageIndex] Descending into: ${node_id}`);
    const childrenNodes = await descend(node_id);
    return {
      children: childrenNodes.map(c => ({
        node_id: c.node_id as PageIndexNodeId,
        title: c.title,
        has_children: c.children_ids.length > 0
      }))
    };
  },

  get_text: async ({
    node_id
  }: GetTextArgs): Promise<{ text: string; snapshot_id: SnapshotId } | null> => {
    console.log(`[PageIndex] Fetching text for: ${node_id}`);
    try {
      const node = await get_text(node_id);
      return {
        text: node.text,
        snapshot_id: node.snapshot_id as SnapshotId
      };
    } catch (err) {
      return null;
    }
  }
};