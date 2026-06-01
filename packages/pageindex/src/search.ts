import rtiTree from "../data/rti-act-2005.json";

type SearchResult = {
  node_id: string;
  snippet: string;
  score: number;
};

export function search(query: string): SearchResult[] {
  const results: SearchResult[] = [];

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  function walk(node: any) {
    const title = (node.title || "").toLowerCase();
    const text = (node.text || "").toLowerCase();

    const keywords = (
      node.retrieval_keywords || []
    )
      .join(" ")
      .toLowerCase();

    const searchable = `${title} ${text} ${keywords}`;

    let score = 0;

    for (const term of terms) {
      if (searchable.includes(term)) {
        score++;
      }
    }

    if (score > 0) {
      results.push({
        node_id: node.node_id,
        snippet: node.text || node.title,
        score
      });
    }

    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(rtiTree);

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}