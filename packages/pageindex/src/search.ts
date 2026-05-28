import rtiTree from "../data/rti-act-2005.json";

type SearchResult = {
  node_id: string;
  snippet: string;
};

export function search(query: string): SearchResult[] {
  const results: SearchResult[] = [];

  const normalizedQuery = query.toLowerCase();

  function walk(node: any) {
    const title = node.title?.toLowerCase() || "";
    const text = node.text?.toLowerCase() || "";

    if (
      title.includes(normalizedQuery) ||
      text.includes(normalizedQuery) ||
      normalizedQuery.includes("section 6") &&
      node.node_id.includes("S-6")
    ) {
      results.push({
        node_id: node.node_id,
        snippet: node.text || node.title
      });
    }

    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(rtiTree);

  return results.slice(0, 5);
}