<script lang="ts">
  import SearchInterface from "../../lib/SearchInterface.svelte";

  async function openCard(cardId: number) {
    try {
      await browser.runtime.sendMessage({
        type: "openCard",
        cardId,
      });
      // Close popup after opening card
      setTimeout(() => window.close(), 500);
    } catch (err) {
      console.error(`Error opening card: ${(err as Error).message}`);
    }
  }

  function openSettings() {
    browser.runtime.openOptionsPage();
    window.close();
  }

  async function openSidePanel() {
    const isFirefox = navigator.userAgent.includes("Firefox");
    // browser.runtime.sendMessage({ type: "openSidePanel" });
    try {
      if (isFirefox) {
        // Firefox: sidebarAction opens without tabId
        if ((browser as any).sidebarAction) {
          await (browser as any).sidebarAction.open();
        }
      } else {
        // Chrome: get active tab and open sidepanel
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]?.id !== undefined) {
          browser.sidePanel?.open({ tabId: tabs[0].id });
        }
      }
    } catch (error) {
      console.debug("Could not open sidepanel:", error);
    }
    window.close();
  }
</script>

<SearchInterface
  onOpenCard={openCard}
  onOpenSidePanel={openSidePanel}
  onOpenSettings={openSettings}
/>
