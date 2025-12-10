<script lang="ts">
  import { onMount } from "svelte";
  import type { Settings, Profile } from "../../types/settings";
  import ankiConnectService from "../../services/ankiconnect";

  let settings = $state<Settings>({
    ankiConnectEndpoint: "http://localhost:8765",
    activeProfileId: "default",
    theme: "system",
    keyboardShortcut: "",
  });

  let profiles = $state<Profile[]>([
    {
      id: "default",
      name: "Default",
      searchRules: [{ fieldName: "" }],
    },
  ]);

  let selectedProfileId = $state("default");
  let editingProfileId = $state<string | null>(null);
  let editingProfile = $state<Profile | null>(null);

  // For dropdowns
  let deckNames = $state<string[]>([]);
  let modelNames = $state<string[]>([]);
  // cache field names per model: modelName -> fieldNames[]
  let modelFields = $state<Record<string, string[]>>({});

  let error = $state("");
  let success = $state("");
  let loadingDecks = $state(false);

  /**
   * Apply theme to the HTML element based on settings
   */
  function applyTheme(theme: string) {
    const html = document.documentElement;
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      html.setAttribute("data-theme", isDark ? "dark" : "light");
    } else {
      html.setAttribute("data-theme", theme as "light" | "dark");
    }
  }

  onMount(async () => {
    await loadSettings();
    applyTheme(settings.theme);
    selectedProfileId = settings.activeProfileId;
    await loadDropdowns();

    // Listen for system theme changes if using system theme
    if (settings.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      mediaQuery.addEventListener("change", handleChange);
    }
  });

  async function loadSettings() {
    try {
      // Get settings from background script
      const result = await browser.runtime.sendMessage({
        type: "getSettings",
      });

      if (result && result.settings) {
        settings = result.settings;
        profiles = result.profiles;
        // restore cached model fields if present
        modelFields = (result.modelFields as Record<string, string[]>) || {};
        ankiConnectService.setEndpoint(settings.ankiConnectEndpoint);
        // Apply theme when loaded
        applyTheme(settings.theme);
      }
    } catch (err) {
      error = `Failed to load settings: ${(err as Error).message}`;
    }
  }

  async function saveSettings() {
    try {
      error = "";
      // Save settings through background script
      // include cached modelFields so they persist across reloads
      const userSettings = { settings, profiles, modelFields };
      console.log("Sending settings to background:", userSettings);

      const result = await browser.runtime.sendMessage({
        type: "saveSettings",
        userSettings,
      });

      console.log("Received response:", result);

      if (result && result.success === true) {
        success = "Settings saved successfully!";
        // Apply theme after save
        applyTheme(settings.theme);
        setTimeout(() => (success = ""), 3000);
      } else if (result && result.error) {
        error = `Failed to save settings: ${result.error}`;
      } else {
        console.warn("Unexpected response:", result);
        error = `Failed to save settings: Unexpected response (${JSON.stringify(result)})`;
      }
    } catch (err) {
      console.error("Exception saving settings:", err);
      error = `Failed to save settings: ${(err as Error).message}`;
    }
  }

  async function testAnkiConnect() {
    try {
      loadingDecks = true;
      error = "";
      ankiConnectService.setEndpoint(settings.ankiConnectEndpoint);

      // Test by fetching deck names
      const decks = await ankiConnectService.getDeckNames();
      deckNames = decks;

      success = `Connected! Found ${decks.length} deck(s).`;
      setTimeout(() => (success = ""), 3000);
    } catch (err) {
      error = `Connection failed: ${(err as Error).message}`;
    } finally {
      loadingDecks = false;
    }
  }

  async function loadDropdowns() {
    try {
      loadingDecks = true;
      error = "";
      ankiConnectService.setEndpoint(settings.ankiConnectEndpoint);

      const [decks, models] = await Promise.all([
        ankiConnectService.getDeckNames(),
        ankiConnectService.getModelNames(),
      ]);

      deckNames = decks;
      modelNames = models;

      success = "Synced with Anki!";
      setTimeout(() => (success = ""), 2000);
    } catch (err) {
      error = `Failed to sync: ${(err as Error).message}`;
    } finally {
      loadingDecks = false;
    }
  }

  async function loadFieldNames(modelName: string) {
    try {
      if (!modelName) {
        return [];
      }

      // return cached if available
      if (modelFields[modelName] && modelFields[modelName].length > 0) {
        return modelFields[modelName];
      }

      const fields = await ankiConnectService.getModelFieldNames(modelName);
      modelFields[modelName] = fields;
      return fields;
    } catch (err) {
      error = `Failed to load fields: ${(err as Error).message}`;
      return [];
    }
  }

  function getModelFields(modelName?: string) {
    if (!modelName) return [];
    return modelFields[modelName] || [];
  }

  async function startEditProfile(profile: Profile) {
    editingProfileId = profile.id;
    editingProfile = JSON.parse(JSON.stringify(profile));

    // Preload fields for any note types already present in the profile
    const noteTypes = Array.from(
      new Set(
        (editingProfile!.searchRules || [])
          .map((r) => r.noteTypeName)
          .filter(Boolean)
      )
    ) as string[];

    await Promise.all(noteTypes.map((nt) => loadFieldNames(nt)));
    console.log(modelFields);
  }

  function cancelEditProfile() {
    editingProfileId = null;
    editingProfile = null;
  }

  async function saveProfile() {
    if (!editingProfile) return;

    const index = profiles.findIndex((p) => p.id === editingProfileId);
    if (index >= 0) {
      profiles[index] = editingProfile;
    }

    await saveSettings();
    cancelEditProfile();
  }

  async function createNewProfile() {
    const name = "Profile " + (profiles.length + 1).toString();

    const newProfile: Profile = {
      id: Date.now().toString(),
      name,
      searchRules: [{ fieldName: "" }],
    };

    profiles = [...profiles, newProfile];
    await saveSettings();
  }

  async function deleteProfile(profileId: string) {
    if (profiles.length <= 1) {
      error = "Cannot delete the last profile";
      return;
    }

    profiles = profiles.filter((p) => p.id !== profileId);

    if (settings.activeProfileId === profileId) {
      settings.activeProfileId = profiles[0].id;
    }

    await saveSettings();
  }

  function addSearchRule() {
    if (!editingProfile) return;
    editingProfile.searchRules = [
      ...editingProfile.searchRules,
      { fieldName: "Front" },
    ];
  }

  function removeSearchRule(index: number) {
    if (!editingProfile) return;
    editingProfile.searchRules = editingProfile.searchRules.filter(
      (_, i) => i !== index
    );
  }
