import { describe, it, expect } from 'vitest';
import { isScheduleVisible } from './schedule-utils';
import type { AvailabilityRule } from './schedule-utils';

// --- Test helpers ---

function makeRule(overrides: Partial<AvailabilityRule> = {}): AvailabilityRule {
  return {
    id: 1,
    start_time: '09:00',
    end_time: '17:00',
    day_sun: 0,
    day_mon: 0,
    day_tue: 0,
    day_wed: 0,
    day_thu: 0,
    day_fri: 0,
    day_sat: 0,
    ...overrides,
  };
}

// Helper to create a Date at a specific day/time for testing
// dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat
function makeDate(isoString: string): Date {
  return new Date(isoString);
}

// --- Date window tests ---

describe('isScheduleVisible — date window', () => {
  it('no schedule (null/null) → always visible', () => {
    const now = makeDate('2026-06-15T12:00:00');
    expect(isScheduleVisible(null, null, [], now)).toBe(true);
  });

  it('schedule_start in future → hidden', () => {
    const now = makeDate('2026-01-01T12:00:00');
    expect(isScheduleVisible('2026-06-01T09:00:00', null, [], now)).toBe(false);
  });

  it('schedule_start in past, no end → visible', () => {
    const now = makeDate('2026-06-15T12:00:00');
    expect(isScheduleVisible('2026-01-01T00:00:00', null, [], now)).toBe(true);
  });

  it('schedule_end in past → hidden', () => {
    const now = makeDate('2026-06-15T12:00:00');
    expect(isScheduleVisible(null, '2026-01-01T00:00:00', [], now)).toBe(false);
  });

  it('within date window → visible', () => {
    const now = makeDate('2026-06-15T12:00:00');
    expect(isScheduleVisible('2026-06-01T00:00:00', '2026-06-30T23:59:00', [], now)).toBe(true);
  });

  it('before date window → hidden', () => {
    const now = makeDate('2026-05-01T12:00:00');
    expect(isScheduleVisible('2026-06-01T00:00:00', '2026-06-30T23:59:00', [], now)).toBe(false);
  });

  it('after date window → hidden', () => {
    const now = makeDate('2026-07-15T12:00:00');
    expect(isScheduleVisible('2026-06-01T00:00:00', '2026-06-30T23:59:00', [], now)).toBe(false);
  });
});

// --- Availability rule tests ---

describe('isScheduleVisible — availability rules', () => {
  it('no rules → visible (default)', () => {
    const now = makeDate('2026-06-15T12:00:00'); // Monday
    expect(isScheduleVisible(null, null, [], now)).toBe(true);
  });

  it('rule matches current day + time → visible', () => {
    // 2026-06-15 is a Monday
    const now = makeDate('2026-06-15T12:00:00');
    const rule = makeRule({ day_mon: 1, start_time: '09:00', end_time: '17:00' });
    expect(isScheduleVisible(null, null, [rule], now)).toBe(true);
  });

  it('rule does not match current day → hidden', () => {
    // 2026-06-15 is a Monday, rule only on Tuesday
    const now = makeDate('2026-06-15T12:00:00');
    const rule = makeRule({ day_tue: 1, start_time: '09:00', end_time: '17:00' });
    expect(isScheduleVisible(null, null, [rule], now)).toBe(false);
  });

  it('rule does not match current time (too early) → hidden', () => {
    // 2026-06-15 is a Monday
    const now = makeDate('2026-06-15T07:00:00');
    const rule = makeRule({ day_mon: 1, start_time: '09:00', end_time: '17:00' });
    expect(isScheduleVisible(null, null, [rule], now)).toBe(false);
  });

  it('rule does not match current time (too late) → hidden', () => {
    // 2026-06-15 is a Monday
    const now = makeDate('2026-06-15T18:00:00');
    const rule = makeRule({ day_mon: 1, start_time: '09:00', end_time: '17:00' });
    expect(isScheduleVisible(null, null, [rule], now)).toBe(false);
  });

  it('multiple rules, one matches → visible (OR logic)', () => {
    // 2026-06-15 is a Monday at 12:00
    const now = makeDate('2026-06-15T12:00:00');
    const ruleA = makeRule({ id: 1, day_tue: 1, start_time: '09:00', end_time: '17:00' }); // doesn't match (Tuesday)
    const ruleB = makeRule({ id: 2, day_mon: 1, start_time: '10:00', end_time: '14:00' }); // matches
    expect(isScheduleVisible(null, null, [ruleA, ruleB], now)).toBe(true);
  });

  it('multiple rules, none match → hidden', () => {
    // 2026-06-15 is a Monday at 12:00
    const now = makeDate('2026-06-15T12:00:00');
    const ruleA = makeRule({ id: 1, day_tue: 1, start_time: '09:00', end_time: '17:00' }); // wrong day
    const ruleB = makeRule({ id: 2, day_mon: 1, start_time: '14:00', end_time: '18:00' }); // wrong time
    expect(isScheduleVisible(null, null, [ruleA, ruleB], now)).toBe(false);
  });
});

