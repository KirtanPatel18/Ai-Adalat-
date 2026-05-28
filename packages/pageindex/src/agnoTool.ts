import { search } from "./search";
import { descend } from "./descend";
import { getText } from "./getText";

export const pageindex = {
  search: ({
    query
  }: {
    query: string;
    scope?: string;
    top_k?: number;
  }) => {
    return search(query);
  },

  descend: ({
    node_id
  }: {
    node_id: string;
  }) => {
    return {
      children: descend(node_id)
    };
  },

  get_text: ({
    node_id
  }: {
    node_id: string;
  }) => {
    return getText(node_id);
  }
};