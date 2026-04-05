import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createIdleTimer } from './idle-timer';

// ---------------------------------------------------------------------------
// Test notes
// ---------------------------------------------------------------------------
// These tests target the **Phase 4 warning-aware** createIdleTimer API:
//
//   createIdleTimer({
//     timeoutMs,     // total idle window (e.g. 60_000)
//     warningMs,     // how long before timeoutMs the warning fires (e.g. 5_000)
//     onWarning,     // fired at (timeoutMs - warningMs)
//     onDismiss,     // fired if user interacts during the warning phase
//     onIdle,        // fired at full timeoutMs
//   }): { start(): () => void }
//
// The current main-tree implementation uses the legacy positional signature
// `createIdleTimer(timeoutMs, onIdle)`, so this file WILL fail to type-check
// and run until the Frontend agent's Phase 4b changes are merged. That is
// expected — Lead runs these after merge at Phase 5.
//
// Because this project's frontend-menu does not have a DOM test environment
// configured (no jsdom / happy-dom), we stub `document` manually via
// `vi.stubGlobal`. The stub is a minimal event-target that tracks listeners
// and lets us synthesise interaction events via `dispatchDocumentEvent`.
// ---------------------------------------------------------------------------

type Listener = (ev: Event) => void;

interface DocStub {
  addEventListener: (type: string, listener: Listener, opts?: unknown) => void;
  removeEventListener: (type: string, listener: Listener) => void;
  /** Test-only helper: synchronously fire an event on the stub */
  __fire: (type: string) => void;
  /** Test-only helper: how many listeners are currently registered */
  __listenerCount: () => number;
}

function makeDocStub(): DocStub {
  const listeners = new Map<string, Set<Listener>>();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    __fire(type) {
      const fns = listeners.get(type);
      if (!fns) return;
      // Clone to avoid mutation-during-iteration if a handler removes itself
      for (const fn of [...fns]) {
        fn(new Event(type));
      }
    },
    __listenerCount() {
      let total = 0;
      for (const set of listeners.values()) total += set.size;
      return total;
    },
  };
}

let doc: DocStub;

