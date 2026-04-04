import type { MenuItemWithDetails } from '@live-menu/shared';

/**
 * Filter menu items by selected traits (intersection: item must have ALL selected traits).
 */
export function filterItems(
  items: MenuItemWithDetails[],
  selectedTraits: Map<number, number>
): MenuItemWithDetails[] {
  const selected = [...selectedTraits.values()];
  if (selected.length === 0) return items;
  return items.filter((item) =>
    selected.every((traitId) => item.traits.some((t) => t.id === traitId))
  );
}

/**
 * Get localized name with fallback chain: selectedLang -> baseLang -> first available -> ''.
 */
export function getName(
  names: { language_code: string; name: string }[],
  selectedLang: string,
  baseLang = 'GB'
): string {
  return (
    names.find((n) => n.language_code === selectedLang)?.name ??
    names.find((n) => n.language_code === baseLang)?.name ??
    names[0]?.name ??
    ''
  );
}

/**
 * Get localized description with fallback chain: selectedLang -> baseLang -> first available -> null.
 */
export function getDescription(
  names: { language_code: string; description: string | null }[],
  selectedLang: string,
  baseLang = 'GB'
): string | null {
  const m =
    names.find((n) => n.language_code === selectedLang) ??
    names.find((n) => n.language_code === baseLang) ??
    names[0];
  return m?.description ?? null;
}

/**
 * Format price from integer cents to display string (e.g. 650 -> "€6.50").
 */
export function formatPrice(cents: number, currency: string): string {
  return `${currency}${(cents / 100).toFixed(2)}`;
}

/**
 * Format price delta from integer cents (e.g. 50 -> "+€0.50", 0 -> null).
 */
export function formatDelta(cents: number, currency: string): string | null {
  if (cents === 0) return null;
  return `+${currency}${(cents / 100).toFixed(2)}`;
}

/**
 * Toggle a trait selection (single-select per group). Returns new Map.
 */
export function toggleTrait(
  selectedTraits: Map<number, number>,
  groupId: number,
  traitId: number
): Map<number, number> {
  const current = selectedTraits.get(groupId);
  const next = new Map(selectedTraits);
  if (current === traitId) next.delete(groupId);
  else next.set(groupId, traitId);
  return next;
}
