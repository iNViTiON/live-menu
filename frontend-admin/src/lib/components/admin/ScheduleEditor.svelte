<script lang="ts">
  export interface ScheduleRule {
    id: number;
    start_time: string;
    end_time: string;
    day_sun: number;
    day_mon: number;
    day_tue: number;
    day_wed: number;
    day_thu: number;
    day_fri: number;
    day_sat: number;
  }

  type RuleData = Omit<ScheduleRule, 'id'>;

  interface Props {
    entityId: number;
    scheduleStart: string | null;
    scheduleEnd: string | null;
    rules: ScheduleRule[];
    onSaveSchedule: (start: string | null, end: string | null) => Promise<void>;
    onCreateRule: (data: RuleData) => Promise<void>;
    onUpdateRule: (ruleId: number, data: Partial<RuleData>) => Promise<void>;
    onDeleteRule: (ruleId: number) => Promise<void>;
  }

  let {
    entityId,
    scheduleStart,
    scheduleEnd,
    rules,
    onSaveSchedule,
    onCreateRule,
    onUpdateRule,
    onDeleteRule,
  }: Props = $props();

  // Schedule date inputs
  let localStart = $state('');
  let localEnd = $state('');
  let savingSchedule = $state(false);
  let scheduleError = $state<string | null>(null);

  let initialisedForId = $state<number | null>(null);

  $effect(() => {
    if (initialisedForId !== entityId) {
      initialisedForId = entityId;
      localStart = scheduleStart ? scheduleStart.slice(0, 16) : '';
      localEnd = scheduleEnd ? scheduleEnd.slice(0, 16) : '';
    }
  });

  async function saveSchedule() {
    savingSchedule = true;
    scheduleError = null;
    try {
      await onSaveSchedule(localStart || null, localEnd || null);
    } catch (err: unknown) {
      scheduleError = err instanceof Error ? err.message : 'Failed to save schedule';
    } finally {
      savingSchedule = false;
    }
  }

  // Per-rule state
  let savingRuleId = $state<number | null>(null);
  let ruleError = $state<string | null>(null);

  async function updateRuleField(rule: ScheduleRule, field: string, value: string | number) {
    if (field === 'start_time' || field === 'end_time') {
      const st = field === 'start_time' ? (value as string) : rule.start_time;
      const et = field === 'end_time' ? (value as string) : rule.end_time;
      if (et <= st) {
        ruleError = 'End time must be after start time';
        return;
      }
    }
    ruleError = null;
    savingRuleId = rule.id;
    try {
      await onUpdateRule(rule.id, { [field]: value });
    } catch (err: unknown) {
      ruleError = err instanceof Error ? err.message : 'Failed to update rule';
    } finally {
      savingRuleId = null;
    }
  }

  async function deleteRule(ruleId: number) {
    ruleError = null;
    try {
      await onDeleteRule(ruleId);
    } catch (err: unknown) {
      ruleError = err instanceof Error ? err.message : 'Failed to delete rule';
    }
  }

  // New rule form
  let newStart = $state('09:00');
  let newEnd = $state('17:00');
  // [sun, mon, tue, wed, thu, fri, sat]
  let newDays = $state([false, true, true, true, true, true, false]);
  let addingRule = $state(false);

  async function addRule() {
    if (newEnd <= newStart) {
      ruleError = 'End time must be after start time';
      return;
    }
    ruleError = null;
    addingRule = true;
    try {
      await onCreateRule({
        start_time: newStart,
        end_time: newEnd,
        day_sun: newDays[0] ? 1 : 0,
        day_mon: newDays[1] ? 1 : 0,
        day_tue: newDays[2] ? 1 : 0,
        day_wed: newDays[3] ? 1 : 0,
        day_thu: newDays[4] ? 1 : 0,
        day_fri: newDays[5] ? 1 : 0,
        day_sat: newDays[6] ? 1 : 0,
      });
      newStart = '09:00';
      newEnd = '17:00';
      newDays = [false, true, true, true, true, true, false];
    } catch (err: unknown) {
      ruleError = err instanceof Error ? err.message : 'Failed to add rule';
    } finally {
      addingRule = false;
    }
  }

  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const DAY_KEYS = [
    'day_sun', 'day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat',
  ] as const;
  type DayKey = (typeof DAY_KEYS)[number];
</script>

