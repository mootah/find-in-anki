/**
 * AnkiConnect API Response Types
 */

export interface AnkiConnectRequest {
  action: string;
  version: number;
  params: Record<string, any>;
}

export interface AnkiConnectResponse<T = any> {
  result: T;
  error: string | null;
}

// Card Information
export interface CardInfo {
  cardId: number;
  noteId: number;
  deckName: string;
  noteType: string;
  fields: Record<string, string>;
}

// Deck and Model Information
export interface DeckInfo {
  name: string;
  id: number;
}

export interface ModelInfo {
  name: string;
  id: number;
  flds: FieldInfo[];
}

export interface FieldInfo {
  name: string;
  ord: number;
}

// Search Query Result
export interface SearchResult {
  cards: CardInfo[];
  query: string;
}
