import { create } from "zustand";
import type { Document, Citation } from "@trionic/shared";

interface DraftStore {
  // Document state
  document: Document | null;
  content: string;
  citations: Citation[];
  
  // UI State
  isCitationDrawerOpen: boolean;
  
  // Actions
  setDocument: (doc: Document, content: string, citations: Citation[]) => void;
  setContent: (content: string) => void;
  toggleCitationDrawer: () => void;
}

export const useDraftStore = create<DraftStore>((set) => ({
  document: null,
  content: "",
  citations: [],
  isCitationDrawerOpen: true,

  setDocument: (doc, content, citations) => 
    set({ document: doc, content, citations }),
    
  setContent: (content) => 
    set({ content }),
    
  toggleCitationDrawer: () => 
    set((state) => ({ isCitationDrawerOpen: !state.isCitationDrawerOpen })),
}));
