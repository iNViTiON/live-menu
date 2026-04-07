<script lang="ts">
  import { onMount } from 'svelte';
  import type { Language } from '@live-menu/shared';

  let { languages, selectedLanguage, onLanguageChange, scrollY = 0 }: {
    languages: Language[];
    selectedLanguage: string;
    onLanguageChange: (code: string) => void;
    scrollY?: number;
  } = $props();

  let expanded = $state(false);

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

  // Active language first, then base, then sort_order
  const ordered = $derived(
    [...languages].sort((a, b) => {
      if (a.code === selectedLanguage) return -1;
      if (b.code === selectedLanguage) return 1;
      if (a.is_base) return -1;
      if (b.is_base) return 1;
      return a.sort_order - b.sort_order;
    })
  );

  // Collapse when language changes (covers idle reset, manual selection)
  $effect(() => {
    selectedLanguage;
    expanded = false;
  });

  function handleClick(code: string) {
    if (!expanded) {
      expanded = true;
    } else {
      onLanguageChange(code);
      // expanded will be set to false by the $effect above
    }
  }

  // Close on outside click
  function onDocClick(e: MouseEvent) {
    if (!expanded) return;
    const switcher = document.querySelector('.lang-switcher');
    if (switcher && !switcher.contains(e.target as Node)) {
      expanded = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  });

  // Interpolate from large (top) → normal (scrolled 150px)
  const t = $derived(Math.min(1, scrollY / 150));
  const fontSize = $derived(2 - t * 1);
  const btnSize = $derived(3.5 - t * 1.75);
  const gap = $derived(0.7 - t * 0.35);

  // Stacked offset for collapsed buttons (px)
  const stackOffset = 6;
</script>

{#if languages.length > 1}
  <div class="lang-switcher" class:expanded style:gap={expanded ? `${gap}rem` : '0px'}>
    {#each ordered as lang, i (lang.code)}
      {@const isActive = lang.code === selectedLanguage}
      {@const collapsed = !expanded && !isActive}
      {#if textLabels[lang.code]}
        <button
          class="lang-btn lang-text"
          class:active={isActive}
          class:collapsed
          onclick={() => handleClick(lang.code)}
          title={lang.display_name}
          aria-label={lang.display_name}
          aria-pressed={isActive}
          style:font-size="{fontSize * 0.32}rem"
          style:height="{btnSize}rem"
          style:--stack-offset="{collapsed ? i * stackOffset : 0}px"
          style:z-index={isActive ? 10 : 10 - i}
        >
          {#each textLabels[lang.code].split('\n') as line}
            <span>{line}</span>
          {/each}
        </button>
      {:else}
        <button
          class="lang-btn"
          class:active={isActive}
          class:collapsed
          onclick={() => handleClick(lang.code)}
          title={lang.display_name}
          aria-label={lang.display_name}
          aria-pressed={isActive}
          style:font-size="{fontSize}rem"
          style:width="{btnSize}rem"
          style:height="{btnSize}rem"
          style:--stack-offset="{collapsed ? i * stackOffset : 0}px"
          style:z-index={isActive ? 10 : 10 - i}
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
    align-items: flex-end;
    z-index: 100;
    transition: gap 0.25s ease-out;
  }

  .lang-btn {
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(4px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    position: relative;
    transition:
      font-size 0.15s ease-out,
      width 0.15s ease-out,
      height 0.15s ease-out,
      margin-top 0.25s ease-out,
      opacity 0.25s ease-out;
  }

  .lang-btn.collapsed {
    margin-top: calc(-100% + var(--stack-offset));
    pointer-events: none;
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

  .lang-btn.lang-text.collapsed {
    margin-top: calc(-100% + var(--stack-offset));
  }

  .lang-btn:hover {
    transform: scale(1.1);
  }

  .lang-btn.collapsed:hover {
    transform: none;
  }

  .lang-btn.active {
    box-shadow: 0 0 0 2px #fff;
  }

  .lang-switcher:not(.expanded) .lang-btn.active {
    box-shadow: none;
  }
</style>
