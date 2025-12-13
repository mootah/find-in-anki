<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Icon from "@iconify/svelte";
  import type { CardResult } from "../types/anki";

  interface SearchInterfaceProps {
    onOpenCard: (cardId: number) => void;
    onOpenSettings?: () => void;
    onOpenSidePanel?: () => void;
    enableRealtimeSearch?: boolean;
  }

  let {
    onOpenCard,
    onOpenSettings,
    onOpenSidePanel,
    enableRealtimeSearch = false,
  }: SearchInterfaceProps = $props();

  let searchText = $state("");
  let results: CardResult[] = $state([]);
  let loading = $state(false);
  let error = $state("");
  let activeProfileId = "default";
  let searchInput: HTMLInputElement;

  /**
   * Apply theme to the HTML element
   */
  function applyTheme(theme: string) {
    const html = document.documentElement;
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      html.setAttribute("data-theme", isDark ? "dark" : "light");
    } else {
      html.setAttribute("data-theme", theme as "light" | "dark");
    }
  }

  onMount(async () => {
    try {
      // Get last search text and settings from background script
      const [searchResponse, settingsResponse] = await Promise.all([
        browser.runtime.sendMessage({
          type: "getLastSearchText",
        }),
        browser.runtime.sendMessage({
          type: "getSettings",
        }),
      ]);

      searchText = searchResponse.searchText || "";

      if (settingsResponse && settingsResponse.settings) {
        activeProfileId = settingsResponse.settings.activeProfileId;
        // Apply theme when loaded
        applyTheme(settingsResponse.settings.theme);
      }

      // Auto-search if we have search text
      if (searchText) {
        await performSearch();
      }

      // Enable realtime search if requested
      if (enableRealtimeSearch) {
        browser.storage.session.onChanged.addListener(handleStorageChange);
      }
    } catch (err) {
      console.error("Error on mount:", err);
      error = `Initialization error: ${(err as Error).message}`;
    }
  });

  onDestroy(() => {
    if (enableRealtimeSearch) {
      browser.storage.session.onChanged.removeListener(handleStorageChange);
    }
  });

  function handleStorageChange(changes: any) {
    if (changes.lastSearchText?.newValue) {
      searchText = changes.lastSearchText.newValue;
      performSearch();
    }
  }

  async function performSearch() {
    results = [];

    if (!searchText.trim()) {
      error = "Please enter search text";
      return;
    }

    loading = true;
    error = "";

    try {
      // Use search for both single and multiple rules
      const response = await browser.runtime.sendMessage({
        type: "search",
        selectedText: searchText,
        profileId: activeProfileId,
      });

      if (response && response.error) {
        error = response.error;
      } else if (response) {
        results = response.cards || [];
      } else {
        error = "No response from background script";
      }
    } catch (err) {
      error = `Error: ${(err as Error).message}`;
    } finally {
      loading = false;
    }
  }

  async function openCard(cardId: number) {
    try {
      onOpenCard(cardId);
      // Close popup after opening card if needed
    } catch (err) {
      error = `Error opening card: ${(err as Error).message}`;
    }
  }

  async function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      await performSearch();
      searchInput.focus();
    }
  }

  async function handleInputChange() {
    const response = await browser.runtime.sendMessage({
      type: "updateSelection",
      selectedText: searchText,
      profileId: activeProfileId,
    });
    console.debug("Input value changed:", response);
  }

  function openSettings() {
    if (onOpenSettings) {
      onOpenSettings();
    }
  }

  function openSidePanel() {
    if (onOpenSidePanel) {
      onOpenSidePanel();
    }
  }
</script>

