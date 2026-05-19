# RFC: Marathi Translation Pair for Trionic Adalat

**Author:** Swara Jariwala (`@0604-swara`)  
**Team:** E — Indic (`packages/translation`)  
**Lead:** Megh Patel (`@Meghpatel2810`)  
**Status:** Draft  
**Created:** 2026-05-19  
**Target merge:** Week 1 Friday

---

## 1. Context & Why This Matters

This RFC covers the design of the Marathi legal translation pair for Trionic Adalat.

Trionic Adalat is a multilingual AI-powered legal drafting platform grounded in authoritative Indian legal texts using PageIndex retrieval and citation validation.

The Marathi translation layer is responsible for:
- translating legal drafts from English → Marathi
- preserving legal meaning
- preserving PageIndex citations
- maintaining glossary consistency
- preventing hallucinated legal claims

Generic translation systems fail on legal terminology because legal language is context-sensitive and highly structured.

Examples:
- Plaintiff
- Defendant
- Jurisdiction
- Consideration
- Affidavit

Incorrect translations may:
- change legal meaning
- confuse users
- invalidate legal interpretation
- remove citation integrity

The Marathi pair is critical because many users understand Marathi better than English legal terminology.

This module helps make legal drafting accessible while preserving legal reliability.

---

## 2. Objectives

The Marathi translation pair should achieve the following goals:

| Goal ID | Objective |
|---|---|
| G1 | Support English → Marathi legal translation |
| G2 | Preserve PageIndex citations in translated output |
| G3 | Maintain glossary consistency across translations |
| G4 | Prevent hallucinated legal content |
| G5 | Preserve legal structure and readability |
| G6 | Support multilingual legal accessibility |

---

## 3. Translation Architecture

The Marathi translation layer sits after:
- drafting
- citation validation
- reviewer validation

and before:
- export
- user delivery

### Translation Flow

```text id="w6vw5h"
User Input
    │
    ▼
Classifier Agent
    │
    ▼
Planner Agent
    │
    ▼
PageIndex Retrieval
    │
    ▼
Drafter Agent
    │
    ▼
Citator-Gatekeeper
    │
    ▼
Reviewer Agent
    │
    ▼
Translator Agent (Marathi Pair)
    │
    ▼
Final Marathi Draft