import ankiConnectService from "../services/ankiconnect";
import type {
  Message,
  SearchMessage,
  OpenCardMessage,
  UpdateSelectionMessage,
} from "../types/messages";
import type { Profile, Settings } from "../types/settings";

// Check if browser APIs are available
const hasContextMenus = typeof browser !== "undefined" && browser.contextMenus;
const hasStorage = typeof browser !== "undefined" && browser.storage;

const isFirefox = import.meta.env.FIREFOX;

export default defineBackground(() => {
  console.log("Background script initialized", { id: browser.runtime.id });

  // Initialize context menu
  if (hasContextMenus) {
    // Ensure menus are (re-)created on startup
    initializeContextMenu();

    // Recreate menus when the extension is installed or updated
    try {
      browser.runtime.onInstalled.addListener(() => initializeContextMenu());
      browser.runtime.onInstalled.addListener(() =>
        initializeKeyboardShortcuts()
      );
    } catch (e) {
      // Some dev environments may not implement onInstalled; ignore
      console.debug("onInstalled not available in this environment", e);
    }
  }

  // Initialize keyboard shortcuts
  initializeKeyboardShortcuts();

  // Listen for messages from popup and content scripts
  browser.runtime.onMessage.addListener(handleMessage);
});

/**
 * Initialize context menu items
 */
async function initializeContextMenu() {
  if (!hasContextMenus) {
    console.debug("Context menu not available in this environment");
    return;
  }

  try {
    // clear previous menus to avoid duplicates
    if (browser.contextMenus.removeAll) {
      await browser.contextMenus.removeAll();
    }

    browser.contextMenus.create({
      id: "find-in-anki",
      title: 'Find in Anki: "%s"',
      contexts: ["selection"],
    });

    // Handle context menu click
    browser.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === "find-in-anki" && info.selectionText) {
        // Open popup or sidepanel with search text
        try {
          if (isFirefox) {
            await (browser as any).sidebarAction.open();
          } else {
            await browser.action.openPopup();
          }
        } catch (error) {
          // Popup/sidepanel may already be open or browser may handle it differently
          console.debug("open from menu:", error);
        }
      }
    });
  } catch (error) {
    // Context menu not available in dev/test environments
    console.debug("Context menu initialization skipped:", error);
  }
}

/**
 * Handle messages from popup and content scripts
 */
function handleMessage(
  message: Message,
  sender: any,
  sendResponse: (response: any) => void
) {
  // Process message asynchronously and send response
  handleMessageAsync(message, sender)
    .then((response) => {
      console.log("Message:", message);
      console.log("Sending response:", response);
      sendResponse(response);
    })
    .catch((error) => {
      console.error("Message handler error:", error);
      sendResponse({ error: (error as Error).message });
    });

  // Return true to indicate we will send a response asynchronously
  return true;
}

async function handleMessageAsync(message: Message, sender: any) {
  switch (message.type) {
    // case "search": {
    //   const searchMsg = message as SearchMessage;
    //   return await handleSearch(searchMsg.selectedText, searchMsg.profileId);
    // }

    case "search": {
      const searchMsg = message as SearchMessage;
      return await handleSearch(searchMsg.selectedText, searchMsg.profileId);
    }

    case "openCard": {
      const openMsg = message as OpenCardMessage;
      return await handleOpenCard(openMsg.cardId);
    }

    case "getSettings": {
      return await getSettings();
    }

    case "saveSettings": {
      // Save settings to sync storage
      const { userSettings } = message as any;
      console.log("Saving settings:", userSettings);

      if (!userSettings) {
        return { success: false, error: "Invalid settings" };
      }

      try {
        if (hasStorage && browser.storage.sync) {
          await browser.storage.sync.set({ userSettings });
          console.log("Settings saved successfully");
        } else {
          console.debug("Storage.sync not available in this environment");
        }
        return { success: true };
      } catch (err) {
        console.error("Error saving settings:", err);
        return { success: false, error: (err as Error).message };
      }
    }

    case "getLastSearchText": {
      try {
        if (hasStorage && browser.storage.session) {
          const stored = await browser.storage.session.get("lastSearchText");
          return { searchText: stored.lastSearchText || "" };
        }
        return { searchText: "" };
      } catch (err) {
        console.error("Error getting last search text:", err);
        return { searchText: "" };
      }
    }

    case "updateSelection": {
      const updateMsg = message as UpdateSelectionMessage;
      try {
        if (hasStorage && browser.storage.session) {
          await browser.storage.session.set({
            lastSearchText: updateMsg.selectedText,
            lastSearchTime: Date.now(),
          });
        }
        return { success: true };
      } catch (err) {
        console.error("Error updating selection:", err);
        return { success: false, error: (err as Error).message };
      }
    }

    default:
      console.warn("Unknown message type:", (message as any).type);
      return { error: "Unknown message type" };
  }
}

