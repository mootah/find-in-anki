import { defineConfig } from "wxt";
import type { UserManifest } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-svelte", "@wxt-dev/auto-icons"],
  manifest: ({ browser }) => {
    let manifest: UserManifest = {
      name: "Find in Anki",
      host_permissions: ["<all_urls>"],
      options_ui: {
        page: "options/index.html",
        open_in_tab: true,
      },
    };
    let permissions = ["storage", "tabs", "contextMenus"];

    if (browser === "chrome") {
      permissions = [...permissions, "activeTab", "sidePanel"];
      manifest = {
        ...manifest,
        commands: {
          "open-popup": {
            suggested_key: {
              default: "Alt+F",
            },
            description: "Open Popup",
          },
        },
      };
    } else if (browser === "firefox") {
      manifest = {
        ...manifest,
        commands: {
          _execute_sidebar_action: {
            suggested_key: {
              default: "Ctrl+Alt+S",
            },
            description: "Open Sidebar",
          },
          _execute_browser_action: {
            suggested_key: {
              default: "Ctrl+Alt+F",
            },
            description: "Open Popup",
          },
        },
        browser_specific_settings: {
          gecko: {
            id: "find-in-anki@example.com",
            strict_min_version: "48.0",
          },
        },
      };
    }

    return {
      ...manifest,
      permissions,
    };
  },
});
