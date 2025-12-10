# Copilot Instructions for search_in_anki

## Project Overview

A **WXT-based browser extension** that searches Anki cards via AnkiConnect. Users select text, right-click to search, and see matching cards with highlighted keywords in a popup. Features include profile-based search rules (deck/note type/field filters), customizable AnkiConnect endpoint, light/dark mode, and keyboard shortcuts.

**Key Technologies**: TypeScript, Svelte 5, WXT, AnkiConnect API

## Architecture

### Extension Structure (WXT Framework)

- **Background Script** (`src/entrypoints/background.ts`): Handles AnkiConnect communication, context menu management, and message routing
- **Content Script** (`src/entrypoints/content.ts`): Injects context menu handlers (not page-specific targeting needed)
- **Popup UI** (`src/entrypoints/popup/`): Search results display with keyword highlighting, built with Svelte
  - `App.svelte`: Main popup component with search form and results display
  - `main.ts`: Mount point for Svelte app
  - `app.css`: Popup styles
- **Options Page** (`src/entrypoints/options/`): Settings, profile management, AnkiConnect configuration
  - `App.svelte`: Settings interface with profile editor, dropdown loaders, endpoint configuration
  - `main.ts`: Mount point for options page
  - `app.css`: Options page styles

### Key Directories

- `src/entrypoints/`: WXT entry points (background, content, popup, options)
- `src/lib/`: Reusable Svelte components
- `src/services/`: Business logic for AnkiConnect API, settings management
- `src/types/`: TypeScript interfaces (AnkiConnect API responses, user settings)
- `src/assets/`: Static assets (logos, images)

## Development Workflow

### Build & Run Commands

- `bun dev`: Start dev server (watch mode)
- `bun dev:firefox`: Dev mode for Firefox
- `bun build`: Production build (Chrome)
- `bun build:firefox`: Production build (Firefox)
- `bun zip`: Package extension for Chrome Web Store
- `bun check`: Run Svelte type checking

**Note**: This project uses Bun as the package manager/runtime instead of Node.js.

### Project Setup

- **Package Manager**: Bun
- **Build Tool**: WXT (handles manifest.json generation)
- **Component Framework**: Svelte 5
- **Language**: TypeScript
- **Config Files**:
  - `wxt.config.ts` for WXT configuration
  - `tsconfig.json` extends WXT-generated config
  - `wxt-env.d.ts` for type definitions

## Important Patterns

### WXT Framework Usage

- Entry points use `defineBackground()`, `defineContentScript()`, and config methods from WXT
- WXT automatically generates `manifest.json` from config - **don't edit manifest manually**
- The `srcDir: 'src'` setting in `wxt.config.ts` is the convention
- Use `browser.runtime.openOptionsPage()` to open settings from context menu/popup

### Settings & Storage Architecture

- Use `browser.storage.local` for user settings (endpoint, theme preference, keyboard shortcuts)
- Use `browser.storage.sync` for profile data (search rules, selected profile) to sync across browsers
- Store active profile ID and load profile-specific rules on startup
- Profile structure: `{ id: string; name: string; searchRules: SearchRule[]; }`
- SearchRule structure: `{ deckId?: string; noteTypeId?: string; fieldId?: string; }`

### Context Menu & Search Flow

1. User selects text and right-clicks → context menu item "Search in Anki" appears
2. Click triggers background script message with selected text and active profile
3. Background script queries AnkiConnect with profile's search rules
4. Results sent to popup, which displays with keyword highlighting
5. Clicking a result opens Anki card browser (use AnkiConnect `guiBrowse` endpoint)

### AnkiConnect API Integration

- Call `getDeckNames()` and `modelNames()` on settings load to populate dropdowns
- Use `findCards()` with query syntax: `deck:"DeckName" note:NoteType field:value`
- Extract target fields from matched cards using `cardsInfo()`
- Implement refresh button in settings to reload deck/note type/field lists
- Handle AnkiConnect connection errors gracefully with user-facing messages

### Svelte Component Pattern

- Use `<script lang="ts">` for type-safe components
- Use Svelte 5's reactive declarations for state management
- Parent-child communication via props and event dispatching
- Import styles in components (see `app.css` in `main.ts`)
- Create separate components: `SearchResults.svelte`, `ProfileSettings.svelte`, `ThemeToggle.svelte`

### Theme Implementation

- Store theme preference (`'light' | 'dark' | 'system'`) in `browser.storage.local`
- Use CSS custom properties for light/dark colors (define in `app.css`)
- Apply `data-theme="light"` or `data-theme="dark"` to `<html>` or root element
- Use `prefers-color-scheme` media query for system theme detection
- Apply theme on extension startup and when settings change

## Messaging Between Scripts

- Background ↔ Popup: `{ type: 'search', selectedText: string, profileId: string }`
- Background → Popup: `{ type: 'searchResults', cards: CardInfo[] }`
- Popup → Background: Request to open Anki card browser with card ID
- Define message type interfaces in `src/types/messages.ts` for type safety

## Development Tips

- Run `bun check` before submitting code to catch Svelte/TypeScript errors
- Test in both Chrome and Firefox using respective dev commands
- The `postinstall` script runs `wxt prepare` - ensures WXT generated files are up to date
- All browser APIs use the `browser.*` namespace (WebExtensions, not Chrome API)
- AnkiConnect runs on `http://localhost:8765` by default; endpoint is user-configurable in settings
- Test AnkiConnect communication separately from UI (use simple background script logs or test messages)
- For keyboard shortcuts, register in background script and dispatch to popup/options as needed

## Current Implementation Plan

**Phase 1: Core Search Flow**

- Implement background script with AnkiConnect communication
- Create context menu with "Search in Anki" item
- Build basic popup showing search results with keyword highlighting

**Phase 2: Settings & Profiles**

- Create options page with AnkiConnect endpoint configuration
- Implement profile management (create, edit, delete, select active profile)
- Add search rule builder (deck/note type/field selection with dropdowns)
- Implement refresh button to reload dropdown options from AnkiConnect

**Phase 3: Theme & UX Polish**

- Implement light/dark mode toggle in options
- Add system theme detection
- Create keyboard shortcut configuration interface
- Style popup and options pages with theming support

**Phase 4: Card Browser Integration**

- Implement click handling to open Anki card browser
- Use AnkiConnect `guiBrowse` with card ID to navigate to specific card
