# RFC: Tamil Translation Pair + Indic Evaluation Harness

## Owner
Anshul Jangid

## Team
Indic

## Problem Statement

Legal translation for Indic languages is difficult because:
- legal terminology is domain-specific
- direct translation loses meaning
- Tamil uses a different script family
- rendering inconsistencies can break readability

## Goals

- Support Tamil legal translation pair
- Build Indic evaluation harness
- Preserve legal terminology fidelity
- Ensure citation-backed translations
- Handle Tamil script rendering correctly in frontend

## Non Goals

- Full multilingual support
- OCR improvements
- Speech translation

## Proposed Architecture

### Translation Pipeline
- Source text retrieved using PageIndex
- Citation node IDs attached
- Translation routed through provider layer
- Glossary-aware translation enforcement
- Citator gatekeeper validates citations

### Indic Evaluation Harness
Metrics:
- terminology accuracy
- citation retention
- hallucination rate
- script rendering validation
- BLEU / COMET / human review

### Tamil Rendering Considerations

Tamil differs from Devanagari-based scripts.

Frontend must:
- use Unicode-safe rendering
- support Tamil glyph shaping
- avoid font fallback corruption
- test across browsers/devices

Recommended fonts:
- Noto Sans Tamil
- Latha
- Catamaran

Potential issues:
- glyph clipping
- line-height inconsistencies
- mixed-script rendering bugs
- search/tokenization issues

## Risks

- mistranslation of legal terminology
- hallucinated legal claims
- rendering inconsistencies
- provider inconsistency

## Open Questions

- Which translation provider performs best for Tamil legal text?
- Should glossary enforcement happen pre-translation or post-translation?
- Should Tamil-specific tokenization be added?

## Success Metrics

- citation retention > 99%
- reduced hallucination rate
- accurate legal terminology translation
- consistent Tamil rendering across browsers