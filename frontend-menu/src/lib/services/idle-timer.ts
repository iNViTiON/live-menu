export interface IdleTimerOptions {
  timeoutMs: number;
  warningMs: number;
  onWarning: () => void;
  onDismiss: () => void;
  onIdle: () => void;
  /** Called when user interaction resumes after idle fired. */
  onActivity?: () => void;
  /** Return false to suppress the warning and silently restart the countdown. */
  shouldWarn?: () => boolean;
}

export function createIdleTimer(options: IdleTimerOptions): { start: () => () => void } {
  const { timeoutMs, warningMs, onWarning, onDismiss, onIdle, onActivity, shouldWarn } = options;
  let warningTimer: ReturnType<typeof setTimeout> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let isWarning = false;
  let isFiredIdle = false;

  function reset() {
    if (warningTimer !== null) clearTimeout(warningTimer);
    if (idleTimer !== null) clearTimeout(idleTimer);

    if (isFiredIdle) {
      isFiredIdle = false;
      if (onActivity) onActivity();
    }

    if (isWarning) {
      isWarning = false;
      onDismiss();
    }

    warningTimer = setTimeout(() => {
      if (shouldWarn && !shouldWarn()) {
        reset();
        return;
      }
      isWarning = true;
      onWarning();
    }, timeoutMs - warningMs);

    idleTimer = setTimeout(() => {
      isWarning = false;
      isFiredIdle = true;
      onIdle();
    }, timeoutMs);
  }

  function start(): () => void {
    const events = ['touchstart', 'touchmove', 'scroll', 'click', 'mousemove'];
    events.forEach((e) => document.addEventListener(e, reset, { passive: true }));
    // Don't start timers immediately — wait for first user interaction.

    return () => {
      if (warningTimer !== null) clearTimeout(warningTimer);
      if (idleTimer !== null) clearTimeout(idleTimer);
      events.forEach((e) => document.removeEventListener(e, reset));
    };
  }

  return { start };
}
