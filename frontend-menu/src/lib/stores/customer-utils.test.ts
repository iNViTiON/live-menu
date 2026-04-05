import { describe, it, expect } from 'vitest';
import type { MenuItemWithDetails } from '@live-menu/shared';
import {
  filterItems,
  getName,
  getDescription,
  formatPrice,
  formatDelta,
  toggleTrait,
} from './customer-utils';

// --- Test helpers ---

function makeItem(id: number, traitIds: number[]): MenuItemWithDetails {
  return {
    id,
    sort_order: id,
    is_visible: true,
    base_price: 500,
    created_at: 0,
    updated_at: 0,
    names: [],
    media: [],
    traits: traitIds.map((tid) => ({
      id: tid,
      sort_order: tid,
      created_at: 0,
      updated_at: 0,
      names: [],
    })),
    optionGroups: [],
  };
}

// --- filterItems ---

describe('filterItems', () => {
  const items = [
    makeItem(1, [10, 20]),
    makeItem(2, [10, 30]),
    makeItem(3, [20, 30]),
    makeItem(4, [10, 20, 30]),
  ];

  it('returns all items when no traits selected', () => {
    expect(filterItems(items, new Map())).toEqual(items);
  });

  it('filters by a single trait', () => {
    const selected = new Map([[1, 10]]); // group 1 -> trait 10
    const result = filterItems(items, selected);
    expect(result.map((i) => i.id)).toEqual([1, 2, 4]);
  });

  it('filters by intersection of multiple traits', () => {
    const selected = new Map([
      [1, 10],
      [2, 20],
    ]);
    const result = filterItems(items, selected);
    expect(result.map((i) => i.id)).toEqual([1, 4]);
  });

  it('returns empty when no items match', () => {
    const itemsSingle = [makeItem(1, [10])];
    const selected = new Map([[1, 99]]);
    expect(filterItems(itemsSingle, selected)).toEqual([]);
  });

  it('handles empty items array', () => {
    const selected = new Map([[1, 10]]);
    expect(filterItems([], selected)).toEqual([]);
  });
});

// --- getName ---

describe('getName', () => {
  const names = [
    { language_code: 'GB', name: 'English Name' },
    { language_code: 'DE', name: 'German Name' },
    { language_code: 'FR', name: 'French Name' },
  ];

  it('returns exact language match', () => {
    expect(getName(names, 'DE')).toBe('German Name');
  });

  it('falls back to GB when selected language not found', () => {
    expect(getName(names, 'JP')).toBe('English Name');
  });

  it('falls back to first available when neither selected nor GB found', () => {
    const noGB = [
      { language_code: 'DE', name: 'German' },
      { language_code: 'FR', name: 'French' },
    ];
    expect(getName(noGB, 'JP')).toBe('German');
  });

  it('returns empty string for empty names array', () => {
    expect(getName([], 'GB')).toBe('');
  });

  it('uses custom base language', () => {
    const customNames = [
      { language_code: 'US', name: 'US English' },
      { language_code: 'FR', name: 'French' },
    ];
    expect(getName(customNames, 'JP', 'US')).toBe('US English');
  });
});

// --- getDescription ---

describe('getDescription', () => {
  const names = [
    { language_code: 'GB', description: 'English desc' },
    { language_code: 'DE', description: 'German desc' },
    { language_code: 'FR', description: null },
  ];

  it('returns exact language match', () => {
    expect(getDescription(names, 'DE')).toBe('German desc');
  });

  it('falls back to GB when selected language not found', () => {
    expect(getDescription(names, 'JP')).toBe('English desc');
  });

  it('returns null when description is null', () => {
    expect(getDescription(names, 'FR')).toBeNull();
  });

  it('falls back to first available when neither selected nor GB found', () => {
    const noGB = [{ language_code: 'DE', description: 'German desc' }];
    expect(getDescription(noGB, 'JP')).toBe('German desc');
  });

  it('returns null for empty names array', () => {
    expect(getDescription([], 'GB')).toBeNull();
  });
});

// --- formatPrice ---

describe('formatPrice', () => {
  it('formats cents to currency string', () => {
    expect(formatPrice(650, '€')).toBe('€6.50');
  });

  it('formats zero', () => {
    expect(formatPrice(0, '€')).toBe('€0.00');
  });

  it('formats large amounts', () => {
    expect(formatPrice(1050, '€')).toBe('€10.50');
  });

  it('formats round amounts', () => {
    expect(formatPrice(500, '€')).toBe('€5.00');
  });

  it('works with different currency symbols', () => {
    expect(formatPrice(999, '$')).toBe('US$9.99');
  });

  it('formats single cent', () => {
    expect(formatPrice(1, '€')).toBe('€0.01');
  });
});

// --- formatDelta ---

describe('formatDelta', () => {
  it('formats positive delta with plus sign', () => {
    expect(formatDelta(50, '€')).toBe('+€0.50');
  });

  it('returns null for zero delta', () => {
    expect(formatDelta(0, '€')).toBeNull();
  });

  it('formats larger positive delta', () => {
    expect(formatDelta(100, '€')).toBe('+€1.00');
  });

  it('formats with different currency', () => {
    expect(formatDelta(250, '$')).toBe('+US$2.50');
  });
});

// --- toggleTrait ---

describe('toggleTrait', () => {
  it('adds a trait to empty selection', () => {
    const result = toggleTrait(new Map(), 1, 10);
    expect(result.get(1)).toBe(10);
    expect(result.size).toBe(1);
  });

  it('replaces trait in same group (single-select)', () => {
    const initial = new Map([[1, 10]]);
    const result = toggleTrait(initial, 1, 20);
    expect(result.get(1)).toBe(20);
    expect(result.size).toBe(1);
  });

  it('deselects trait when toggled again', () => {
    const initial = new Map([[1, 10]]);
    const result = toggleTrait(initial, 1, 10);
    expect(result.has(1)).toBe(false);
    expect(result.size).toBe(0);
  });

  it('adds traits across different groups', () => {
    const initial = new Map([[1, 10]]);
    const result = toggleTrait(initial, 2, 20);
    expect(result.get(1)).toBe(10);
    expect(result.get(2)).toBe(20);
    expect(result.size).toBe(2);
  });

  it('does not mutate the original map', () => {
    const initial = new Map([[1, 10]]);
    const result = toggleTrait(initial, 2, 20);
    expect(initial.size).toBe(1);
    expect(result.size).toBe(2);
  });
});
