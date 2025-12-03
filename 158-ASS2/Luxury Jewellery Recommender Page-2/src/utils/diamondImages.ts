/**
 * Utility for mapping diamond shapes to local diamond images.
 * Maps diamond shapes to the 9 diamond images in public/images/diamonds/
 */

const SHAPE_TO_IMAGE_MAP: Record<string, string> = {
  'round': '/images/diamonds/round-diamond.jpeg',
  'round brilliant': '/images/diamonds/round-diamond.jpeg',
  'oval': '/images/diamonds/oval-diamond.webp',
  'emerald': '/images/diamonds/emerald-diamod.webp',
  'cushion': '/images/diamonds/cushion-diamond.jpeg',
  'heart': '/images/diamonds/heart-diamond.webp',
  'pear': '/images/diamonds/pear-diamond.webp',
  'teardrop': '/images/diamonds/pear-diamond.webp',
  'asscher': '/images/diamonds/asscher-diamond.webp',
  'marquise': '/images/diamonds/marquise-diamond.webp',
  'navette': '/images/diamonds/marquise-diamond.webp',
  'radiant': '/images/diamonds/radiant-diamond.webp',
  'princess': '/images/diamonds/round-diamond.jpeg', // Fallback since no princess image available
};

/**
 * Get the diamond image path for a given shape.
 * 
 * @param shape - The diamond shape (e.g., "Round Brilliant", "emerald", "Cushion")
 * @returns The path to the diamond image, or round-diamond.jpeg as default
 */
export function getDiamondImage(shape: string): string {
  if (!shape) {
    return '/images/diamonds/round-diamond.jpeg';
  }

  const normalized = shape.toLowerCase().trim();
  
  // Try exact match first
  if (SHAPE_TO_IMAGE_MAP[normalized]) {
    return SHAPE_TO_IMAGE_MAP[normalized];
  }
  
  // Sort keys by length (longest first) to match specific shapes before generic ones
  // This prevents "round brilliant" from matching "round" first
  const sortedKeys = Object.keys(SHAPE_TO_IMAGE_MAP).sort((a, b) => b.length - a.length);
  
  // Try partial matches (only check if normalized contains key, not bidirectional)
  // This ensures "Round Brilliant" matches "round brilliant" not "round"
  for (const key of sortedKeys) {
    if (normalized.includes(key)) {
      return SHAPE_TO_IMAGE_MAP[key];
    }
  }
  
  // Default fallback to round diamond
  return '/images/diamonds/round-diamond.jpeg';
}