/**
 * Handle multi-search request (searches all rules in profile separately)
 */
async function handleSearch(selectedText: string, profileId: string) {
  try {
    // Get settings and profile
    const settings = await getSettings();
    const profile = settings.profiles.find((p: Profile) => p.id === profileId);

    if (!profile) {
      return { error: "Profile not found" };
    }

    // Update AnkiConnect endpoint if configured
    if (settings.settings.ankiConnectEndpoint) {
      ankiConnectService.setEndpoint(settings.settings.ankiConnectEndpoint);
    }

    // Search for cards using multi-search (each rule independently)
    const results = await ankiConnectService.searchCards(
      selectedText,
      profile.searchRules
    );

    return {
      type: "searchResults",
      cards: results,
    };
  } catch (error) {
    console.error("search error:", error);
    return {
      type: "searchResults",
      cards: [],
      error: (error as Error).message,
    };
  }
}

/**
 * Handle opening card in Anki browser
 */
async function handleOpenCard(cardId: number) {
  try {
    const query = `cid:${cardId}`;
    await ankiConnectService.guiBrowse(query);
    return { success: true };
  } catch (error) {
    console.error("Error opening card:", error);
    return { error: (error as Error).message };
  }
}

/**
 * Initialize keyboard shortcut listener
 */
async function initializeKeyboardShortcuts() {
  try {
    if (hasStorage && browser.commands) {
      browser.commands.onCommand.addListener(async (command) => {
        console.log("command", command);
        try {
          if (command === "open-popup") {
            await browser.action.openPopup();
          }
        } catch (error) {
          // Popup/sidepanel may already be open or browser may handle it differently
          console.debug("open from shortcut:", error);
        }
      });
    } else {
      console.error("Commands not available in this environment");
    }
  } catch (error) {
    console.error("Keyboard shortcuts initialization skipped:", error);
  }
}

/**
 * Get current settings and profiles
 */
async function getSettings() {
  // Default settings if not found
  const defaultSettings: Settings = {
    ankiConnectEndpoint: "http://localhost:8765",
    activeProfileId: "default",
    theme: "system",
    keyboardShortcut: "Alt+S",
  };

  const defaultProfile: Profile = {
    id: "default",
    name: "Default",
    searchRules: [
      {
        fieldName: "",
      },
    ],
  };

  const defaultUserSettings = {
    settings: defaultSettings,
    profiles: [defaultProfile],
  };

  let keyboardShortcut = defaultSettings.keyboardShortcut;
  const commands = await browser.commands.getAll();
  for (const command of commands) {
    if (command.name === "search-anki" && command.shortcut) {
      keyboardShortcut = command.shortcut;
    }
  }
  defaultUserSettings.settings.keyboardShortcut = keyboardShortcut;

  try {
    if (!hasStorage || !browser.storage.sync) {
      // Storage not available in dev environment
      console.debug("Storage.sync not available, using defaults");
      return defaultUserSettings;
    }

    const stored = await browser.storage.sync.get("userSettings");

    if (!stored.userSettings) {
      // Save defaults
      await browser.storage.sync.set({ userSettings: defaultUserSettings });
      return defaultUserSettings;
    }

    stored.userSettings.settings.keyboardShortcut = keyboardShortcut;
    return stored.userSettings;
  } catch (error) {
    console.error("Error getting settings:", error);
    // Return defaults on error
    return defaultUserSettings;
  }
}