<main class="search-main">
  <div class="search-container">
    <input
      type="text"
      bind:value={searchText}
      bind:this={searchInput}
      onkeydown={handleKeydown}
      onchange={handleInputChange}
      placeholder="Search cards..."
      class="search-input"
      disabled={loading}
    />
    <button
      onclick={performSearch}
      disabled={loading}
      class="search-button"
      title="Search (Enter)"
      aria-label="Search"
    >
      <Icon icon="mdi:magnify" />
    </button>
    {#if onOpenSidePanel}
      <button
        onclick={openSidePanel}
        disabled={loading}
        class="sidepanel-button"
        title="Open Side Panel"
        aria-label="Open Side Panel"
      >
        <Icon icon="material-symbols:side-navigation" hFlip={true} />
      </button>
    {/if}
    {#if onOpenSettings}
      <button
        onclick={openSettings}
        disabled={loading}
        class="settings-button"
        title="Settings"
        aria-label="Settings"
      >
        <Icon icon="mdi:cog" />
      </button>
    {/if}
  </div>

  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="loading">
      <Icon icon="svg-spinners:3-dots-scale" width="64" height="64" />
    </div>
  {:else if results.length === 0 && searchText.trim()}
    <div class="no-results">No cards found</div>
  {:else if results.length > 0}
    <div class="results">
      {#each results as result (result.cardId)}
        <button class="result-item" onclick={() => openCard(result.cardId)}>
          <div class="result-content">
            {#each result.highlightedContent as content}
              <span class:highlighted={content.highlighted}>{content.text}</span
              >
            {/each}
          </div>
          <div class="result-footer">
            <div class="result-footer-item">
              <Icon icon="ion:file-tray-outline" />
              {result.deckName}
            </div>
            <div class="result-footer-item">
              <Icon icon="mdi:note-outline" />
              {result.noteType}
            </div>
            <div class="result-footer-item">
              <Icon icon="mdi:text" />
              {result.fieldName}
            </div>
          </div>
        </button>
      {/each}
    </div>
    <div class="result-count">
      Found {results.length} card{results.length !== 1 ? "s" : ""}
    </div>
  {/if}
</main>

<style>
  :global(html) {
    color-scheme: light dark;
  }

  .highlighted {
    background-color: #fff34c;
    padding: 0 2px;
    border-radius: 2px;
    color: black;
  }

  .search-main {
    width: 100%;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
    color: var(--color-bg);
    display: flex;
    flex-direction: column;
    height: 100vh; /* sidepanel用に全高 */
  }

  .search-container {
    display: flex;
    gap: 8px;
    padding: 12px;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 10;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid var(--color-input-border);
    border-radius: 4px;
    font-size: 14px;
    background: var(--color-input-bg);
    color: var(--color-text);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-button-hover-border);
    box-shadow: 0 0 0 2px var(--color-focus-shadow);
  }

  .search-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .search-button,
  .settings-button,
  .sidepanel-button {
    padding: 8px 10px;
    background: var(--color-button-bg);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
  }

  .search-button :global(svg),
  .settings-button :global(svg),
  .sidepanel-button :global(svg) {
    width: 20px;
    height: 20px;
  }

  .search-button:hover:not(:disabled),
  .settings-button:hover:not(:disabled),
  .sidepanel-button:hover:not(:disabled) {
    background: var(--color-button-hover-bg);
    border-color: var(--color-button-hover-border);
  }

  .search-button:disabled,
  .settings-button:disabled,
  .sidepanel-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    padding: 12px;
    background: var(--color-error-bg);
    color: var(--color-error-text);
    border-radius: 4px;
    margin: 12px;
    font-size: 13px;
    flex-shrink: 0;
  }

  .loading {
    text-align: center;
    padding: 40px 20px;
    color: var(--color-muted);
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .no-results {
    text-align: center;
    padding: 40px 20px;
    color: var(--color-muted-secondary);
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  .result-item {
    width: 100%;
    padding: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .result-item:hover {
    background: var(--color-button-hover-bg);
    border-color: var(--color-button-hover-border);
  }

  .result-footer {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    font-size: 12px;
    font-weight: normal;
  }

  .result-footer-item {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--color-muted);
  }

  .result-content {
    text-align: left;
    font-size: 13px;
    line-height: 1.4;
    word-break: break-word;
  }

  .result-count {
    padding: 8px;
    text-align: center;
    font-size: 12px;
    color: var(--color-muted-secondary);
    border-top: 1px solid var(--color-border);
    margin-top: 8px;
  }
</style>
