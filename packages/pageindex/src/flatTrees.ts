import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { PageIndexNode, NodeLevel } from "./query.js";

/**
 * Act-code aliases. The agent prompts tell the model to use "IT-2000",
 * while the IT Act tree stores its nodes under "ITA-2000".
 */
const ACT_ALIASES: Record<string, string> = {
  "IT-2000": "ITA-2000",
  "IT-ACT-2000": "ITA-2000",
  CPA2019: "CPA-2019",
};

export function canonicalActCode(code: string): string {
  const up = code.trim().toUpperCase();
  return ACT_ALIASES[up] ?? up;
}

interface FlatRow {
  node_id: string;
  snapshot_id?: string;
  parent_id?: string | null;
  node_type?: string;
  label?: string;
  text_content?: string;
}

const FLAT_TREES: Array<{ file: string; act_code: string; act_name: string }> =
  [
    {
      file: "it-act-tree.json",
      act_code: "ITA-2000",
      act_name: "Information Technology Act, 2000",
    },
    {
      file: "cpa-tree.json",
      act_code: "CPA-2019",
      act_name: "Consumer Protection Act, 2019",
    },
  ];

const LEVELS: Record<string, NodeLevel> = {
  root: "act",
  chapter: "chapter",
  section: "section",
};

/** Load flat-array trees (IT Act, Consumer Protection Act) into the node map. */
export function loadFlatTrees(
  nodes: Map<string, PageIndexNode>,
  artifactsDir: string,
): void {
  for (const tree of FLAT_TREES) {
    try {
      const filePath = join(artifactsDir, tree.file);
      if (!existsSync(filePath)) {
        console.warn(`Warning: ${tree.file} not found in ${artifactsDir}`);
        continue;
      }
      const rows = JSON.parse(readFileSync(filePath, "utf-8")) as FlatRow[];

      const byId = new Map<string, FlatRow>();
      const childMap = new Map<string, string[]>();
      for (const row of rows) {
        byId.set(row.node_id, row);
        if (row.parent_id) {
          const list = childMap.get(row.parent_id) ?? [];
          list.push(row.node_id);
          childMap.set(row.parent_id, list);
        }
      }

      const pathOf = (id: string): string[] => {
        const path: string[] = [];
        let cur: string | null | undefined = id;
        let guard = 0;
        while (cur && guard++ < 10) {
          path.unshift(cur);
          cur = byId.get(cur)?.parent_id;
        }
        return path;
      };

      for (const row of rows) {
        const level: NodeLevel =
          LEVELS[row.node_type ?? "section"] ?? "section";
        const number =
          level === "section"
            ? (row.node_id.match(/\/S-([^/]+)$/)?.[1] ?? "")
            : "";
        const label = row.label ?? "";
        nodes.set(row.node_id, {
          node_id: row.node_id,
          snapshot_id: row.snapshot_id || "2026-06-03",
          act_code: tree.act_code,
          act_name: tree.act_name,
          level,
          number,
          title: label.replace(/^Section\s+\S+\s+[\u2014\u2013-]\s*/, ""),
          text: row.text_content ?? "",
          parent_id: row.parent_id ?? null,
          children_ids: childMap.get(row.node_id) ?? [],
          path: pathOf(row.node_id),
          source_url: "https://indiacode.nic.in",
        });
      }
    } catch (err) {
      console.warn(`Warning: Could not load ${tree.file}`, err);
    }
  }
}
