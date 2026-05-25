export type CiteMarker = {
  node_id: string;
  span: [number, number];
};

export type AgentTrace = {
  agent: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  cited_nodes: string[];
  status: "ok" | "rejected" | "error";
};

export type Fixture = {
  fixture_id: string;
  doc_type: string;
  language: string;
  agent_traces: AgentTrace[];
  draft_output: {
    text: string;
    cite_markers: CiteMarker[];
  };
  ground_truth: {
    valid_node_ids: string[];
    required_sections: string[];
  };
};
