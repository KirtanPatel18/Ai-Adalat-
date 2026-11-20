import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { NodeNotFoundError, InvalidQueryError } from "./errors.js";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }) : null;

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function resolvePackageDir(sub: string): string {
  const candidates = [
    process.env.PAGEINDEX_DIR ? join(process.env.PAGEINDEX_DIR, sub) : "",
    join(__dirname, "..", sub),
    join(process.cwd(), "..", "..", "packages", "pageindex", sub),
    join(process.cwd(), "packages", "pageindex", sub),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) ?? join(__dirname, "..", sub);
}

const artifactsDir = resolvePackageDir("artifacts");
const dataDir = resolvePackageDir("data");

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
  act_codes?: string[];
  level?: NodeLevel;
  snapshot_id?: string;
}

export interface SearchResult {
  node: PageIndexNode;
  relevance: number; // 0.0 - 1.0
  match_reason: string;
}

let allNodesMap: Map<string, PageIndexNode> = new Map();
// Secondary index: "ACT-CODE|SECTION-NUMBER" -> node. Lets a citation such as
// "NI-1881/CH-XVII/S-138" resolve to a tree that stores the section as "NI-1881/S-138"
// (or "contract-act:s10"), because the chapter part of an ID is not reliable.
let sectionIndex: Map<string, PageIndexNode> = new Map();

