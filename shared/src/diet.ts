import { z } from 'zod';

/**
 * Dietary needs we can check against OpenStreetMap `diet:*` tags.
 * Allergies are separate: OSM has no reliable allergen data, so allergies are
 * never "confirmed" — they always get a "confirm with the restaurant" notice.
 */
export const DIET_NEEDS = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'halal',
  'kosher',
  'lactose_free',
  'pescetarian',
] as const;
export const DietNeedSchema = z.enum(DIET_NEEDS);
export type DietNeed = z.infer<typeof DietNeedSchema>;

export const ALLERGEN_NOTICE = 'Always confirm allergens directly with the restaurant.';

export const DIET_LABELS: Record<DietNeed, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  gluten_free: 'Gluten-free',
  halal: 'Halal',
  kosher: 'Kosher',
  lactose_free: 'Lactose-free',
  pescetarian: 'Pescetarian',
};
