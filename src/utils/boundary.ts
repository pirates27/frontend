/**
 * Utility functions for parsing boundary coordinates from property descriptions
 * and cleaning descriptions for presentation and form fields.
 */

export const parseBoundaryFromDescription = (desc: string | undefined | null): [number, number][] | null => {
  if (!desc) return null;

  try {
    // 1. Try standard format first: [BOUNDS]: [[lng,lat],[lng,lat],...]
    // Using a greedy/correct regex to capture the entire array
    const match = desc.match(/\[BOUNDS\]:\s*(\[\[.*?\]\])/);
    if (match?.[1]) {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed standard parse of bounds', e);
  }

  try {
    // 2. Fallback: Search for any coordinate-like array of arrays of numbers in the string.
    // This parses even if [BOUNDS]: is corrupted or partially deleted (e.g. ",[lng,lat],[lng,lat]...]]")
    const coordRegex = /\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g;
    const points: [number, number][] = [];
    let match;
    while ((match = coordRegex.exec(desc)) !== null) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lng) && !isNaN(lat)) {
        points.push([lng, lat]);
      }
    }
    if (points.length >= 3) {
      return points;
    }
  } catch (e) {
    console.warn('Failed fallback parse of bounds', e);
  }

  return null;
};

export const cleanDescription = (desc: string | undefined | null): string => {
  if (!desc) return '';
  // Remove standard BOUNDS tag
  let cleaned = desc.replace(/\[BOUNDS\]:\s*\[\[.*?\]\]/g, '');
  // Remove old incorrect format tag if any
  cleaned = cleaned.replace(/\[BOUNDS\]:\s*\[.*?\]/g, '');
  // Remove any trailing or leftover coordinate lists like: ,[81.78...,17.03...],[...]...]]
  cleaned = cleaned.replace(/(?:,\s*)?\[\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\](?:\s*,\s*\[\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\])*\s*\]+/g, '');
  return cleaned.trim();
};
