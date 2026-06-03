"use client"

import * as React from "react"
import { Citation } from "@trionic/shared"
import { parseNodeId } from "@/lib/citation-utils"
import { Scale, Bookmark, Pin, Info } from "lucide-react"

// Complete dictionary of highly realistic legal texts for Week 2 (to be replaced by live fetch in Week 3)
const MOCK_NODE_TEXTS: Record<string, { title: string; text: string; details?: string }> = {
  'IPC-1860/CH-XVI/S-375': {
    title: 'Section 375: Rape',
    text: 'A man is said to commit "rape" who, except in the case hereinafter excepted, has sexual intercourse with a woman under circumstances falling under any of the seven following descriptions: (First) - Against her will. (Second) - Without her consent...',
    details: 'Indian Penal Code, 1860 | Chapter XVI: Of Offences Affecting The Human Body'
  },
  'RTI-2005/CH-II/S-6': {
    title: 'Section 6: Request for obtaining information',
    text: 'A person, who desires to obtain any information under this Act, shall make a request in writing or through electronic means in English or Hindi or in the official language of the area in which the application is being made, accompanying such fee as may be prescribed...',
    details: 'Right to Information Act, 2005 | Chapter II: Right to Information and Obligations of Public Authorities'
  },
  'RTI-2005/CH-II/S-7': {
    title: 'Section 7: Disposal of request',
    text: 'Subject to the proviso to sub-section (2) of section 5 or the proviso to sub-section (3) of section 6, the Public Information Officer on receipt of a request under section 6 shall, as expeditiously as possible, and in any case within thirty days of the receipt of the request, either provide the information on payment of such fee as may be prescribed or reject the request...',
    details: 'Right to Information Act, 2005 | Chapter II: Right to Information and Obligations of Public Authorities'
  },
  'ICA-1872/CH-VI/S-73': {
    title: 'Section 73: Compensation for loss or damage caused by breach of contract',
    text: 'When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it...',
    details: 'Indian Contract Act, 1872 | Chapter VI: Of The Consequences Of Breach Of Contract'
  },
  'CPA-2019/CH-IV/S-35': {
    title: 'Section 35: Manner in which complaint shall be made',
    text: 'A complaint, in relation to any goods sold or delivered or agreed to be sold or delivered or any service provided or agreed to be provided, may be filed with a District Commission by— (a) the consumer; (b) any recognised consumer association; (c) one or more consumers, where there are numerous consumers having the same interest...',
    details: 'Consumer Protection Act, 2019 | Chapter IV: Consumer Disputes Redressal Commission'
  }
};

const DEFAULT_TEXT = {
  title: 'Legal Section Text',
  text: 'Full legal text will be fetched dynamically from the PageIndex in Week 3. Hovering confirms the layout matches perfectly.',
  details: 'Act details not indexed.'
};

export interface CitationDrawerProps {
  citations: Citation[]
  activeCitationNodeId?: string | null
  onCitationSelect?: (nodeId: string, index: number) => void
}

// Tree Node Interface for nested hierarchical data structure
interface TreeNode {
  id: string
  label: string
  level: number
  children: TreeNode[]
  citationIndex?: number
  citation?: Citation
}

