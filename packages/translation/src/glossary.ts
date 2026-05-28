/**
 * packages/translation/src/glossary.ts
 * Owner: Megh Patel (Team E — Indic)
 * Scaffolded by: Maharshi Patel (Team C — Translator Agent integration)
 *
 * Implements the glossary lookup API consumed by the Translator Agent.
 *
 * Key design decisions (RFC-indic-legal-glossary.md §6):
 *   1. Exact node match → entries where entry.node_id is in input.node_ids
 *   2. Term match      → entries matching term_en (case-insensitive)
 *   3. Domain fallback → high-frequency approved terms for domain
 *   4. No match        → return missing lists, never throw
 *
 * Citation markers [CITE:...] must NEVER appear in glossary entry text.
 * Post-processing (postprocess.ts) must protect them as well.
 *
 * JSON loading: We use readFileSync with __dirname (CJS-compatible).
 * The translation package's tsconfig compiles to CommonJS so __dirname is available.
 */

import type { PageIndexNodeId, SnapshotId, SupportedLanguage } from "@trionic/shared";
import { readFileSync } from "fs";
import { join } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IndicLanguage = Exclude<SupportedLanguage, "en">;

export type GlossaryStatus = "approved" | "needs_review" | "deprecated";

export interface GlossaryEntry {
  /** Stable glossary entry ID, e.g. "hi-ica-1872-consideration". */
  id: string;
  /** English source term or phrase. */
  term_en: string;
  /** Approved target-language legal translation. */
  term_indic: string;
  /** Target language for this entry. */
  language: IndicLanguage;
  /** PageIndex node that defines or strongly supports this term, when known. */
  node_id?: PageIndexNodeId;
  /** Snapshot of the legal source used for this entry, when known. */
  snapshot_id?: SnapshotId;
  /** Act code, e.g. "ICA-1872", "CPA-2019", "RTI-2005". */
  act_code?: string;
  /** Legal domain used for search and eval grouping. */
  domain?: "contract" | "consumer" | "rti" | "employment" | "procedure" | "general";
  /** Whether the term is ready to enforce as a hard glossary constraint. */
  status: GlossaryStatus;
  /** Optional reviewer note for ambiguous terms. */
  notes?: string;
}

export interface GlossaryLookupInput {
  /** Citation nodes present in the draft, usually collected from [CITE:<node_id>] markers. */
  node_ids: PageIndexNodeId[];
  /** Target Indic language. */
  target_language: IndicLanguage;
  /** Optional fallback terms extracted from the draft text. */
  terms?: string[];
  /** Optional domain hint from Classifier or Planner. */
  domain?: GlossaryEntry["domain"];
}

export interface GlossaryLookupResult {
  /** Entries matching cited nodes or requested terms. */
  entries: GlossaryEntry[];
  /** Cited nodes for which no glossary entry was found. */
  missing_node_ids: PageIndexNodeId[];
  /** Terms requested by the caller but not present in the glossary. */
  missing_terms: string[];
  /** True when lookup completed normally. False only in fallback mode. */
  glossary_available: boolean;
}

// ─── Glossary file loading ────────────────────────────────────────────────────

/** Lazily-loaded glossary cache per language. */
const glossaryCache = new Map<IndicLanguage, GlossaryEntry[]>();

/**
 * Load glossary entries for a language from the JSON seed file.
 * Returns an empty array if the file does not exist yet (graceful degradation).
 *
 * Uses __dirname (CJS) for portable path resolution.
 * In test/vitest environments the glossary is mocked, so this path is never hit.
 */
function loadGlossary(language: IndicLanguage): GlossaryEntry[] {
  if (glossaryCache.has(language)) {
    return glossaryCache.get(language)!;
  }

  try {
    // __dirname points to the compiled dist/src directory in a CJS build.
    // In source (ts-node / vitest), __dirname points to packages/translation/src.
    // Either way, going up one level gets us to packages/translation/, and data/ is there.
    const dataDir = join(__dirname, "..", "data");
    const filePath = join(dataDir, `glossary.${language}.json`);
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as GlossaryEntry[];
    glossaryCache.set(language, data);
    return data;
  } catch {
    console.warn(
      `[translation/glossary] No glossary file found for language "${language}". ` +
        "Running in degraded mode — no glossary constraints will be applied."
    );
    glossaryCache.set(language, []);
    return [];
  }
}

// ─── lookupGlossary ───────────────────────────────────────────────────────────

/**
 * Look up glossary entries for the given citation nodes and/or terms.
 *
 * Called by the Translator Agent before each LLM translation call.
 * Never throws — returns `glossary_available: false` on any error.
 *
 * Lookup priority (RFC §6):
 *   1. Exact node_id match
 *   2. Case-insensitive term_en match (when input.terms is provided)
 *   3. Domain fallback for approved high-frequency terms
 *   4. Deduplicate results before returning
 */
export async function lookupGlossary(
  input: GlossaryLookupInput
): Promise<GlossaryLookupResult> {
  try {
    const allEntries = loadGlossary(input.target_language);

    if (allEntries.length === 0) {
      return {
        entries: [],
        missing_node_ids: input.node_ids,
        missing_terms: input.terms ?? [],
        glossary_available: false,
      };
    }

    const matched = new Map<string, GlossaryEntry>(); // keyed by entry.id to deduplicate

    // Rule 1 — Exact node_id match
    const inputNodeSet = new Set(input.node_ids);
    const matchedNodeIds = new Set<string>();

    for (const entry of allEntries) {
      if (entry.node_id && inputNodeSet.has(entry.node_id)) {
        matched.set(entry.id, entry);
        matchedNodeIds.add(entry.node_id);
      }
    }

    // Rule 2 — Case-insensitive term_en match
    const matchedTerms = new Set<string>();
    if (input.terms && input.terms.length > 0) {
      const lowerTerms = input.terms.map((t) => t.toLowerCase());
      for (const entry of allEntries) {
        const idx = lowerTerms.indexOf(entry.term_en.toLowerCase());
        if (idx >= 0) {
          matched.set(entry.id, entry);
          matchedTerms.add(input.terms[idx]);
        }
      }
    }

    // Rule 3 — Domain fallback: approved high-frequency terms for the domain
    if (input.domain) {
      for (const entry of allEntries) {
        if (entry.domain === input.domain && entry.status === "approved") {
          matched.set(entry.id, entry);
        }
      }
    }

    // Compute missing lists
    const missing_node_ids = input.node_ids.filter((id) => !matchedNodeIds.has(id));
    const missing_terms = (input.terms ?? []).filter((t) => !matchedTerms.has(t));

    return {
      entries: Array.from(matched.values()),
      missing_node_ids,
      missing_terms,
      glossary_available: true,
    };
  } catch (error) {
    console.error("[translation/glossary] lookupGlossary failed:", error);
    return {
      entries: [],
      missing_node_ids: input.node_ids,
      missing_terms: input.terms ?? [],
      glossary_available: false,
    };
  }
}
