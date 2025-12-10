import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-svelte", "@wxt-dev/auto-icons"],
  manifest: ({ browser }) => ({
    name: "Find in Anki",
    permissions: ["contextMenus", "storage", "activeTab"],
    host_permissions: ["<all_urls>"],
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
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "find-in-anki@example.com",
          strict_min_version: "48.0",
        },
      },
    }),
  }),
});
