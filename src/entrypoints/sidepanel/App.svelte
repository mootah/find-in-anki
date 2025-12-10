<script lang="ts">
  import SearchInterface from "../../lib/SearchInterface.svelte";

  async function openCard(cardId: number) {
    try {
      await browser.runtime.sendMessage({
        type: "openCard",
        cardId,
      });
      // Do not close sidepanel after opening card
    } catch (err) {
      console.error(`Error opening card: ${(err as Error).message}`);
    }
  }
  function openSettings() {
    browser.runtime.openOptionsPage();
  }
</script>

<SearchInterface
  onOpenCard={openCard}
  onOpenSettings={openSettings}
  enableRealtimeSearch={true}
/>