// --- Combined (AND) tests ---

describe('isScheduleVisible — combined (date window AND rules)', () => {
  it('within date window + rule matches → visible', () => {
    // 2026-06-15 is a Monday
    const now = makeDate('2026-06-15T12:00:00');
    const rule = makeRule({ day_mon: 1, start_time: '09:00', end_time: '17:00' });
    expect(isScheduleVisible('2026-06-01T00:00:00', '2026-06-30T23:59:00', [rule], now)).toBe(true);
  });

  it('within date window + no rule matches → hidden', () => {
    // 2026-06-15 is a Monday
    const now = makeDate('2026-06-15T12:00:00');
    const rule = makeRule({ day_tue: 1, start_time: '09:00', end_time: '17:00' }); // wrong day
    expect(isScheduleVisible('2026-06-01T00:00:00', '2026-06-30T23:59:00', [rule], now)).toBe(false);
  });

  it('outside date window + rule matches → hidden', () => {
    // 2026-07-15 is after the window, but rule day/time would match
    const now = makeDate('2026-07-15T12:00:00');
    const rule = makeRule({ day_wed: 1, start_time: '09:00', end_time: '17:00' }); // 2026-07-15 is a Wednesday
    expect(isScheduleVisible('2026-06-01T00:00:00', '2026-06-30T23:59:00', [rule], now)).toBe(false);
  });
});

// --- Edge cases ---

describe('isScheduleVisible — edge cases', () => {
  it('rule at exact start_time boundary → visible', () => {
    // 2026-06-15 is a Monday
    const now = makeDate('2026-06-15T09:00:00');
    const rule = makeRule({ day_mon: 1, start_time: '09:00', end_time: '17:00' });
    expect(isScheduleVisible(null, null, [rule], now)).toBe(true);
  });

  it('rule at exact end_time boundary → hidden (exclusive)', () => {
    // 2026-06-15 is a Monday
    const now = makeDate('2026-06-15T17:00:00');
    const rule = makeRule({ day_mon: 1, start_time: '09:00', end_time: '17:00' });
    expect(isScheduleVisible(null, null, [rule], now)).toBe(false);
  });

  it('midnight-adjacent: rule 23:00-23:59', () => {
    // 2026-06-15 is a Monday at 23:30
    const now = makeDate('2026-06-15T23:30:00');
    const rule = makeRule({ day_mon: 1, start_time: '23:00', end_time: '23:59' });
    expect(isScheduleVisible(null, null, [rule], now)).toBe(true);
  });

  it('midnight-adjacent: rule 00:00-06:00', () => {
    // 2026-06-15 is a Monday at 03:00
    const now = makeDate('2026-06-15T03:00:00');
    const rule = makeRule({ day_mon: 1, start_time: '00:00', end_time: '06:00' });
    expect(isScheduleVisible(null, null, [rule], now)).toBe(true);
  });

  it('all days disabled → hidden', () => {
    const now = makeDate('2026-06-15T12:00:00');
    const rule = makeRule({
      start_time: '00:00',
      end_time: '23:59',
      day_sun: 0, day_mon: 0, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0,
    });
    expect(isScheduleVisible(null, null, [rule], now)).toBe(false);
  });

  it('schedule_start exactly at now → visible (inclusive)', () => {
    const now = makeDate('2026-06-15T09:00:00');
    expect(isScheduleVisible('2026-06-15T09:00:00', null, [], now)).toBe(true);
  });

  it('schedule_end exactly at now → hidden (exclusive)', () => {
    const now = makeDate('2026-06-15T17:00:00');
    expect(isScheduleVisible(null, '2026-06-15T17:00:00', [], now)).toBe(false);
  });
});
