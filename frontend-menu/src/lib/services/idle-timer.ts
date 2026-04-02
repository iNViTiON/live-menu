export function createIdleTimer(timeoutMs: number, onIdle: () => void) {
  let timer: ReturnType<typeof setTimeout>;

  function reset() {
    clearTimeout(timer);
    timer = setTimeout(onIdle, timeoutMs);
  }

  function start() {
    const events = ['touchstart', 'touchmove', 'scroll', 'click', 'mousemove'];
    events.forEach((e) => document.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => document.removeEventListener(e, reset));
    };
  }

  return { start };
}
