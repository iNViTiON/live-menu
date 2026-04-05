<script lang="ts">
  import { fade, scale } from 'svelte/transition';

  let {
    visible,
    secondsLeft,
    title,
    hint,
  }: {
    visible: boolean;
    secondsLeft: number;
    title: string;
    hint: string;
  } = $props();

  const TOTAL_SECONDS = 5;
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const dashOffset = $derived(
    CIRCUMFERENCE * (1 - Math.max(0, Math.min(TOTAL_SECONDS, secondsLeft)) / TOTAL_SECONDS)
  );
</script>

{#if visible}
  <div class="overlay" aria-modal="true" role="alertdialog" aria-label={title} transition:fade={{ duration: 200 }}>
    <div class="card" transition:scale={{ duration: 300, start: 0.92 }}>
      <h2 class="title">{title}</h2>

      <div class="ring-wrap">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          aria-hidden="true"
        >
          <!-- Background ring -->
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="#e8dfd0"
            stroke-width="8"
          />
          <!-- Progress ring, rotated so it starts at 12 o'clock -->
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="#7c5c2e"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray={CIRCUMFERENCE}
            stroke-dashoffset={dashOffset}
            transform="rotate(-90 70 70)"
            style="transition: stroke-dashoffset 0.9s linear;"
          />
        </svg>
        <span class="countdown" aria-live="assertive" aria-atomic="true">{secondsLeft}</span>
      </div>

      <p class="hint">{hint}</p>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(58, 46, 30, 0.75);
    backdrop-filter: blur(8px);
    pointer-events: none;
  }

  .card {
    background: #f5f0e8;
    border-radius: 1.5rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    padding: 3rem 3.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    pointer-events: none;
  }

  .title {
    font-size: 2rem;
    font-weight: 700;
    color: #3a2e1e;
    margin: 0;
    text-align: center;
    line-height: 1.2;
  }

  .ring-wrap {
    position: relative;
    width: 140px;
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ring-wrap svg {
    position: absolute;
    inset: 0;
  }

  .countdown {
    position: relative;
    font-size: 5rem;
    font-weight: 700;
    color: #7c5c2e;
    line-height: 1;
    text-align: center;
    /* ensure the number sits on top of the SVG */
    z-index: 1;
  }

  .hint {
    font-size: 1rem;
    color: #7a6a5a;
    margin: 0;
    text-align: center;
    line-height: 1.5;
  }
</style>