export function CitationDrawer({
  citations = [],
  activeCitationNodeId = null,
  onCitationSelect
}: CitationDrawerProps) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const [activeTileId, setActiveTileId] = React.useState<string | null>(null)

  // Build the hierarchical tree path dynamically from citation node IDs
  const treeNodes = React.useMemo(() => {
    const rootNodes: TreeNode[] = []

    citations.forEach((citation, idx) => {
      const parsed = parseNodeId(citation.node_id)
      
      // Level 0: Act Node
      let actNode = rootNodes.find(n => n.id === parsed.actCode)
      if (!actNode) {
        actNode = {
          id: parsed.actCode,
          label: `${parsed.actName} (${parsed.actCode})`,
          level: 0,
          children: []
        }
        rootNodes.push(actNode)
      }

      // Level 1: Chapter Node
      const chapterId = `${parsed.actCode}/${parsed.chapterCode}`
      let chapterNode = actNode.children.find(n => n.id === chapterId)
      if (!chapterNode) {
        chapterNode = {
          id: chapterId,
          label: parsed.chapterName,
          level: 1,
          children: []
        }
        actNode.children.push(chapterNode)
      }

      // Level 2: Section Node
      const sectionId = `${parsed.actCode}/${parsed.chapterCode}/${parsed.sectionCode}`
      let sectionNode = chapterNode.children.find(n => n.id === sectionId)
      if (!sectionNode) {
        sectionNode = {
          id: sectionId,
          label: parsed.sectionName,
          level: 2,
          children: []
        }
        chapterNode.children.push(sectionNode)
      }

      // Level 3: Explanation / Text Node
      const detailId = `${citation.node_id}/DETAIL`
      const hasDetail = sectionNode.children.find(n => n.id === detailId)
      if (!hasDetail) {
        sectionNode.children.push({
          id: detailId,
          label: "Explanation",
          level: 3,
          children: [],
          citationIndex: idx,
          citation
        })
      }
    })

    return rootNodes
  }, [citations])

  // Automatically unfold the parent branch chain down to Section when activeCitationNodeId changes
  React.useEffect(() => {
    if (activeCitationNodeId) {
      const parsed = parseNodeId(activeCitationNodeId)
      const actId = parsed.actCode
      const chapterId = `${parsed.actCode}/${parsed.chapterCode}`
      const sectionId = `${parsed.actCode}/${parsed.chapterCode}/${parsed.sectionCode}`

      setActiveTileId(sectionId)

      setExpanded(prev => ({
        ...prev,
        [actId]: true,
        [chapterId]: true,
        [sectionId]: true
      }))

      // Smooth scroll the target Section node into view inside the drawer
      setTimeout(() => {
        const elementId = `node-tile-${sectionId}`
        const element = document.getElementById(elementId)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          
          // Temporary active glow
          element.classList.add("ring-2", "ring-indigo-500/50", "bg-indigo-50/50", "dark:bg-indigo-950/20")
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-indigo-500/50", "bg-indigo-50/50", "dark:bg-indigo-950/20")
          }, 1500)
        }
      }, 150)
    }
  }, [activeCitationNodeId])

  const toggleNode = (nodeId: string) => {
    setExpanded(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }))
  }

  const handleSectionClick = (node: TreeNode) => {
    toggleNode(node.id)
    setActiveTileId(node.id)
    
    const explanationNode = node.children[0]
    if (explanationNode && explanationNode.citationIndex !== undefined && explanationNode.citation) {
      const origIndex = explanationNode.citationIndex
      const nodeIdStr = explanationNode.citation.node_id

      if (onCitationSelect) {
        onCitationSelect(nodeIdStr, origIndex)
      }

      // Smooth scroll the editor to its inline [n] marker
      const markerId = `citation-marker-${origIndex + 1}`
      const markerElement = document.getElementById(markerId)
      if (markerElement) {
        markerElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        
        // Pulse animation glow on editor badge
        markerElement.classList.add("ring-4", "ring-indigo-500/50", "bg-indigo-100", "dark:bg-indigo-900/40")
        setTimeout(() => {
          markerElement.classList.remove("ring-4", "ring-indigo-500/50", "bg-indigo-100", "dark:bg-indigo-900/40")
        }, 2000)
      }
    }
  }

  // Recursive tree renderer function
  const renderTreeNode = (node: TreeNode) => {
    const isExpanded = !!expanded[node.id]
    const hasChildren = node.children.length > 0
    const isActive = activeTileId === node.id

    // Nested indentation based on hierarchy level
    let indentClass = "pl-0"
    if (node.level === 1) indentClass = "pl-4 border-l border-slate-200/55 dark:border-slate-800/40 ml-2"
    if (node.level === 2) indentClass = "pl-6 border-l border-slate-200/55 dark:border-slate-800/40 ml-2"
    if (node.level === 3) indentClass = "pl-8 border-l border-emerald-250/30 dark:border-emerald-950/20 ml-2"

    const mockText = MOCK_NODE_TEXTS[node.citation?.node_id || ''] || DEFAULT_TEXT

    // Render Level 3: Legal Description card (Explanation)
    if (node.level === 3) {
      return (
        <div key={node.id} className={`${indentClass} py-1 pr-1`}>
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-3 shadow-sm select-text text-left space-y-2 animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5 text-[9.5px] text-slate-400 font-mono font-bold">
              <span>LEGAL TEXT SUMMARY</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                [{node.citationIndex! + 1}]
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-300 font-sans">
              {mockText.text}
            </p>
            {mockText.details && (
              <div className="text-[9.5px] text-slate-400 dark:text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-850 font-mono leading-none">
                {mockText.details}
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div key={node.id} className="space-y-1.5">
        {/* Hierarchical Accordion Node Item */}
        <div
          id={`node-tile-${node.id}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (node.level === 2) {
              handleSectionClick(node)
            } else {
              toggleNode(node.id)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              if (node.level === 2) {
                handleSectionClick(node)
              } else {
                toggleNode(node.id)
              }
            }
          }}
          className={`group flex items-center justify-between cursor-pointer px-2.5 py-2 rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${indentClass} ${
            isActive
              ? 'bg-indigo-50/40 dark:bg-indigo-950/15 text-indigo-650 dark:text-indigo-450 font-semibold'
              : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {node.level === 0 && <Bookmark className="size-3.5 text-indigo-500/80 shrink-0" />}
            <span className={`truncate ${
              node.level === 0 
                ? 'font-bold text-slate-800 dark:text-slate-200 text-sm'
                : node.level === 1
                ? 'font-semibold text-[12.5px]'
                : 'font-medium text-xs font-serif'
            }`}>
              {node.label}
            </span>
          </div>

          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0 select-none">
            {isExpanded ? '▼' : '►'}
          </span>
        </div>

        {/* Child level render */}
        {isExpanded && (
          <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="w-80 h-full flex flex-col bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="size-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
            Citations ({citations.length})
          </h2>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
          Hierarchy
        </span>
      </div>

      {/* Citations Nested Tree */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
        {citations.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
            <Bookmark className="size-8 stroke-[1.5]" />
            <p className="text-sm">No citations in this draft yet</p>
          </div>
        ) : (
          treeNodes.map(rootNode => renderTreeNode(rootNode))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-500 text-[10.5px] flex items-center gap-2">
        <Info className="size-4 shrink-0 text-indigo-500" />
        <span>Click elements to expand hierarchy. Clicking Section scrolls editor.</span>
      </div>
    </aside>
  )
}
