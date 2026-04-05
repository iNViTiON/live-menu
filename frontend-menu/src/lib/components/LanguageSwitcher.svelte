<script lang="ts">
  import type { Language } from '@live-menu/shared';

  let { languages, selectedLanguage, onLanguageChange }: {
    languages: Language[];
    selectedLanguage: string;
    onLanguageChange: (code: string) => void;
  } = $props();

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
</script>

{#if languages.length > 1}
  <div class="lang-switcher">
    {#each sorted as lang (lang.code)}
      <button
        class="lang-btn"
        class:active={selectedLanguage === lang.code}
        onclick={() => onLanguageChange(lang.code)}
        title={lang.display_name}
        aria-label={lang.display_name}
        aria-pressed={selectedLanguage === lang.code}
      >
        {toFlag(lang.code)}
      </button>
    {/each}
  </div>
{/if}

<style>
  .lang-switcher {
    position: fixed;
    top: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    z-index: 100;
  }

  .lang-btn {
    width: 2.5rem;
    height: 2.5rem;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    cursor: pointer;
    font-size: 1.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s;
    padding: 0;
  }

  .lang-btn:hover {
    transform: scale(1.1);
  }

  .lang-btn.active {
    box-shadow: 0 0 0 2px #fff;
  }
</style>
