/**
 * Settings and Profile Types
 */

export interface Settings {
  ankiConnectEndpoint: string;
  activeProfileId: string;
  theme: "light" | "dark" | "system";
  keyboardShortcut: string;
}

export interface SearchRule {
  deckId?: string;
  deckName?: string;
  noteTypeId?: string;
  noteTypeName?: string;
  fieldId?: string;
  fieldName?: string;
}

export interface Profile {
  id: string;
  name: string;
  searchRules: SearchRule[];
}

export interface UserSettings {
  settings: Settings;
  profiles: Profile[];
}