beforeEach(() => {
  vi.useFakeTimers();
  doc = makeDocStub();
  vi.stubGlobal('document', doc);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// onWarning / onIdle timing
// ---------------------------------------------------------------------------

describe('createIdleTimer — warning + idle timing', () => {
  it('fires onWarning at (timeoutMs - warningMs)', () => {
    const onWarning = vi.fn();
    const onIdle = vi.fn();
    const onDismiss = vi.fn();

    const timer = createIdleTimer({
      timeoutMs: 10_000,
      warningMs: 3_000,
      onWarning,
      onDismiss,
      onIdle,
    });
    timer.start();

    // Just before the warning should fire
    vi.advanceTimersByTime(6_999);
    expect(onWarning).not.toHaveBeenCalled();
    expect(onIdle).not.toHaveBeenCalled();

    // Crossing the warning threshold
    vi.advanceTimersByTime(1);
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onIdle).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('fires onIdle at the full timeoutMs if no interaction dismisses the warning', () => {
    const onWarning = vi.fn();
    const onIdle = vi.fn();
    const onDismiss = vi.fn();

    const timer = createIdleTimer({
      timeoutMs: 10_000,
      warningMs: 3_000,
      onWarning,
      onDismiss,
      onIdle,
    });
    timer.start();

    // Advance into the warning phase
    vi.advanceTimersByTime(7_000);
    expect(onWarning).toHaveBeenCalledTimes(1);

    // Advance to exactly timeoutMs total
    vi.advanceTimersByTime(3_000);
    expect(onIdle).toHaveBeenCalledTimes(1);
    // onIdle fires once only
    expect(onIdle).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Dismiss during warning phase
// ---------------------------------------------------------------------------

describe('createIdleTimer — dismiss during warning phase', () => {
  it('fires onDismiss on interaction while warning is active, and onIdle does NOT fire', () => {
    const onWarning = vi.fn();
    const onIdle = vi.fn();
    const onDismiss = vi.fn();

    const timer = createIdleTimer({
      timeoutMs: 10_000,
      warningMs: 3_000,
      onWarning,
      onDismiss,
      onIdle,
    });
    timer.start();

    // Enter warning phase
    vi.advanceTimersByTime(7_000);
    expect(onWarning).toHaveBeenCalledTimes(1);

    // User taps during the warning
    doc.__fire('click');
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // Time passes equal to the remaining idle window from the pre-reset state
    // — onIdle MUST NOT fire because the timer has been reset.
    vi.advanceTimersByTime(3_000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('after dismiss, a full new cycle starts (warning fires again at timeoutMs - warningMs from reset)', () => {
    const onWarning = vi.fn();
    const onIdle = vi.fn();
    const onDismiss = vi.fn();

    const timer = createIdleTimer({
      timeoutMs: 10_000,
      warningMs: 3_000,
      onWarning,
      onDismiss,
      onIdle,
    });
    timer.start();

    // Enter warning and dismiss
    vi.advanceTimersByTime(7_000);
    doc.__fire('click');
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // Fresh 10s countdown begins. Advance 7s → warning should fire again.
    vi.advanceTimersByTime(7_000);
    expect(onWarning).toHaveBeenCalledTimes(2);

    // And another 3s → idle fires now.
    vi.advanceTimersByTime(3_000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('multiple interactions during a single warning cycle only fire onDismiss once', () => {
    // The warning phase ends after the first dismiss (timer resets to full).
    // Any further taps are pre-warning interactions that just reset the timer
    // without firing onDismiss again.
    const onWarning = vi.fn();
    const onIdle = vi.fn();
    const onDismiss = vi.fn();

    const timer = createIdleTimer({
      timeoutMs: 10_000,
      warningMs: 3_000,
      onWarning,
      onDismiss,
      onIdle,
    });
    timer.start();

    // Enter warning
    vi.advanceTimersByTime(7_000);
    expect(onWarning).toHaveBeenCalledTimes(1);

    // Two rapid taps — second tap lands in the fresh 10s window, not a warning
    doc.__fire('click');
    doc.__fire('click');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Pre-warning interactions
// ---------------------------------------------------------------------------

describe('createIdleTimer — interaction before warning phase', () => {
  it('interaction before warning phase does NOT fire onDismiss', () => {
    const onWarning = vi.fn();
    const onIdle = vi.fn();
    const onDismiss = vi.fn();

    const timer = createIdleTimer({
      timeoutMs: 10_000,
      warningMs: 3_000,
      onWarning,
      onDismiss,
      onIdle,
    });
    timer.start();

    // Well before the warning phase would start
    vi.advanceTimersByTime(3_000);
    doc.__fire('click');

    expect(onDismiss).not.toHaveBeenCalled();
    expect(onWarning).not.toHaveBeenCalled();
  });

  it('pre-warning interaction resets the countdown so warning fires later', () => {
    const onWarning = vi.fn();
    const onIdle = vi.fn();
    const onDismiss = vi.fn();

    const timer = createIdleTimer({
      timeoutMs: 10_000,
      warningMs: 3_000,
      onWarning,
      onDismiss,
      onIdle,
    });
    timer.start();

    // 3s in, user taps — timer restarts
    vi.advanceTimersByTime(3_000);
    doc.__fire('click');
    expect(onDismiss).not.toHaveBeenCalled();

    // Only 4s more would be 7s from original start — warning should NOT fire
    vi.advanceTimersByTime(4_000);
    expect(onWarning).not.toHaveBeenCalled();

    // 3s more (7s after reset) — now warning fires
    vi.advanceTimersByTime(3_000);
    expect(onWarning).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Listener binding: all interaction event types should dismiss the warning
// ---------------------------------------------------------------------------

describe('createIdleTimer — interaction event types', () => {
  it.each(['click', 'touchstart', 'touchmove', 'scroll', 'mousemove'])(
    'firing %s during warning phase triggers onDismiss',
    (eventType) => {
      const onWarning = vi.fn();
      const onIdle = vi.fn();
      const onDismiss = vi.fn();

      const timer = createIdleTimer({
        timeoutMs: 10_000,
        warningMs: 3_000,
        onWarning,
        onDismiss,
        onIdle,
      });
      timer.start();

      vi.advanceTimersByTime(7_000);
      expect(onWarning).toHaveBeenCalledTimes(1);

      doc.__fire(eventType);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    },
  );
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

describe('createIdleTimer — cleanup', () => {
  it('start() returns a cleanup function that removes listeners and clears timers', () => {
    const onWarning = vi.fn();
    const onIdle = vi.fn();
    const onDismiss = vi.fn();

    const timer = createIdleTimer({
      timeoutMs: 10_000,
      warningMs: 3_000,
      onWarning,
      onDismiss,
      onIdle,
    });
    const cleanup = timer.start();

    // Sanity: listeners are registered
    expect(doc.__listenerCount()).toBeGreaterThan(0);

    cleanup();

    // All listeners removed
    expect(doc.__listenerCount()).toBe(0);

    // Advance way past any timeout — no callbacks fire
    vi.advanceTimersByTime(60_000);
    expect(onWarning).not.toHaveBeenCalled();
    expect(onIdle).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('after cleanup, synthesised interaction events have no effect', () => {
    const onWarning = vi.fn();
    const onIdle = vi.fn();
    const onDismiss = vi.fn();

    const timer = createIdleTimer({
      timeoutMs: 10_000,
      warningMs: 3_000,
      onWarning,
      onDismiss,
      onIdle,
    });
    const cleanup = timer.start();

    // Enter warning
    vi.advanceTimersByTime(7_000);
    expect(onWarning).toHaveBeenCalledTimes(1);

    cleanup();

    // Post-cleanup click should not fire onDismiss or schedule further work
    doc.__fire('click');
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(onIdle).not.toHaveBeenCalled();
  });
});
