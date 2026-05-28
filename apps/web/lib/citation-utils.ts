/**
 * apps/web/lib/citation-utils.ts
 * Helper functions for parsing PageIndex Node IDs and formatting them as legal breadcrumbs.
 */

export interface ParsedCitationNode {
  actCode: string;
  actName: string;
  chapterCode: string;
  chapterName: string;
  sectionCode: string;
  sectionName: string;
  rest: string[];
}

// Mapping of common legal Act abbreviations to their full descriptive names
const ACT_MAP: Record<string, string> = {
  'IPC': 'Indian Penal Code',
  'IPC-1860': 'Indian Penal Code',
  'RTI': 'Right to Information Act',
  'RTI-2005': 'Right to Information Act',
  'ICA': 'Indian Contract Act',
  'ICA-1872': 'Indian Contract Act',
  'CPA': 'Consumer Protection Act',
  'CPA-2019': 'Consumer Protection Act',
  'CRPC': 'Code of Criminal Procedure',
  'CRPC-1973': 'Code of Criminal Procedure',
  'COI': 'Constitution of India',
  'COI-1950': 'Constitution of India',
};

/**
 * Parses a PageIndexNodeId string into its components.
 * Format: "<ACT_CODE>/<CHAPTER>/<SECTION>/..."
 * Example: "IPC-1860/CH-XVI/S-375"
 */
export function parseNodeId(nodeId: string): ParsedCitationNode {
  const parts = nodeId.split('/');
  const actPart = parts[0] || '';
  const chapterPart = parts[1] || '';
  const sectionPart = parts[2] || '';
  const rest = parts.slice(3);

  const actCode = actPart.split('-')[0] || actPart;
  const actName = ACT_MAP[actPart] || ACT_MAP[actCode] || actPart;

  // Format Chapter (e.g., CH-XVI -> Chapter XVI)
  let chapterName = chapterPart;
  if (chapterPart.toUpperCase().startsWith('CH-')) {
    chapterName = `Chapter ${chapterPart.substring(3)}`;
  } else if (chapterPart.toLowerCase().startsWith('chapter-')) {
    chapterName = `Chapter ${chapterPart.substring(8)}`;
  }

  // Format Section (e.g., S-375 -> Section 375)
  let sectionName = sectionPart;
  if (sectionPart.toUpperCase().startsWith('S-')) {
    sectionName = `Section ${sectionPart.substring(2)}`;
  } else if (sectionPart.toLowerCase().startsWith('section-')) {
    sectionName = `Section ${sectionPart.substring(8)}`;
  }

  return {
    actCode,
    actName,
    chapterCode: chapterPart,
    chapterName,
    sectionCode: sectionPart,
    sectionName,
    rest,
  };
}

/**
 * Converts a PageIndexNodeId into a highly readable breadcrumb string.
 * Example: "IPC-1860/CH-XVI/S-375" -> "Indian Penal Code › Chapter XVI › Section 375"
 */
export function formatNodeIdToBreadcrumb(nodeId: string): string {
  const parsed = parseNodeId(nodeId);
  const segments: string[] = [parsed.actName];
  if (parsed.chapterName) segments.push(parsed.chapterName);
  if (parsed.sectionName) segments.push(parsed.sectionName);
  if (parsed.rest.length > 0) {
    // Join any extra sub-nodes (like Explanation, Clause, etc.)
    segments.push(...parsed.rest.map(r => r.replace(/^[A-Z]+-/, '')));
  }
  return segments.join(' › ');
}
