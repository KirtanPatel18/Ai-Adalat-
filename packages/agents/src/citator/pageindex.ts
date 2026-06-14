import type { PageIndexNodeId, SnapshotId } from "@trionic/shared";
import { getPageIndex } from "@trionic/pageindex";

export class NodeNotFoundError extends Error {
  constructor(node_id: PageIndexNodeId) {
    super(`PageIndex node not found: ${node_id}`);
    this.name = "NodeNotFoundError";
  }
}

export type PageIndexNode = {
  node_id: PageIndexNodeId;
  snapshot_id: SnapshotId;
  text: string;
};

/**
 * Citator PageIndex adapter.
 * Calls the real pageindex.get_text tool from @trionic/pageindex.
 * If the node does not exist (returns null), throws NodeNotFoundError.
 */
export async function get_text(node_id: PageIndexNodeId): Promise<PageIndexNode> {
  const result = await getPageIndex().get_text({ node_id });

  if (!result) {
    throw new NodeNotFoundError(node_id);
  }

  return {
    node_id,
    snapshot_id: result.snapshot_id,
    text: result.text,
  };
}
