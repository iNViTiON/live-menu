export interface IdleTimerOptions {
  timeoutMs: number;
  warningMs: number;
  onWarning: () => void;
  onDismiss: () => void;
  onIdle: () => void;
}

export function createIdleTimer(options: IdleTimerOptions): { start: () => () => void } {
  const { timeoutMs, warningMs, onWarning, onDismiss, onIdle } = options;
  let warningTimer: ReturnType<typeof setTimeout> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let isWarning = false;

  function reset() {
    if (warningTimer !== null) clearTimeout(warningTimer);
    if (idleTimer !== null) clearTimeout(idleTimer);

    if (isWarning) {
      isWarning = false;
      onDismiss();
    }

    warningTimer = setTimeout(() => {
      isWarning = true;
      onWarning();
    }, timeoutMs - warningMs);

    idleTimer = setTimeout(() => {
      isWarning = false;
      onIdle();
    }, timeoutMs);
  }

  function start(): () => void {
    const events = ['touchstart', 'touchmove', 'scroll', 'click', 'mousemove'];
    events.forEach((e) => document.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (warningTimer !== null) clearTimeout(warningTimer);
      if (idleTimer !== null) clearTimeout(idleTimer);
      events.forEach((e) => document.removeEventListener(e, reset));
    };
  }

  return { start };
}