</script>

<main>
  <div class="container">
    <h1>Find in Anki - Settings</h1>

    {#if error}
      <div class="alert alert-error">{error}</div>
    {/if}

    {#if success}
      <div class="alert alert-success">{success}</div>
    {/if}

    <!-- AnkiConnect Settings -->
    <section class="settings-section">
      <h2>AnkiConnect Settings</h2>

      <div class="form-group">
        <label for="anki-url">AnkiConnect URL</label>
        <div class="input-group">
          <input
            id="anki-url"
            type="text"
            bind:value={settings.ankiConnectEndpoint}
            placeholder="http://localhost:8765"
            class="form-input"
          />
          <button
            onclick={testAnkiConnect}
            disabled={loadingDecks}
            class="btn btn-secondary"
          >
            {loadingDecks ? "Testing..." : "Test"}
          </button>
          <button
            onclick={loadDropdowns}
            disabled={loadingDecks}
            class="btn btn-secondary"
          >
            {loadingDecks ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>
    </section>

    <!-- Profiles -->
    <section class="settings-section">
      <div class="section-header">
        <h2>Profiles</h2>
        <button onclick={createNewProfile} class="btn btn-primary">
          + New Profile
        </button>
      </div>

      {#if editingProfileId === null}
        <!-- Profile List -->
        <div class="profile-list">
          {#each profiles as profile (profile.id)}
            <div class="profile-card">
              <div class="profile-info">
                <strong>{profile.name}</strong>
                {#if settings.activeProfileId === profile.id}
                  <span class="badge">Active</span>
                {/if}
              </div>
              <div class="profile-actions">
                <button
                  onclick={async () => {
                    settings.activeProfileId = profile.id;
                    await saveSettings();
                  }}
                  class="btn btn-sm btn-secondary"
                  disabled={settings.activeProfileId === profile.id}
                >
                  Select
                </button>
                <button
                  onclick={() => startEditProfile(profile)}
                  class="btn btn-sm btn-secondary"
                >
                  Edit
                </button>
                <button
                  onclick={() => deleteProfile(profile.id)}
                  class="btn btn-sm btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else if editingProfile}
        <!-- Profile Editor -->
        <div class="profile-editor">
          <div class="form-group">
            <label for="profile-name">Profile Name</label>
            <input
              id="profile-name"
              type="text"
              bind:value={editingProfile.name}
              class="form-input"
            />
          </div>

          <h3>Search Rules</h3>
          <div class="search-rules">
            {#each editingProfile.searchRules as rule, index (index)}
              <div class="search-rule">
                <div class="form-group">
                  <label for="deck">Deck</label>
                  <select
                    id="deck"
                    bind:value={rule.deckName}
                    class="form-input"
                  >
                    <option value="">Any Deck</option>
                    {#each deckNames as deck}
                      <option value={deck}>{deck}</option>
                    {/each}
                  </select>
                </div>

                <div class="form-group">
                  <label for="note-type">Note Type</label>
                  <select
                    id="note-type"
                    bind:value={rule.noteTypeName}
                    onchange={async () => {
                      if (rule.noteTypeName) {
                        const fields = await loadFieldNames(rule.noteTypeName);
                        // If current fieldName is not available for the newly selected model, clear it
                        if (!fields.includes(rule.fieldName || "")) {
                          rule.fieldName = "";
                        }
                      } else {
                        rule.fieldName = "";
                      }
                    }}
                    class="form-input"
                  >
                    <option value="">Any Type</option>
                    {#each modelNames as model}
                      <option value={model}>{model}</option>
                    {/each}
                  </select>
                </div>

                <div class="form-group">
                  <label for="field">Field</label>
                  <select
                    id="field"
                    bind:value={rule.fieldName}
                    class="form-input"
                  >
                    <option value="">Any Field</option>
                    {#each getModelFields(rule.noteTypeName) as field}
                      <option value={field}>{field}</option>
                    {/each}
                  </select>
                </div>

                {#if editingProfile.searchRules.length > 1}
                  <button
                    onclick={() => removeSearchRule(index)}
                    class="btn btn-sm btn-danger"
                  >
                    Remove Rule
                  </button>
                {/if}
              </div>
            {/each}
          </div>

          <button onclick={addSearchRule} class="btn btn-secondary">
            + Add Rule
          </button>

          <div class="button-group">
            <button onclick={saveProfile} class="btn btn-primary">
              Save Profile
            </button>
            <button onclick={cancelEditProfile} class="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      {/if}
    </section>

    <!-- Theme -->
    <section class="settings-section">
      <h2>Theme</h2>
      <div class="form-group">
        <label for="color-mode">Color Mode</label>
        <select
          id="color-mode"
          bind:value={settings.theme}
          onchange={() => saveSettings()}
          class="form-input"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
    </section>

    <!-- Keyboard Shortcuts -->
    <section class="settings-section">
      <h2>Keyboard Shortcuts</h2>
      <div>
        To change the keyboard shortcuts, visit your browser's extension manager
        and modify them.
      </div>
    </section>

    <!-- Save Button -->
    <div class="save-section">
      <button onclick={saveSettings} class="btn btn-primary btn-lg">
        Save All Settings
      </button>
    </div>
  </div>
</main>

<style>
  main {
    padding: 20px;
    min-height: 100vh;
    font-size: 1rem;
  }

  .container {
    max-width: 800px;
    width: 800px;
    margin: 0 auto;
  }

  h1 {
    margin: 0 0 20px 0;
  }

  h2 {
    margin: 0 0 15px 0;
    font-size: 1.3em;
  }

  h3 {
    margin: 15px 0 10px 0;
    font-size: 1.1em;
  }

  .alert {
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
    font-size: 14px;
  }

  .alert-error {
    background: var(--color-alert-error-bg);
    color: var(--color-alert-error-text);
  }

  .alert-success {
    background: var(--color-alert-success-bg);
    color: var(--color-alert-success-text);
  }

  .settings-section {
    background: var(--color-panel-bg);
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .form-group {
    margin-bottom: 15px;
  }

  label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    font-size: 14px;
  }

  .form-input {
    width: calc(100% - 24px);
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-input-bg);
    color: var(--color-text);
    font-size: 14px;
  }

  .form-input:focus {
    outline: none;
    border-color: #4caf50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }

  .input-group {
    display: flex;
    gap: 10px;
  }

  .input-group input {
    flex: 1;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #4caf50;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #45a049;
  }

  .btn-secondary {
    background: var(--color-btn-secondary-bg);
    color: var(--color-btn-secondary-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-btn-secondary-hover-bg);
  }

  .btn-danger {
    background: #f44336;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #da190b;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }

  .btn-lg {
    padding: 12px 24px;
    font-size: 16px;
    width: 100%;
  }

  .profile-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .profile-card {
    background: var(--color-profile-bg);
    padding: 12px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .profile-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .badge {
    background: #4caf50;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }

  .profile-actions {
    display: flex;
    gap: 8px;
  }

  .profile-editor {
    background: var(--color-profile-bg);
    padding: 15px;
    border-radius: 4px;
  }

  .search-rules {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin: 15px 0;
  }

  .search-rule {
    background: var(--color-search-rule-bg);
    padding: 12px;
    border-radius: 4px;
    border: 1px solid var(--color-search-rule-border);
  }

  .button-group {
    display: flex;
    gap: 10px;
    margin-top: 15px;
  }

  .button-group button {
    flex: 1;
  }

  .save-section {
    display: flex;
    justify-content: center;
  }
</style>
