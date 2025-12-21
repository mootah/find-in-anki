<p align="center">
    <img src="https://raw.githubusercontent.com/mootah/find-in-anki/main/public/icon.svg" width="75" height="75" alt="logo" />
</p>

<div align="center">

[![Github Workflow Status](https://img.shields.io/github/actions/workflow/status/mootah/find-in-anki/release.yml?style=flat-square)](https://github.com/mootah/find-in-anki/actions/workflows/release.yml)
[![GitHub Release](https://img.shields.io/github/v/release/mootah/find-in-anki?style=flat-square)](https://github.com/mootah/find-in-anki/releases)
[![GitHub License](https://img.shields.io/github/license/mootah/find-in-anki?style=flat-square)](https://github.com/mootah/find-in-anki?tab=MIT-1-ov-file)

[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/oiphcgdeddpmbokjlaeajkfiabjcbope?style=flat-square&logo=Google%20Chrome&logoColor=lightblue&label=Get%20Chrome%20Extension&color=lightblue)](https://chromewebstore.google.com/detail/find-in-anki/oiphcgdeddpmbokjlaeajkfiabjcbope)

[![Get Firefox Addon](https://img.shields.io/amo/v/%7Bfa7fa832-105b-52ea-8160-cfc319b78e44%7D?style=flat-square&logo=Firefox&label=Get%20Firefox%20Addon)](https://addons.mozilla.org/en-US/firefox/addon/find-in-anki/)

</div>

# Find in Anki

A browser extension that allows you to search for selected text within your Anki cards. It integrates with Anki through AnkiConnect to perform fast, efficient searches and open matching cards directly in Anki.

## Features

- **Quick Search**: Search selected text in Anki cards using keyboard shortcut (Alt+S by default) or context menu
- **Advanced Search Profiles**: Create multiple search profiles with customizable rules for deck, note type, and field filtering
- **Instant Results**: View search results directly in the extension popup and click to open cards in Anki
- **Theme Support**: Light, dark, and system theme options
- **Cross-Platform**: Works on Chrome-based browsers and Firefox

## Prerequisites

### Anki Setup

1. Install Anki on your computer
2. Install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on in Anki
3. Ensure Anki is running with AnkiConnect enabled (usually starts automatically)

### Browser Extension

- **Chrome**: Install from [Chrome Web Store](https://chromewebstore.google.com/detail/find-in-anki/oiphcgdeddpmbokjlaeajkfiabjcbope)
- **Firefox**: Install from [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/find-in-anki/)

## Usage

1. **Select Text**: Highlight any text on a webpage
2. **Search**: Press `Alt+F` (or right-click and select "Find in Anki") to search for the selected text in your Anki cards
3. **View Results**: The extension popup will show matching cards with deck names and note types
4. **Open Card**: Click on any result to open it directly in the Anki browser

### Configuration

Access extension options:

- **Chrome**: Go to `chrome://extensions/`, click "Details" on Find in Anki, then "Extension options"
- **Firefox**: Go to `about:addons`, click Find in Anki, then "Preferences"

#### AnkiConnect Settings

- Set your AnkiConnect endpoint (default: `http://localhost:8765`)
- Test connection and sync deck/note type information

#### Search Profiles

- Create custom search profiles for different types of searches
- Define search rules with filters for specific decks, note types, and fields
- Switch between profiles as needed

#### Keyboard Shortcuts

- Customize the keyboard shortcut in your browser's extension settings
- Default: `Alt+F`

## Development

### Prerequisites

- Node.js 18 or later
- npm or bun
- Anki with AnkiConnect installed and running

### Setup

```bash
# Clone the repository
git clone git@github.com:mootah/find-in-anki.git
cd find-in-anki

# Install dependencies
bun install

# Start development server (watches files and reloads extension)
bun run dev

# Build for production
bun run build  # Chrome
bun run build:firefox  # Firefox

# Zip for distribution
bun run zip  # Chrome
bun run zip:firefox  # Firefox
```

### Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode).

### Project Structure

- `src/entrypoints/`: Main extension entry points (background, content, popup, options)
- `src/services/`: AnkiConnect integration service
- `src/types/`: TypeScript type definitions
- `src/lib/`: Reusable Svelte components
- `src/assets/`: Static assets (logos, images)
- `public/`: Static assets (icons, manifest shared data)

### Technologies Used

- **Framework**: [WXT](https://wxt.dev/) - Web Extension Toolkit
- **Frontend**: [Svelte 5](https://svelte.dev/) with TypeScript

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with different search scenarios
5. Submit a pull request

## Issues and Support

If you encounter any issues:

1. Check that Anki and AnkiConnect are properly configured
2. Verify your browser extension is up to date
3. Search existing [GitHub issues](https://github.com/mootah/find-in-anki/issues)
4. Create a new issue with detailed reproduction steps

## Privacy

This extension only communicates with your local Anki instance via AnkiConnect. No data is sent to external servers. All search operations happen locally on your machine.

## License

[MIT License](LICENSE)
