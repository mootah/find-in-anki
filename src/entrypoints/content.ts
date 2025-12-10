export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("Content script loaded on", window.location.href);

    // Monitor text selection changes and send to background script
    document.addEventListener("selectionchange", () => {
      const selectedText = window.getSelection()?.toString() || "";
      if (selectedText.trim()) {
        browser.runtime.sendMessage({
          type: "updateSelection",
          selectedText: selectedText,
        });
      }
    });
  },
});
