<script lang="ts">
  import type { Language } from '@live-menu/shared';

  let { languages, selectedLanguage, onLanguageChange, scrollY = 0 }: {
    languages: Language[];
    selectedLanguage: string;
    onLanguageChange: (code: string) => void;
    scrollY?: number;
  } = $props();

  // Codes that should show text labels instead of flag emoji (e.g. to avoid displaying a country flag)
  const textLabels: Record<string, string> = {
    RU: 'Українська\nРусский'
  };

  // Convert country code to flag emoji (e.g. GB -> 🇬🇧)
  function toFlag(code: string): string {
    return code
      .toUpperCase()
      .split('')
      .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
      .join('');
  }

  // Sort: base (GB) first, then by sort_order
  const sorted = $derived(
    [...languages].sort((a, b) => {
      if (a.is_base) return -1;
      if (b.is_base) return 1;
      return a.sort_order - b.sort_order;
    })
  );

  // Interpolate from large (top) → normal (scrolled 150px)
  // ~70% of original: large=2rem/3.5rem, small=1rem/1.75rem
  const t = $derived(Math.min(1, scrollY / 150));
  const fontSize = $derived(2 - t * 1);
  const btnSize = $derived(3.5 - t * 1.75);
  const gap = $derived(0.7 - t * 0.35);
</script>

{#if languages.length > 1}
  <div class="lang-switcher" style:gap="{gap}rem">
    {#each sorted as lang (lang.code)}
      {#if textLabels[lang.code]}
        <button
          class="lang-btn lang-text"
          class:active={selectedLanguage === lang.code}
          onclick={() => onLanguageChange(lang.code)}
          title={lang.display_name}
          aria-label={lang.display_name}
          aria-pressed={selectedLanguage === lang.code}
          style:font-size="{fontSize * 0.32}rem"
          style:height="{btnSize}rem"
        >
          {#each textLabels[lang.code].split('\n') as line}
            <span>{line}</span>
          {/each}
        </button>
      {:else}
        <button
          class="lang-btn"
          class:active={selectedLanguage === lang.code}
          onclick={() => onLanguageChange(lang.code)}
          title={lang.display_name}
          aria-label={lang.display_name}
          aria-pressed={selectedLanguage === lang.code}
          style:font-size="{fontSize}rem"
          style:width="{btnSize}rem"
          style:height="{btnSize}rem"
        >
          {toFlag(lang.code)}
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .lang-switcher {
    position: fixed;
    top: calc(1rem + env(safe-area-inset-top, 0px));
    right: calc(1rem + env(safe-area-inset-right, 0px));
    display: flex;
    flex-direction: column;
    z-index: 100;
  }

  .lang-btn {
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: font-size 0.15s ease-out, width 0.15s ease-out, height 0.15s ease-out;
  }

  .lang-btn.lang-text {
    border-radius: 1rem;
    flex-direction: column;
    padding: 0.15rem 0.5rem;
    width: auto;
    line-height: 1.2;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
  }

  .lang-btn:hover {
    transform: scale(1.1);
  }

  .lang-btn.active {
    box-shadow: 0 0 0 2px #fff;
  }
</style>
