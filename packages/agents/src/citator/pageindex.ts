import type { PageIndexNodeId, SnapshotId } from "@trionic/shared";

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
 * Stubbed PageIndex client for the Citator-Gatekeeper.
 *
 * Week 2: wire this to the real Team D pageindex.get_text tool.
 */
export async function get_text(node_id: PageIndexNodeId): Promise<PageIndexNode> {
  throw new NodeNotFoundError(node_id);
}