<details class="schedule-section">
  <summary class="section-summary">Schedule &amp; Availability</summary>

  <div class="section-body">
    <!-- Date Window -->
    <div class="subsection">
      <div class="subsection-title">Schedule <span class="optional-hint">(optional)</span></div>
      <div class="tz-hint">Times in Europe/Tallinn</div>

      {#if scheduleError}
        <div class="error-msg">{scheduleError}</div>
      {/if}

      <div class="date-fields">
        <div class="date-row">
          <label class="field-label" for="sched-start-{entityId}">Start</label>
          <input
            id="sched-start-{entityId}"
            type="datetime-local"
            class="field-input"
            bind:value={localStart}
          />
          <button
            class="btn-clear"
            onclick={() => { localStart = ''; }}
            disabled={!localStart}
            title="Clear start date"
          >×</button>
        </div>
        <div class="date-row">
          <label class="field-label" for="sched-end-{entityId}">End</label>
          <input
            id="sched-end-{entityId}"
            type="datetime-local"
            class="field-input"
            bind:value={localEnd}
          />
          <button
            class="btn-clear"
            onclick={() => { localEnd = ''; }}
            disabled={!localEnd}
            title="Clear end date"
          >×</button>
        </div>
      </div>

      <button class="btn-save" onclick={saveSchedule} disabled={savingSchedule}>
        {savingSchedule ? 'Saving...' : 'Save dates'}
      </button>
    </div>

    <!-- Availability Rules -->
    <div class="subsection">
      <div class="subsection-title">
        Availability Rules
        <span class="optional-hint">(optional — if none, visible all day)</span>
      </div>
      <div class="tz-hint">Times in Europe/Tallinn</div>

      {#if ruleError}
        <div class="error-msg">{ruleError}</div>
      {/if}

      {#each rules as rule (rule.id)}
        <div class="rule-card">
          <div class="rule-header">
            <div class="rule-times">
              <input
                type="time"
                class="time-input"
                value={rule.start_time}
                onblur={(e) => updateRuleField(rule, 'start_time', (e.target as HTMLInputElement).value)}
              />
              <span class="time-sep">–</span>
              <input
                type="time"
                class="time-input"
                value={rule.end_time}
                onblur={(e) => updateRuleField(rule, 'end_time', (e.target as HTMLInputElement).value)}
              />
              {#if savingRuleId === rule.id}
                <span class="saving-text">saving…</span>
              {/if}
            </div>
            <button class="btn-delete-rule" onclick={() => deleteRule(rule.id)}>Delete</button>
          </div>
          <div class="day-toggles">
            {#each DAY_KEYS as dayKey, i (dayKey)}
              <button
                class="day-btn"
                class:active={rule[dayKey as DayKey] === 1}
                onclick={() => updateRuleField(rule, dayKey, rule[dayKey as DayKey] === 1 ? 0 : 1)}
                title={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i]}
              >
                {DAY_LABELS[i]}
              </button>
            {/each}
          </div>
        </div>
      {/each}

      <!-- New rule form -->
      <div class="new-rule-form">
        <div class="new-rule-times">
          <input type="time" class="time-input" bind:value={newStart} />
          <span class="time-sep">–</span>
          <input type="time" class="time-input" bind:value={newEnd} />
        </div>
        <div class="day-toggles">
          {#each DAY_LABELS as label, i (i)}
            <button
              class="day-btn"
              class:active={newDays[i]}
              onclick={() => { newDays[i] = !newDays[i]; }}
            >
              {label}
            </button>
          {/each}
        </div>
        <button class="btn-add-rule" onclick={addRule} disabled={addingRule}>
          {addingRule ? 'Adding…' : '+ Add Rule'}
        </button>
      </div>
    </div>
  </div>
</details>

<style>
  .schedule-section {
    border-top: 1px solid #e0e0e0;
    margin-top: 1rem;
  }

  .section-summary {
    padding: 0.6rem 0;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    color: #444;
    user-select: none;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .section-summary::before {
    content: '▶';
    font-size: 0.65rem;
    transition: transform 0.15s;
    color: #888;
  }

  details[open] .section-summary::before {
    transform: rotate(90deg);
  }

  .section-body {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding-bottom: 0.5rem;
  }

  .subsection {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .subsection-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #555;
  }

  .optional-hint {
    font-weight: 400;
    color: #888;
    font-size: 0.8rem;
  }

  .tz-hint {
    font-size: 0.75rem;
    color: #888;
    margin-top: -0.25rem;
  }

  .error-msg {
    background: #f8d7da;
    color: #721c24;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .date-fields {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .date-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .field-label {
    font-size: 0.8rem;
    color: #666;
    width: 2.5rem;
    flex-shrink: 0;
  }

  .field-input {
    padding: 0.35rem 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    flex: 1;
    min-width: 0;
  }

  .btn-clear {
    padding: 0.25rem 0.5rem;
    background: none;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    color: #888;
    transition: color 0.15s, border-color 0.15s;
  }

  .btn-clear:hover:not(:disabled) {
    color: #333;
    border-color: #999;
  }

  .btn-clear:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .btn-save {
    align-self: flex-start;
    padding: 0.4rem 0.75rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background-color 0.2s;
  }

  .btn-save:hover:not(:disabled) {
    background: #218838;
  }

  .btn-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .rule-card {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 0.6rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: white;
  }

  .rule-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .rule-times {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .time-input {
    padding: 0.3rem 0.4rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    width: 7rem;
  }

  .time-sep {
    color: #999;
    font-size: 0.9rem;
  }

  .saving-text {
    font-size: 0.8rem;
    color: #888;
    font-style: italic;
  }

  .day-toggles {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .day-btn {
    padding: 0.25rem 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 0.8rem;
    color: #666;
    transition: background-color 0.15s, color 0.15s, border-color 0.15s;
    min-width: 2rem;
  }

  .day-btn:hover {
    border-color: #0066cc;
    color: #0066cc;
  }

  .day-btn.active {
    background: #0066cc;
    border-color: #0066cc;
    color: white;
  }

  .btn-delete-rule {
    padding: 0.25rem 0.5rem;
    background: none;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    color: #999;
    transition: color 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }

  .btn-delete-rule:hover {
    color: #c0392b;
    border-color: #c0392b;
  }

  .new-rule-form {
    border: 1px dashed #ddd;
    border-radius: 6px;
    padding: 0.6rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: #fafafa;
  }

  .new-rule-times {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .btn-add-rule {
    align-self: flex-start;
    padding: 0.35rem 0.75rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background-color 0.2s;
  }

  .btn-add-rule:hover:not(:disabled) {
    background: #0052a3;
  }

  .btn-add-rule:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .time-input {
      width: 5.5rem;
      font-size: 0.85rem;
    }

    .rule-header {
      flex-wrap: wrap;
    }

    .day-btn {
      min-width: 2.2rem;
      min-height: 2.2rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn-clear, .btn-delete-rule {
      min-height: 36px;
      min-width: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
