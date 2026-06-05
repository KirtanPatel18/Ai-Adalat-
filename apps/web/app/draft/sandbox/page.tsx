"use client"

import * as React from "react"
import { CitationDrawer } from "@/components/CitationDrawer"
import { Citation } from "@trionic/shared"
import { ArrowLeft, Languages, Download, CheckCircle, Scale, PenTool, Sparkles } from "lucide-react"
import Link from "next/link"

const MOCK_CITATIONS: Citation[] = [
  {
    node_id: "RTI-2005/CH-II/S-6",
    snapshot_id: "2024-12-01",
    span: [120, 125]
  },
  {
    node_id: "RTI-2005/CH-II/S-7",
    snapshot_id: "2024-12-01",
    span: [270, 275]
  },
  {
    node_id: "IPC-1860/CH-XVI/S-375",
    snapshot_id: "2024-12-01",
    span: [410, 415]
  },
  {
    node_id: "ICA-1872/CH-VI/S-73",
    snapshot_id: "2024-12-01",
    span: [560, 565]
  },
  {
    node_id: "CPA-2019/CH-IV/S-35",
    snapshot_id: "2024-12-01",
    span: [710, 715]
  }
]

export default function CitationSandboxPage() {
  const [activeCitationNodeId, setActiveCitationNodeId] = React.useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg] = React.useState<string | null>(null)
  const [hoveredBadgeIndex, setHoveredBadgeIndex] = React.useState<number | null>(null)
  
  const editorScrollRef = React.useRef<HTMLDivElement>(null)

  const handleBadgeClick = (nodeId: string, index: number) => {
    setActiveCitationNodeId(nodeId)
    triggerToast(`Scrolled drawer to Citation [${index + 1}] and highlighted it!`)
    
    // Smooth scroll the drawer card into view
    const tileId = `citation-tile-${index + 1}`
    const tileElement = document.getElementById(tileId)
    if (tileElement) {
      tileElement.scrollIntoView({ behavior: "smooth", block: "nearest" })
      
      // Temporary ring glow
      tileElement.classList.add("ring-2", "ring-amber-500", "scale-[1.01]")
      setTimeout(() => {
        tileElement.classList.remove("ring-2", "ring-amber-500", "scale-[1.01]")
      }, 1500)
    }
  }

  const handleDrawerSelection = (nodeId: string, index: number) => {
    setActiveCitationNodeId(nodeId)
    triggerToast(`Scrolled editor to inline marker [${index + 1}]!`)
  }

  const triggerToast = (msg: string) => {
    setFeedbackMsg(msg)
    setTimeout(() => {
      setFeedbackMsg(null)
    }, 3000)
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0 select-none shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-800 dark:text-white text-base">
              RTI – Municipal Records & Legal Brief
            </h1>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle className="size-3" /> final
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => triggerToast("Translation triggered (statted for W2)")}
            className="h-8 text-[12.5px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Languages className="size-4" /> Translate
          </button>
          
          <button 
            onClick={() => triggerToast("PDF export triggered (stubbed for W2)")}
            className="h-8 text-[12.5px] bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow"
          >
            <Download className="size-4" /> Export
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* Left Side: Mock Editor */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
          
          {/* AI Banner */}
          <div className="bg-amber-50/80 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-900/30 px-6 py-2.5 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 shrink-0 select-none backdrop-blur-sm">
            <Scale className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="leading-tight">
              <strong>⚠ AI-Generated Draft — Not Legal Advice.</strong> Review carefully before filing with any judicial or government authority.
            </p>
          </div>

          {/* Interactive feedback toast overlay */}
          {feedbackMsg && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-900/90 dark:bg-slate-100/90 backdrop-blur-md text-white dark:text-slate-900 text-xs font-semibold px-4 py-2 rounded-full shadow-lg z-50 animate-in fade-in slide-in-from-top-3 duration-200">
              {feedbackMsg}
            </div>
          )}

          {/* Editor Area */}
          <div 
            ref={editorScrollRef}
            className="flex-1 overflow-y-auto px-12 py-10 max-w-4xl mx-auto w-full space-y-6 scrollbar-thin"
          >
            {/* Editor Sheet Simulation */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-8 min-h-[120%] space-y-8 font-serif leading-relaxed text-slate-800 dark:text-slate-200">
              
              <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800/80 pb-6 select-none font-sans">
                <div className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 text-[10.5px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  <Sparkles className="size-3" /> Week 2 Demo Gate Sandbox
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-serif">
                  BEFORE THE PUBLIC INFORMATION OFFICER
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                  Draft document model v1.0.2
                </p>
              </div>

              {/* Legal Draft Document */}
              <div className="space-y-6 text-[15px]">
                <div>
                  <strong className="block uppercase font-sans text-xs tracking-wider text-slate-400 dark:text-slate-500 mb-1">To:</strong>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    The Public Information Officer (PIO)<br />
                    Municipal Corporation of Delhi (MCD)<br />
                    Civil Lines Zone, Delhi - 110054
                  </p>
                </div>

                <div className="pt-2">
                  <strong className="block uppercase font-sans text-xs tracking-wider text-slate-400 dark:text-slate-500 mb-1">Subject:</strong>
                  <p className="font-bold underline text-slate-900 dark:text-white">
                    Application under Section 6 of the Right to Information Act, 2005 for road repair works.
                  </p>
                </div>

                <p>
                  Respected Sir/Madam,
                </p>

                <p className="indent-8 text-justify">
                  I, the undersigned citizen of India, hereby submit this formal request under the provisions of <strong>Section 6 of the Right to Information Act, 2005</strong><button id="citation-marker-1" onClick={() => handleBadgeClick("RTI-2005/CH-II/S-6", 0)} onMouseEnter={() => setHoveredBadgeIndex(0)} onMouseLeave={() => setHoveredBadgeIndex(null)} className={`relative inline-flex items-center justify-center text-center leading-none p-0 font-mono font-bold text-[11px] size-5 rounded-md cursor-pointer transition-all select-none align-middle border ${activeCitationNodeId === "RTI-2005/CH-II/S-6" ? "bg-indigo-600 text-white border-indigo-650 ring-2 ring-indigo-400 shadow-md scale-105" : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-455 border-indigo-250 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900"}`} title="Click to view Section 6 Citation in Drawer">1{hoveredBadgeIndex === 0 && (<span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 p-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-xl shadow-2xl font-sans leading-relaxed pointer-events-none z-50 border border-slate-800 dark:border-slate-200 text-left font-normal"><span className="block font-extrabold text-[13px] border-b border-slate-850 dark:border-slate-100 pb-1 mb-1.5 font-serif text-white dark:text-slate-950">Section 6, RTI</span><span className="block text-[11.5px] text-slate-300 dark:text-slate-600">Requires filing a written or electronic request to a PIO to acquire public data.</span><span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900 dark:border-t-white" /></span>)}</button>, to seek certified photocopies and records concerning the arterial road repair project completed in Sector-15, Civil Lines area between November 2025 and February 2026.
                </p>

                <p className="indent-8 text-justify">
                  Pursuant to the statutory mandates of the Act, specifically <strong>Section 7 of the RTI Act</strong><button id="citation-marker-2" onClick={() => handleBadgeClick("RTI-2005/CH-II/S-7", 1)} onMouseEnter={() => setHoveredBadgeIndex(1)} onMouseLeave={() => setHoveredBadgeIndex(null)} className={`relative inline-flex items-center justify-center text-center leading-none p-0 font-mono font-bold text-[11px] size-5 rounded-md cursor-pointer transition-all select-none align-middle border ${activeCitationNodeId === "RTI-2005/CH-II/S-7" ? "bg-indigo-600 text-white border-indigo-650 ring-2 ring-indigo-400 shadow-md scale-105" : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-455 border-indigo-250 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900"}`} title="Click to view Section 7 Citation in Drawer">2{hoveredBadgeIndex === 1 && (<span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 p-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-xl shadow-2xl font-sans leading-relaxed pointer-events-none z-50 border border-slate-800 dark:border-slate-200 text-left font-normal"><span className="block font-extrabold text-[13px] border-b border-slate-850 dark:border-slate-100 pb-1 mb-1.5 font-serif text-white dark:text-slate-950">Section 7, RTI</span><span className="block text-[11.5px] text-slate-300 dark:text-slate-600">PIO must reply or reject request as soon as possible, within maximum 30 days.</span><span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900 dark:border-t-white" /></span>)}</button>, the Public Information Officer is required to dispose of this request and communicate the decisions, including fees, within the statutory time frame of thirty (30) days from receipt.
                </p>

                <p className="indent-8 text-justify">
                  Please note that any non-disclosure or withholding of the requested public registry details must be strictly qualified under the narrow exemptions explicitly outlined under the <strong>Indian Penal Code Section 375</strong><button id="citation-marker-3" onClick={() => handleBadgeClick("IPC-1860/CH-XVI/S-375", 2)} onMouseEnter={() => setHoveredBadgeIndex(2)} onMouseLeave={() => setHoveredBadgeIndex(null)} className={`relative inline-flex items-center justify-center text-center leading-none p-0 font-mono font-bold text-[11px] size-5 rounded-md cursor-pointer transition-all select-none align-middle border ${activeCitationNodeId === "IPC-1860/CH-XVI/S-375" ? "bg-indigo-600 text-white border-indigo-650 ring-2 ring-indigo-400 shadow-md scale-105" : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-455 border-indigo-250 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900"}`} title="Click to view Section 375 Citation in Drawer">3{hoveredBadgeIndex === 2 && (<span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 p-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-xl shadow-2xl font-sans leading-relaxed pointer-events-none z-50 border border-slate-800 dark:border-slate-200 text-left font-normal"><span className="block font-extrabold text-[13px] border-b border-slate-855 dark:border-slate-100 pb-1 mb-1.5 font-serif text-white dark:text-slate-950">Section 375, IPC</span><span className="block text-[11.5px] text-slate-300 dark:text-slate-650">Specifies non-consensual sexual intercourse acts and exceptions.</span><span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900 dark:border-t-white" /></span>)}</button>, which is completely irrelevant to this administrative procedure but cited as a test node to ensure our multi-act tree grouping works impeccably.
                </p>

                <div className="border-t border-slate-100 dark:border-slate-800/80 my-8 pt-6">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-3 text-base font-sans">
                    Additional Context: Legal Notice & Breaches
                  </h3>
                </div>

                <p className="indent-8 text-justify">
                  In terms of liability and municipal breaches of contractor pacts, <strong>Section 73 of the Indian Contract Act, 1872</strong><button id="citation-marker-4" onClick={() => handleBadgeClick("ICA-1872/CH-VI/S-73", 3)} onMouseEnter={() => setHoveredBadgeIndex(3)} onMouseLeave={() => setHoveredBadgeIndex(null)} className={`relative inline-flex items-center justify-center text-center leading-none p-0 font-mono font-bold text-[11px] size-5 rounded-md cursor-pointer transition-all select-none align-middle border ${activeCitationNodeId === "ICA-1872/CH-VI/S-73" ? "bg-indigo-600 text-white border-indigo-650 ring-2 ring-indigo-400 shadow-md scale-105" : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-455 border-indigo-250 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900"}`} title="Click to view Section 73 Citation in Drawer">4{hoveredBadgeIndex === 3 && (<span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 p-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-xl shadow-2xl font-sans leading-relaxed pointer-events-none z-50 border border-slate-800 dark:border-slate-200 text-left font-normal"><span className="block font-extrabold text-[13px] border-b border-slate-855 dark:border-slate-100 pb-1 mb-1.5 font-serif text-white dark:text-slate-950">Section 73, ICA</span><span className="block text-[11.5px] text-slate-300 dark:text-slate-650">Grants right to damages to injured parties for contract breach loss.</span><span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900 dark:border-t-white" /></span>)}</button>, strictly guides that any party suffering from a contractual breach is entitled to receive compensation for direct damages caused, reflecting our claims on structural materials.
                </p>

                <p className="indent-8 text-justify">
                  Should this public dispute escalate, we stand prepared to file under the consumer disputes channels. According to <strong>Section 35 of the Consumer Protection Act, 2019</strong><button id="citation-marker-5" onClick={() => handleBadgeClick("CPA-2019/CH-IV/S-35", 4)} onMouseEnter={() => setHoveredBadgeIndex(4)} onMouseLeave={() => setHoveredBadgeIndex(null)} className={`relative inline-flex items-center justify-center text-center leading-none p-0 font-mono font-bold text-[11px] size-5 rounded-md cursor-pointer transition-all select-none align-middle border ${activeCitationNodeId === "CPA-2019/CH-IV/S-35" ? "bg-indigo-600 text-white border-indigo-650 ring-2 ring-indigo-400 shadow-md scale-105" : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-455 border-indigo-250 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900"}`} title="Click to view Section 35 Citation in Drawer">5{hoveredBadgeIndex === 4 && (<span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 p-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs rounded-xl shadow-2xl font-sans leading-relaxed pointer-events-none z-50 border border-slate-800 dark:border-slate-200 text-left font-normal"><span className="block font-extrabold text-[13px] border-b border-slate-855 dark:border-slate-100 pb-1 mb-1.5 font-serif text-white dark:text-slate-950">Section 35, CPA</span><span className="block text-[11.5px] text-slate-300 dark:text-slate-650">Rules regarding how and when a customer files complaints with the District Commission.</span><span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900 dark:border-t-white" /></span>)}</button>, a complaint regarding deficient public services can be initiated directly with the District Commission.
                </p>

                <div className="pt-12 text-right text-sm">
                  <p className="font-semibold text-slate-800 dark:text-white">Yours Faithfully,</p>
                  <p className="text-slate-500 italic mt-6">Tirth Gondaliya</p>
                  <p className="text-xs text-slate-400">Delhi Citizen Initiative Forum</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Side: Standalone Citation Drawer */}
        <CitationDrawer
          citations={MOCK_CITATIONS}
          activeCitationNodeId={activeCitationNodeId}
          onCitationSelect={handleDrawerSelection}
        />
        
      </div>
    </div>
  )
}
