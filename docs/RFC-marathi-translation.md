# RFC: Marathi Translation Pair for Trionic Adalat

**Author:** Swara Jariwala (`@0604-swara`)  
**Team:** E — Indic (`packages/translation`)  
**Lead:** Megh Patel (`@Meghpatel2810`)  
**Status:** Draft  
**Created:** 2026-05-19  
**Target merge:** Week 1 Friday

---

# 1. What

This RFC defines the Marathi legal translation pair for Trionic Adalat.

The module enables:
- English → Marathi legal translation
- citation-preserving translation
- glossary-aware legal terminology handling
- hallucination prevention
- legally consistent multilingual drafting

The Marathi translation pair will integrate into the existing Trionic Adalat drafting pipeline after:
- retrieval
- drafting
- citation validation
- reviewer validation

and before:
- export
- final user delivery

This RFC also defines:
- glossary integration strategy
- fallback handling for missing legal terms
- evaluation metrics
- Marathi script rendering considerations

---

# 2. Why

Trionic Adalat is a multilingual AI-powered legal drafting platform grounded in authoritative Indian legal texts using PageIndex retrieval and citation validation.

Generic translation systems perform poorly on legal text because legal terminology is:
- context-sensitive
- structurally rigid
- jurisdiction-dependent

Examples:
- Plaintiff
- Defendant
- Jurisdiction
- Affidavit
- Consideration

Incorrect legal translation may:
- change legal meaning
- invalidate interpretation
- confuse end users
- break citation reliability
- introduce hallucinated legal claims

The Marathi translation pair is important because many users are more comfortable reading legal information in Marathi than English.

The goal is to improve legal accessibility while preserving:
- legal precision
- terminology consistency
- citation integrity
- multilingual readability

---

# 3. Objectives

| Goal ID | Objective |
|---|---|
| G1 | Support English → Marathi legal translation |
| G2 | Preserve PageIndex citations in translated output |
| G3 | Maintain glossary consistency across translations |
| G4 | Prevent hallucinated legal content |
| G5 | Preserve legal structure and readability |
| G6 | Support multilingual legal accessibility |
| G7 | Support glossary-based terminology enforcement |
| G8 | Ensure Marathi Unicode rendering compatibility |

---

# 4. Translation Architecture

The Marathi translation layer sits after:
- drafting
- citation validation
- reviewer validation

and before:
- export
- user delivery

## Translation Flow

```text
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
```

---

# 5. Legal Glossary Integration

The Marathi translation pair will integrate with Megh’s Legal Glossary Schema RFC.

The glossary layer will:
- standardize legal terminology
- prevent inconsistent translations
- preserve domain-specific legal meaning
- enforce approved Marathi legal equivalents

## Proposed Integration Flow

```text
Draft Segment
      │
      ▼
Glossary Lookup
      │
      ├── Match Found
      │       ▼
      │   Approved Marathi Term
      │
      └── No Match
              ▼
Fallback Translation Strategy
```

## Example Glossary Entries

| English Term | Marathi Translation |
|---|---|
| Plaintiff | फिर्यादी |
| Defendant | प्रतिवादी |
| Affidavit | प्रतिज्ञापत्र |
| Jurisdiction | अधिकार क्षेत्र |
| Petition | याचिका |

---

# 6. Citation-Preserving Translation

PageIndex citations must remain unchanged during translation.

## Example

### Input

```text
The Plaintiff filed an affidavit before the District Court. [PageIndex:102]
```

### Output

```text
फिर्यादीने जिल्हा न्यायालयात प्रतिज्ञापत्र दाखल केले. [PageIndex:102]
```

## Citation Preservation Rules

- PageIndex values must never be modified
- citation ordering must remain intact
- translation must not remove references
- translated output must preserve citation mapping

---

# 7. Fallback Strategy for Missing Legal Terms

If a legal term is unavailable in the glossary:

## Priority Order

1. Approved glossary term
2. Context-aware Marathi legal equivalent
3. Transliteration
4. Human-review escalation

## Example

| Scenario | Fallback |
|---|---|
| Unknown procedural term | transliteration |
| Ambiguous legal phrase | human review |
| Missing jurisdiction-specific term | contextual translation |

## Escalation Conditions

Human review should trigger when:
- translation confidence is low
- legal ambiguity is detected
- multiple interpretations exist
- citation alignment becomes uncertain

---

# 8. Hallucination Prevention

The Marathi translation layer must not:
- invent statutes
- generate unsupported claims
- alter retrieved legal meaning
- fabricate legal references

## Safeguards

- translation only after retrieval validation
- glossary-constrained decoding
- citation locking
- reviewer verification
- deterministic translation mode for legal sections

---

# 9. Evaluation Metrics

The Marathi translation pair should be evaluated using:

| Metric | Purpose |
|---|---|
| BLEU Score | Translation quality |
| COMET Score | Semantic preservation |
| Terminology Accuracy | Glossary consistency |
| Citation Preservation Rate | Citation integrity |
| Hallucination Rate | Unsupported content detection |
| Human Legal Review Score | Legal correctness |
| Marathi Readability Score | End-user accessibility |

## Acceptance Targets

| Metric | Target |
|---|---|
| Citation Preservation | 100% |
| Terminology Consistency | ≥ 95% |
| Hallucination Rate | ≤ 1% |
| Legal Review Approval | ≥ 90% |

---

# 10. Marathi Script & Frontend Rendering

Frontend systems must support proper Marathi Unicode rendering.

## Requirements

- UTF-8 encoding
- Devanagari-compatible fonts
- cross-browser rendering validation
- mobile readability support
- PDF export compatibility

## Recommended Fonts

- Noto Sans Devanagari
- Mukta
- Hind
- Poppins (fallback support)

## Rendering Validation

The frontend must verify:
- character alignment
- ligature rendering
- citation visibility
- export fidelity
- OCR readability for generated PDFs

---

# 11. Risks & Challenges

| Risk | Description |
|---|---|
| Legal ambiguity | Multiple valid Marathi interpretations |
| Missing glossary terms | New legal terminology may appear |
| Hallucinated output | LLM may invent unsupported text |
| Citation corruption | Formatting issues may alter references |
| Rendering issues | Marathi Unicode compatibility problems |

---

# 12. Future Enhancements

Future improvements may include:
- bidirectional Marathi ↔ English translation
- multilingual legal glossary expansion
- judge-specific terminology handling
- legal tone adaptation
- regional Marathi dialect support
- human-in-the-loop reviewer tooling

---

# 13. Close Issue

This RFC proposes the Marathi legal translation pair architecture for Trionic Adalat with:
- glossary-aware translation
- citation-preserving output
- hallucination prevention
- Marathi rendering support
- evaluation metrics for legal reliability

The implementation will improve multilingual legal accessibility while maintaining legal correctness and citation integrity.

## Proposed Next Steps

1. Finalize glossary schema integration
2. Implement translation middleware
3. Add citation-locking validation
4. Create Marathi evaluation benchmark dataset
5. Begin Week-2 implementation and testing

---

# 14. References

- Trionic Adalat Architecture RFC
- Megh Legal Glossary Schema RFC
- PageIndex Retrieval RFC
- Indic Legal Translation Research Papers
- Unicode Devanagari Rendering Guidelines