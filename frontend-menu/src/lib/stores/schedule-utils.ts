export interface AvailabilityRule {
  id: number;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  day_sun: number;
  day_mon: number;
  day_tue: number;
  day_wed: number;
  day_thu: number;
  day_fri: number;
  day_sat: number;
}

const DAY_KEYS: (keyof AvailabilityRule)[] = [
  'day_sun',
  'day_mon',
  'day_tue',
  'day_wed',
  'day_thu',
  'day_fri',
  'day_sat',
];

/**
 * Check if a menu item is currently visible based on its schedule.
 *
 * Logic:
 * 1. Date window (schedule_start / schedule_end) — AND with rules
 *    - If schedule_start is set and now < schedule_start → hidden
 *    - If schedule_end is set and now >= schedule_end → hidden
 * 2. Availability rules — OR'd together
 *    - If no rules → visible (default)
 *    - If rules exist, at least one must match current day + time
 *
 * @param schedule_start ISO datetime string or null
 * @param schedule_end ISO datetime string or null
 * @param rules Array of availability rules
 * @param now Current date/time (pass explicitly for testability)
 */
export function isScheduleVisible(
  schedule_start: string | null,
  schedule_end: string | null,
  rules: AvailabilityRule[],
  now: Date
): boolean {
  // Check date window
  if (schedule_start !== null && now < new Date(schedule_start)) return false;
  if (schedule_end !== null && now >= new Date(schedule_end)) return false;

  // Check availability rules (OR logic; no rules = always visible)
  if (rules.length === 0) return true;

  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;

  return rules.some((rule) => {
    // Check if today's day flag is set
    if (!rule[DAY_KEYS[dayOfWeek]]) return false;
    // Check time: start_time <= currentTime < end_time
    return currentTime >= rule.start_time && currentTime < rule.end_time;
  });
}
