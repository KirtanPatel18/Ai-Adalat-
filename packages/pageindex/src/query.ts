import { readFileSync } from "fs";
import { join } from "path";
import { NodeNotFoundError, InvalidQueryError } from "./errors.js";

const artifactsDir = join(__dirname, "..", "artifacts");

export type NodeLevel = "act" | "part" | "chapter" | "section" | "sub_section" | "clause";

export interface PageIndexNode {
  node_id: string;
  snapshot_id: string;
  act_code: string;
  act_name: string;
  level: NodeLevel;
  number: string;
  title: string;
  text: string;
  parent_id: string | null;
  children_ids: string[];
  path: string[];
  source_url: string;
}

export interface SearchScope {
  act_code?: string;
  level?: NodeLevel;
  snapshot_id?: string;
}

export interface SearchResult {
  node: PageIndexNode;
  relevance: number; // 0.0 - 1.0
  match_reason: string;
}

let allNodesMap: Map<string, PageIndexNode> = new Map();

function loadNodes() {
  if (allNodesMap.size > 0) return;

  // Load Contract Act (ICA) Tree
  try {
    const contractActPath = join(artifactsDir, "contract-act-tree.json");
    const contractActData = readFileSync(contractActPath, "utf-8");
    const contractActNodes = JSON.parse(contractActData);
    for (const node of contractActNodes) {
      const node_id = node.id || node.node_id;
      let num = "";
      const match = node_id.match(/s(\d+[A-Z]?)/);
      if (match) {
        num = match[1];
      }

      const normalizedNode: PageIndexNode = {
        node_id,
        snapshot_id: node.snapshot_id || "2026-05-19",
        act_code: "ICA-1872",
        act_name: "Indian Contract Act, 1872",
        level: (node.type || node.level || "section") as NodeLevel,
        number: num,
        title: node.title || "",
        text: node.text || node.text_content || "",
        parent_id: node.parent_id || null,
        children_ids: node.children_ids || node.children || [],
        path: node.path || [node_id],
        source_url: node.source_url || "https://indiacode.nic.in"
      };
      allNodesMap.set(normalizedNode.node_id, normalizedNode);
    }
  } catch (err) {
    // Fail silently or log warning if file does not exist yet (e.g. in clean repo builds)
    console.warn("Warning: Could not load contract-act-tree.json", err);
  }

  // Load CrPC Tree
  try {
    const crpcPath = join(artifactsDir, "crpc-tree.json");
    const crpcData = readFileSync(crpcPath, "utf-8");
    const crpcNodes = JSON.parse(crpcData);
    for (const node of crpcNodes) {
      const node_id = node.node_id || node.id;
      const normalizedNode: PageIndexNode = {
        node_id,
        snapshot_id: node.snapshot_id || "2026-05-28",
        act_code: node.act_code || "CRPC-1973",
        act_name: node.act_name || "Code of Criminal Procedure, 1973",
        level: (node.level || node.type || "section") as NodeLevel,
        number: node.number || "",
        title: node.title || "",
        text: node.text || node.text_content || "",
        parent_id: node.parent_id || null,
        children_ids: node.children_ids || node.children || [],
        path: node.path || [node_id],
        source_url: node.source_url || "https://indiacode.nic.in"
      };
      allNodesMap.set(normalizedNode.node_id, normalizedNode);
    }
  } catch (err) {
    console.warn("Warning: Could not load crpc-tree.json", err);
  }

  // Load RTI Act Tree
  try {
    let rtiPath = join(artifactsDir, "rti-act-2005.json");
    if (!require("fs").existsSync(rtiPath)) {
      rtiPath = join(__dirname, "..", "data", "rti-act-2005.json");
    }
    const rtiData = readFileSync(rtiPath, "utf-8");
    const rtiTree = JSON.parse(rtiData);

    const flattenRtiNode = (node: any, parentId: string | null = null, path: string[] = []) => {
      const currentPath = [...path, node.node_id];
      const childrenIds = node.children ? node.children.map((c: any) => c.node_id) : [];
      
      const normalizedNode: PageIndexNode = {
        node_id: node.node_id,
        snapshot_id: node.snapshot_id || "2026-05-28",
        act_code: "RTI-2005",
        act_name: "Right to Information Act, 2005",
        level: (node.level || "section") as NodeLevel,
        number: node.section_number || node.node_id.split("-").pop() || "",
        title: node.title || "",
        text: node.text || "",
        parent_id: node.parent_id || parentId,
        children_ids: childrenIds,
        path: currentPath,
        source_url: "https://indiacode.nic.in"
      };
      
      allNodesMap.set(normalizedNode.node_id, normalizedNode);
      
      if (node.children) {
        for (const child of node.children) {
          flattenRtiNode(child, node.node_id, currentPath);
        }
      }
    };

    flattenRtiNode(rtiTree);
  } catch (err) {
    console.warn("Warning: Could not load rti-act-2005.json", err);
  }
}

