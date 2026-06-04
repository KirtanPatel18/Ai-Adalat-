/**
 * Validates a flat PageIndex tree JSON (array of nodes).
 *
 * Usage:
 *   pnpm --filter @trionic/pageindex validate --tree corpus/acts/.../tree.json
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const treeFlag = argv.indexOf("--tree");
  if (treeFlag === -1 || !argv[treeFlag + 1]) {
    console.error("Usage: validate --tree <path-to-tree.json>");
    process.exit(1);
  }
  return resolve(argv[treeFlag + 1]);
}

function validateFlatTree(nodes) {
  const errors = [];
  const byId = new Map();

  for (const node of nodes) {
    if (byId.has(node.node_id)) {
      errors.push(`Duplicate node_id: ${node.node_id}`);
    }
    byId.set(node.node_id, node);
  }

  const roots = nodes.filter((n) => n.parent_id === null);
  if (roots.length !== 1) {
    errors.push(`Expected exactly 1 root node, found ${roots.length}`);
  }

  for (const node of nodes) {
    if (!node.snapshot_id?.trim()) {
      errors.push(`Missing snapshot_id: ${node.node_id}`);
    }
    if (!node.label?.trim()) {
      errors.push(`Missing label: ${node.node_id}`);
    }
    if (node.parent_id !== null && !byId.has(node.parent_id)) {
      errors.push(
        `Orphan node ${node.node_id}: parent ${node.parent_id} not found`,
      );
    }
    if (node.node_type === "section" && !node.text_content?.trim()) {
      errors.push(`Empty text_content for section: ${node.node_id}`);
    }
    if (
      node.node_type === "section" &&
      node.status === "struck_down" &&
      !node.struck_down_by
    ) {
      errors.push(
        `struck_down section missing struck_down_by: ${node.node_id}`,
      );
    }
  }

  return errors;
}

function main() {
  const treePath = parseArgs(process.argv.slice(2));
  const raw = readFileSync(treePath, "utf-8");
  const nodes = JSON.parse(raw);

  if (!Array.isArray(nodes)) {
    console.error("Tree file must be a JSON array of nodes.");
    process.exit(1);
  }

  const errors = validateFlatTree(nodes);
  const sections = nodes.filter((n) => n.node_type === "section");

  console.log(`Tree: ${treePath}`);
  console.log(`Total nodes: ${nodes.length}`);
  console.log(`Sections: ${sections.length}`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} validation error(s):\n`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log("\nValidation passed (0 errors).");
}

main();
