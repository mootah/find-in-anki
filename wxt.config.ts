import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-svelte"],
  webExt: {
    startUrls: ["chrome://extensions"],
  },
  // Ensure generated manifest includes permissions needed by the extension
  manifest: {
    name: "Find in Anki",
    permissions: ["contextMenus", "storage", "activeTab"],
    host_permissions: ["http://localhost:8765/*", "http://127.0.0.1:8765/*"],
    commands: {
      "find-in-anki": {
        suggested_key: {
          default: "Alt+S",
        },
        description: "Find selected text in Anki",
      },
    },
    options_ui: {
      page: "options/index.html",
      open_in_tab: true,
    },
  },
});