function resolveNode(node_id: string): PageIndexNode | undefined {
  const exact = allNodesMap.get(node_id);
  if (exact) return exact;
  const m = node_id.match(/^([^/]+)\/(?:.*\/)?S-(.+)$/i);
  if (!m) return undefined;
  return sectionIndex.get(`${m[1].toUpperCase()}|${m[2].toUpperCase()}`);
}

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

  // Load IPC Tree
  try {
    const ipcPath = join(artifactsDir, "ipc-tree.json");
    const ipcData = readFileSync(ipcPath, "utf-8");
    const ipcNodes = JSON.parse(ipcData);
    for (const node of ipcNodes) {
      const node_id = node.node_id || node.id;
      const normalizedNode: PageIndexNode = {
        node_id,
        snapshot_id: node.snapshot_id || "2024-12-01",
        act_code: "IPC-1860",
        act_name: "Indian Penal Code, 1860",
        level: (node.level || "section") as NodeLevel,
        number: node.number || node_id.split("-").pop() || "",
        title: node.title || "",
        text: node.text || node.text_content || "",
        parent_id: node.parent_id || null,
        children_ids: node.children_ids || [],
        path: node.path || [node_id],
        source_url: node.source_url || "https://indiacode.nic.in"
      };
      allNodesMap.set(normalizedNode.node_id, normalizedNode);
    }
  } catch (err) {
    console.warn("Warning: Could not load ipc-tree.json", err);
  }

  // Load NI Act Tree
  try {
    const niActPath = join(artifactsDir, "ni-act-tree.json");
    const niActData = readFileSync(niActPath, "utf-8");
    const niActTree = JSON.parse(niActData);

    const flattenNiNode = (node: any, parentId: string | null = null, path: string[] = []) => {
      const currentPath = [...path, node.node_id];
      const childrenIds = node.children ? node.children.map((c: any) => c.node_id) : [];
      
      const normalizedNode: PageIndexNode = {
        node_id: node.node_id,
        snapshot_id: node.snapshot_id || "2026-06-11",
        act_code: "NI-1881",
        act_name: "Negotiable Instruments Act, 1881",
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
          flattenNiNode(child, node.node_id, currentPath);
        }
      }
    };

    flattenNiNode(niActTree);
  } catch (err) {
    console.warn("Warning: Could not load ni-act-tree.json", err);
  }

  // Load RTI Act Tree
  try {
    let rtiPath = join(artifactsDir, "rti-act-2005.json");
    if (!existsSync(rtiPath)) {
      rtiPath = join(dataDir, "rti-act-2005.json");
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

  // Build the act + section-number index used by resolveNode()
  for (const node of allNodesMap.values()) {
    if (node.level !== "section" || !node.number) continue;
    const key = `${node.act_code.toUpperCase()}|${node.number.toUpperCase()}`;
    if (!sectionIndex.has(key)) sectionIndex.set(key, node);
  }
}

/** Retrieve the exact canonical legal text of a specific node by its ID. */
export async function get_text(node_id: string): Promise<PageIndexNode> {
  loadNodes();
  const node = resolveNode(node_id);
  if (!node) {
    throw new NodeNotFoundError(node_id);
  }
  return node;
}

/** Given a parent node ID, return its immediate children. */
export async function descend(node_id: string): Promise<PageIndexNode[]> {
  loadNodes();
  const node = resolveNode(node_id);
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
  const node = resolveNode(node_id);
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
export async function search(query: string, scope?: SearchScope, top_k: number = 20): Promise<SearchResult[]> {
  if (!query || !query.trim()) {
    throw new InvalidQueryError("Search query cannot be empty");
  }
  loadNodes();

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  if (queryTerms.length === 0) {
    throw new InvalidQueryError("Search query cannot be empty");
  }

  // If DB/OpenAI is configured, use hybrid search
  if (supabase && openai) {
    let filterScopes: string[] | null = null;
    if (scope) {
      if (scope.act_codes && scope.act_codes.length > 0) {
        filterScopes = scope.act_codes;
      } else if (scope.act_code) {
        filterScopes = [scope.act_code];
      }
    }

    try {
      // 1. Embed query
      const embedRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query
      });
      const query_embedding = embedRes.data[0].embedding;

      // 2. Call RPC
      const { data, error } = await supabase.rpc("match_pageindex_nodes", {
        query_text: query,
        query_embedding,
        match_count: top_k,
        filter_scopes: filterScopes
      });

      if (error) {
        console.error("Hybrid search error:", error);
      } else if (data) {
        const results: SearchResult[] = [];
        for (const row of data) {
          const node = allNodesMap.get(row.node_id);
          if (node) {
            // Apply other scope filters if necessary
            if (scope?.level && node.level !== scope.level) continue;
            if (scope?.snapshot_id && node.snapshot_id !== scope.snapshot_id) continue;

            results.push({
              node,
              relevance: row.score,
              match_reason: `Hybrid match (similarity: ${row.similarity.toFixed(2)}, bm25: ${row.bm25_score.toFixed(2)})`
            });
          }
        }
        if (results.length > 0) {
          // Normalization already handled via score ensemble, return direct results
          return results.slice(0, top_k);
        }
      }
    } catch (err) {
      console.error("Failed to perform hybrid search:", err);
    }
  }

  const results: SearchResult[] = [];

  for (const node of allNodesMap.values()) {
    // Apply scope filters
    if (scope) {
      if (scope.act_codes && scope.act_codes.length > 0 && !scope.act_codes.includes(node.act_code)) continue;
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
    const titleWords = titleLower.split(/\s+/);
    let overlapBoost = 0;
    for (const term of queryTerms) {
      if (titleLower.includes(term)) {
        termMatchesInTitle++;
        if (titleWords.includes(term)) {
          overlapBoost += 2.0;
        }
      }
      if (textLower.includes(term)) {
        termMatchesInText++;
      }
    }
    score += overlapBoost;
    score += termMatchesInTitle * 1.0;
    score += termMatchesInText * 2.0;

    if (titleLower.includes('request') && textLower.includes('right to information')) {
      score += 5.0;
    }

    if (!matchReason) {
      matchReason = `Matched ${termMatchesInTitle} terms in title, ${termMatchesInText} in text`;
    }
    if (score > 0) {
      results.push({
        node,
        relevance: score,
        match_reason: matchReason
      });
    }
  }

  results.sort((a, b) => b.relevance - a.relevance);
  const maxScore = results[0]?.relevance || 1;
  for (const r of results) {
    r.relevance = maxScore > 0 ? parseFloat((r.relevance / maxScore).toFixed(4)) : 0.0;
  }

  return results.slice(0, top_k);
}