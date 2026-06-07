"use client";

import * as React from "react";
import { X, BookOpenText, Info, Bookmark } from "lucide-react";
import { useDraftStore } from "../../hooks/use-draft-store";
import { parseNodeId, formatNodeIdToBreadcrumb } from "@/lib/citation-utils";
import type { Citation } from "@trionic/shared";

// Tree Node Interface for nested hierarchical data structure
interface TreeNode {
  id: string;
  label: string;
  level: number;
  children: TreeNode[];
  citationIndex?: number;
  citation?: Citation;
}

export function CitationDrawer() {
  const citations = useDraftStore((state) => state.citations);
  const activeCitationNodeId = useDraftStore((state) => state.activeCitationNodeId);
  const setActiveCitationNodeId = useDraftStore((state) => state.setActiveCitationNodeId);
  const toggleCitationDrawer = useDraftStore((state) => state.toggleCitationDrawer);

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [activeTileId, setActiveTileId] = React.useState<string | null>(null);

  // Cache for dynamic legal texts fetched from PageIndex
  const [nodeTexts, setNodeTexts] = React.useState<Record<string, { title: string; text: string }>>({});
  const [loadingNodes, setLoadingNodes] = React.useState<Record<string, boolean>>({});

  // Build the hierarchical tree path dynamically from citation node IDs
  const treeNodes = React.useMemo(() => {
    const rootNodes: TreeNode[] = [];

    citations.forEach((citation, idx) => {
      const parsed = parseNodeId(citation.node_id);
      
      // Level 0: Act Node
      let actNode = rootNodes.find(n => n.id === parsed.actCode);
      if (!actNode) {
        actNode = {
          id: parsed.actCode,
          label: `${parsed.actName} (${parsed.actCode})`,
          level: 0,
          children: []
        };
        rootNodes.push(actNode);
      }

      // Level 1: Chapter Node
      const chapterId = `${parsed.actCode}/${parsed.chapterCode}`;
      let chapterNode = actNode.children.find(n => n.id === chapterId);
      if (!chapterNode) {
        chapterNode = {
          id: chapterId,
          label: parsed.chapterName || "General",
          level: 1,
          children: []
        };
        actNode.children.push(chapterNode);
      }

      // Level 2: Section Node
      const sectionId = `${parsed.actCode}/${parsed.chapterCode}/${parsed.sectionCode}`;
      let sectionNode = chapterNode.children.find(n => n.id === sectionId);
      if (!sectionNode) {
        sectionNode = {
          id: sectionId,
          label: parsed.sectionName,
          level: 2,
          children: []
        };
        chapterNode.children.push(sectionNode);
      }

      // Level 3: Explanation / Text Node
      const detailId = `${citation.node_id}/DETAIL`;
      const hasDetail = sectionNode.children.find(n => n.id === detailId);
      if (!hasDetail) {
        sectionNode.children.push({
          id: detailId,
          label: "Explanation",
          level: 3,
          children: [],
          citationIndex: idx,
          citation
        });
      }
    });

    return rootNodes;
  }, [citations]);

  // Fetch page index text for a given node id
  const fetchNodeText = async (nodeId: string) => {
    if (nodeTexts[nodeId] || loadingNodes[nodeId]) return;
    setLoadingNodes(prev => ({ ...prev, [nodeId]: true }));
    try {
      const res = await fetch(`/api/pageindex/node/${encodeURIComponent(nodeId)}`);
      if (res.ok) {
        const data = await res.json();
        setNodeTexts(prev => ({
          ...prev,
          [nodeId]: {
            title: data.title || formatNodeIdToBreadcrumb(nodeId),
            text: data.text || "Legal text content not found."
          }
        }));
      } else {
        setNodeTexts(prev => ({
          ...prev,
          [nodeId]: {
            title: formatNodeIdToBreadcrumb(nodeId),
            text: "Failed to load authoritative text from PageIndex."
          }
        }));
      }
    } catch (err) {
      console.error("[CitationDrawer] Fetch error:", err);
      setNodeTexts(prev => ({
        ...prev,
        [nodeId]: {
          title: formatNodeIdToBreadcrumb(nodeId),
          text: "Error connecting to PageIndex API."
        }
      }));
    } finally {
      setLoadingNodes(prev => ({ ...prev, [nodeId]: false }));
    }
  };

  // Automatically unfold the parent branch chain down to Section when activeCitationNodeId changes
  React.useEffect(() => {
    if (activeCitationNodeId) {
      const parsed = parseNodeId(activeCitationNodeId);
      const actId = parsed.actCode;
      const chapterId = `${parsed.actCode}/${parsed.chapterCode}`;
      const sectionId = `${parsed.actCode}/${parsed.chapterCode}/${parsed.sectionCode}`;

      setActiveTileId(sectionId);

      setExpanded(prev => ({
        ...prev,
        [actId]: true,
        [chapterId]: true,
        [sectionId]: true
      }));

      // Trigger text fetch for the active node
      fetchNodeText(activeCitationNodeId);

      // Smooth scroll the target Section node into view inside the drawer
      setTimeout(() => {
        const elementId = `node-tile-${sectionId}`;
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "nearest" });
          
          // Temporary active glow
          element.classList.add("ring-2", "ring-indigo-500/50", "bg-indigo-50/50", "dark:bg-indigo-950/20");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-indigo-500/50", "bg-indigo-50/50", "dark:bg-indigo-950/20");
          }, 1500);
        }
      }, 150);
    }
  }, [activeCitationNodeId]);

  const toggleNode = (nodeId: string) => {
    setExpanded(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleSectionClick = (node: TreeNode) => {
    toggleNode(node.id);
    setActiveTileId(node.id);
    
    const explanationNode = node.children[0];
    if (explanationNode && explanationNode.citation) {
      const origIndex = explanationNode.citationIndex ?? 0;
      const nodeIdStr = explanationNode.citation.node_id;

      setActiveCitationNodeId(nodeIdStr);
      fetchNodeText(nodeIdStr);

      // Smooth scroll the editor to its inline [n] marker
      const markerId = `citation-marker-${origIndex + 1}`;
      const markerElement = document.getElementById(markerId);
      if (markerElement) {
        markerElement.scrollIntoView({ behavior: "smooth", block: "center" });
        
        // Pulse animation glow on editor badge
        markerElement.classList.add("ring-4", "ring-indigo-500/50", "bg-indigo-100", "dark:bg-indigo-900/40");
        setTimeout(() => {
          markerElement.classList.remove("ring-4", "ring-indigo-500/50", "bg-indigo-100", "dark:bg-indigo-900/40");
        }, 2000);
      }
    }
  };

  // Recursive tree renderer function
  const renderTreeNode = (node: TreeNode) => {
    const isExpanded = !!expanded[node.id];
    const isActive = activeTileId === node.id;

    // Nested indentation based on hierarchy level
    let indentClass = "pl-0";
    if (node.level === 1) indentClass = "pl-4 border-l border-zinc-200/55 dark:border-zinc-800/40 ml-2";
    if (node.level === 2) indentClass = "pl-6 border-l border-zinc-200/55 dark:border-zinc-800/40 ml-2";
    if (node.level === 3) indentClass = "pl-8 border-l border-indigo-200/30 dark:border-indigo-950/20 ml-2";

    // Level 3 details block (Explanation)
    if (node.level === 3) {
      const nodeId = node.citation?.node_id || "";
      const textInfo = nodeTexts[nodeId];
      const isLoading = loadingNodes[nodeId];

      return (
        <div key={node.id} className={`${indentClass} py-1.5 pr-1`}>
          <div className="bg-background border rounded-xl p-3 shadow-sm select-text text-left space-y-2 animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between border-b pb-1.5 text-[9.5px] text-muted-foreground font-mono font-bold">
              <span>AUTHORITATIVE LEGAL TEXT</span>
              <span className="font-extrabold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                [{node.citationIndex! + 1}]
              </span>
            </div>
            
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 font-sans">
                <span className="h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Loading authoritative text...
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-foreground font-sans">
                {textInfo?.text || "Expand parent or hover badge to fetch full text."}
              </p>
            )}

            <div className="text-[9.5px] text-muted-foreground pt-1.5 border-t font-mono leading-normal">
              {formatNodeIdToBreadcrumb(nodeId)}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={node.id} className="space-y-1">
        {/* Accordion Node Header */}
        <div
          id={`node-tile-${node.id}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (node.level === 2) {
              handleSectionClick(node);
            } else {
              toggleNode(node.id);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (node.level === 2) {
                handleSectionClick(node);
              } else {
                toggleNode(node.id);
              }
            }
          }}
          className={`group flex items-center justify-between cursor-pointer px-2.5 py-2 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${indentClass} ${
            isActive
              ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-semibold'
              : 'hover:bg-muted text-foreground hover:text-indigo-600 dark:hover:text-indigo-400'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {node.level === 0 && <Bookmark className="h-3.5 w-3.5 text-primary shrink-0" />}
            <span className={`truncate ${
              node.level === 0 
                ? 'font-bold text-sm'
                : node.level === 1
                ? 'font-semibold text-xs text-muted-foreground'
                : 'font-medium text-xs font-serif'
            }`}>
              {node.label}
            </span>
          </div>

          <span className="text-[10px] text-muted-foreground font-mono shrink-0 select-none">
            {isExpanded ? '▼' : '►'}
          </span>
        </div>

        {/* Child recursion */}
        {isExpanded && (
          <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-card shadow-[-4px_0_24px_-8px_rgba(0,0,0,0.08)] ring-1 ring-border/50 relative">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-muted/30 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <BookOpenText className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Citations ({citations.length})</h2>
        </div>
        <button 
          onClick={toggleCitationDrawer}
          className="rounded-md p-1.5 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Close drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {citations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center py-12">
            <div className="rounded-full bg-primary/10 p-4">
              <Info className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2 max-w-[250px]">
              <h3 className="font-semibold tracking-tight text-foreground">
                No Citations Found
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Add citation markers like `[CITE:RTI-2005/CH-II/S-6]` in the text to reference legal acts.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {treeNodes.map(rootNode => renderTreeNode(rootNode))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t bg-muted/20 text-muted-foreground text-[10px] flex items-center gap-2">
        <Info className="h-4 w-4 shrink-0 text-primary" />
        <span>Click paths to expand. Section clicks highlight & scroll editor to marker.</span>
      </div>
    </div>
  );
}
