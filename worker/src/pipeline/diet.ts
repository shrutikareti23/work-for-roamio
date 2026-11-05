import {
  ALLERGEN_NOTICE,
  DIET_LABELS,
  DIET_NEEDS,
  type DietNeed,
  type Traveler,
} from '@roamio/shared';

/**
 * Diet filtering against OpenStreetMap `diet:*` tags.
 * OSM values: "yes" / "only" (offers it), "limited" (a few options), "no".
 * Missing tag = we don't know, so we never claim it's OK.
 */

export type NeedStatus = 'yes' | 'limited' | 'no' | 'unknown';

/** Overall result for one restaurant against the group's combined needs. */
export type DietVerdict =
  | 'confirmed' // every need is tagged yes/only
  | 'limited' // every need is covered, but some only "limited"
  | 'unconfirmed' // at least one need has no data
  | 'excluded'; // at least one need is tagged "no"

export type DietBadge = { need: DietNeed; label: string; status: NeedStatus };

export type DietResult = {
  verdict: DietVerdict;
  badges: DietBadge[];
  /** Free-text allergies listed so the card can say they are NOT verified. */
  allergies: string[];
  /** Shown on every card that has any diet or allergy badge. */
  notice: string | null;
};

export type GroupNeeds = { needs: DietNeed[]; allergies: string[] };

/**
 * The group's needs = everyone's needs together (a restaurant must work for ALL
 * travelers). If one is vegetarian and another vegan, the group needs both.
 */
export function combineNeeds(travelers: readonly Traveler[]): GroupNeeds {
  const needs = new Set<DietNeed>();
  const allergies = new Map<string, string>();
  for (const t of travelers) {
    t.diet.forEach((d) => needs.add(d));
    for (const a of t.allergies) {
      const key = a.trim().toLowerCase();
      if (key && !allergies.has(key)) allergies.set(key, a.trim());
    }
  }
  return {
    needs: DIET_NEEDS.filter((n) => needs.has(n)), // stable order
    allergies: [...allergies.values()],
  };
}

function fromTag(value: string | undefined): NeedStatus {
  switch (value?.trim().toLowerCase()) {
    case 'yes':
    case 'only':
      return 'yes';
    case 'limited':
      return 'limited';
    case 'no':
      return 'no';
    default:
      return 'unknown';
  }
}

function cuisines(tags: Record<string, string>): string[] {
  return (tags.cuisine ?? '')
    .split(';')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

const RANK: Record<NeedStatus, number> = { no: 0, unknown: 1, limited: 2, yes: 3 };
const best = (a: NeedStatus, b: NeedStatus): NeedStatus => (RANK[a] >= RANK[b] ? a : b);

/** Status of one need, including safe implications (a vegan menu is vegetarian too). */
export function needStatus(tags: Record<string, string>, need: DietNeed): NeedStatus {
  const direct = fromTag(tags[`diet:${need}`]);
  if (direct === 'no') return 'no'; // an explicit "no" always wins
  const c = cuisines(tags);
  let s: NeedStatus = direct;
  const vegan = best(fromTag(tags['diet:vegan']), c.includes('vegan') ? 'yes' : 'unknown');
  const vegetarian = best(
    best(fromTag(tags['diet:vegetarian']), c.includes('vegetarian') ? 'yes' : 'unknown'),
    vegan === 'no' ? 'unknown' : vegan,
  );
  if (need === 'vegan') s = best(s, vegan);
  if (need === 'vegetarian') s = best(s, vegetarian);
  if (need === 'pescetarian') s = best(s, vegetarian === 'no' ? 'unknown' : vegetarian);
  return s;
}

export function evaluateDiet(tags: Record<string, string>, group: GroupNeeds): DietResult {
  const badges: DietBadge[] = group.needs.map((need) => ({
    need,
    label: DIET_LABELS[need],
    status: needStatus(tags, need),
  }));
  const statuses = badges.map((b) => b.status);
  let verdict: DietVerdict = 'confirmed';
  if (statuses.includes('no')) verdict = 'excluded';
  else if (statuses.includes('unknown')) verdict = 'unconfirmed';
  else if (statuses.includes('limited')) verdict = 'limited';

  const hasBadges = badges.length > 0 || group.allergies.length > 0;
  return {
    verdict,
    badges,
    allergies: group.allergies,
    notice: hasBadges ? ALLERGEN_NOTICE : null,
  };
}

/** Card text for the overall verdict. */
export function verdictLabel(v: DietVerdict): string {
  return {
    confirmed: 'Diet confirmed by map data',
    limited: 'Limited options for your diet',
    unconfirmed: 'Diet unconfirmed',
    excluded: "Doesn't fit your diet",
  }[v];
}
