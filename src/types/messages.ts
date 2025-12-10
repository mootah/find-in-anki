/**
 * Message types for communication between extension components
 */

export type Message =
  | SearchMessage
  | SearchResultsMessage
  | OpenCardMessage
  | GetSettingsMessage
  | SaveSettingsMessage
  | GetLastSearchTextMessage
  | UpdateSelectionMessage;

// Popup → Background: Trigger multi-search (searches all rules in a profile)
export interface SearchMessage {
  type: "search";
  selectedText: string;
  profileId: string;
}

// Background → Popup: Return search results
export interface SearchResultsMessage {
  type: "searchResults";
  cards: Array<{
    cardId: number;
    noteId: number;
    deckName: string;
    noteType: string;
    fieldContent: string;
    highlightedContent: string;
  }>;
  error?: string;
}

// Popup → Background: Open card in Anki browser
export interface OpenCardMessage {
  type: "openCard";
  cardId: number;
}

// Popup/Options → Background: Get current settings
export interface GetSettingsMessage {
  type: "getSettings";
}

// Popup/Options → Background: Save settings
export interface SaveSettingsMessage {
  type: "saveSettings";
  settings: any;
}

// Popup → Background: Get last search text from session storage
export interface GetLastSearchTextMessage {
  type: "getLastSearchText";
}

// Content → Background: Update selected text in session storage
export interface UpdateSelectionMessage {
  type: "updateSelection";
  selectedText: string;
}