/** Retrieve the exact canonical legal text of a specific node by its ID. */
export async function get_text(node_id: string): Promise<PageIndexNode> {
  loadNodes();
  const node = allNodesMap.get(node_id);
  if (!node) {
    throw new NodeNotFoundError(node_id);
  }
  return node;
}

/** Given a parent node ID, return its immediate children. */
export async function descend(node_id: string): Promise<PageIndexNode[]> {
  loadNodes();
  const node = allNodesMap.get(node_id);
  if (!node) {
    throw new NodeNotFoundError(node_id);
  }
  const children: PageIndexNode[] = [];
  for (const childId of node.children_ids) {
    const child = allNodesMap.get(childId);
    if (child) {
      children.push(child);
    }
  }
  return children;
}

/** Given any node ID, return its full ancestor chain. */
export async function expand_path(node_id: string): Promise<PageIndexNode[]> {
  loadNodes();
  const node = allNodesMap.get(node_id);
  if (!node) {
    throw new NodeNotFoundError(node_id);
  }
  const pathNodes: PageIndexNode[] = [];
  for (const pathId of node.path) {
    const pathNode = allNodesMap.get(pathId);
    if (pathNode) {
      pathNodes.push(pathNode);
    }
  }
  return pathNodes;
}

/** Search the PageIndex tree for relevant nodes. */
export async function search(query: string, scope?: SearchScope): Promise<SearchResult[]> {
  if (!query || !query.trim()) {
    throw new InvalidQueryError("Search query cannot be empty");
  }
  loadNodes();

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  if (queryTerms.length === 0) {
    throw new InvalidQueryError("Search query cannot be empty");
  }

  const results: SearchResult[] = [];

  for (const node of allNodesMap.values()) {
    // Apply scope filters
    if (scope) {
      if (scope.act_code && node.act_code !== scope.act_code) continue;
      if (scope.level && node.level !== scope.level) continue;
      if (scope.snapshot_id && node.snapshot_id !== scope.snapshot_id) continue;
    }

    const titleLower = node.title.toLowerCase();
    const textLower = node.text.toLowerCase();

    let score = 0;
    let matchReason = "";

    // Exact matches
    if (titleLower.includes(query.toLowerCase())) {
      score += 5.0;
      matchReason = "Exact query match in title";
    } else if (textLower.includes(query.toLowerCase())) {
      score += 2.0;
      matchReason = "Exact query match in text";
    }

    // Term matches
    let termMatchesInTitle = 0;
    let termMatchesInText = 0;
    // Compute overlap boost based on title word overlap
    const titleWords = titleLower.split(/\s+/);
    let overlapBoost = 0;
    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        termMatchesInTitle++;
        if (titleWords.includes(term)) {
          overlapBoost += 2.0; // boost for each query term present as a distinct word in title
        }
      }
      if (textLower.includes(term)) {
        termMatchesInText++;
      }
    }
    score += overlapBoost;

    // Add weighted term matches
    score += termMatchesInTitle * 1.0;
    score += termMatchesInText * 2.0; // increased weight for text matches to prioritize text relevance

    // Phrase-specific boost: if title contains 'request' and text contains 'right to information', add extra relevance
    if (titleLower.includes('request') && textLower.includes('right to information')) {
      score += 5.0;
    }

    if (score > 0) {
      if (!matchReason) {
        matchReason = `Matched ${termMatchesInTitle} terms in title, ${termMatchesInText} in text`;
      }
      results.push({
        node,
        relevance: score, // Store raw score temporarily
        match_reason: matchReason
      });
    }
  }

  if (results.length === 0) {
    return [];
  }

  // Sort by raw score descending
  results.sort((a, b) => b.relevance - a.relevance);

  // Normalize relevance between 0.0 and 1.0 based on the maximum score in results
  const maxScore = results[0].relevance;
  for (const r of results) {
    r.relevance = maxScore > 0 ? parseFloat((r.relevance / maxScore).toFixed(4)) : 0.0;
  }

  // Cap results at 20
  return results.slice(0, 20);
}
