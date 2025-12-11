import type {
  AnkiConnectRequest,
  AnkiConnectResponse,
  CardInfo,
  DeckInfo,
  ModelInfo,
  CardResult,
} from "../types/anki";
import type { SearchRule } from "../types/settings";

/**
 * Clean field content by removing HTML tags and Cloze deletions
 */
function cleanFieldContent(content: string): string {
  // Remove HTML tags
  content = content.replace(/<[^>]*>/g, "");
  // Remove Anki Cloze deletions: {{c1::text}} -> text
  content = content.replace(/\{\{c\d+::([^}]+)(?:::.*?)?\}\}/g, "$1");
  return content;
}

export class AnkiConnectService {
  private endpoint: string;
  private version = 6;

  constructor(endpoint: string = "http://localhost:8765") {
    this.endpoint = endpoint;
  }

  setEndpoint(endpoint: string) {
    this.endpoint = endpoint;
  }

  private async invoke<T = any>(
    action: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    const request: AnkiConnectRequest = {
      action,
      version: this.version,
      params,
    };

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AnkiConnectResponse<T> = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data.result;
    } catch (error) {
      console.error(`AnkiConnect error (${action}):`, error);
      throw error;
    }
  }

  /**
   * Get all deck names
   */
  async getDeckNames(): Promise<string[]> {
    return this.invoke<string[]>("deckNames");
  }

  /**
   * Get all model (note type) names
   */
  async getModelNames(): Promise<string[]> {
    return this.invoke<string[]>("modelNames");
  }

  /**
   * Get field names for a specific model
   */
  async getModelFieldNames(modelName: string): Promise<string[]> {
    return this.invoke<string[]>("modelFieldNames", { modelName });
  }

  /**
   * Find cards matching a query
   */
  async findCards(query: string): Promise<number[]> {
    return this.invoke<number[]>("findCards", { query });
  }

  /**
   * Get detailed information about specific cards
   */
  async getCardsInfo(cardIds: number[]): Promise<CardInfo[]> {
    const result = await this.invoke<any[]>("cardsInfo", { cards: cardIds });
    return result.map((card) => ({
      cardId: card.cardId,
      noteId: card.noteId,
      deckName: card.deckName,
      noteType: card.modelName,
      fields: card.fields,
    }));
  }

  /**
   * Open card in Anki browser
   */
  async guiBrowse(query: string): Promise<number> {
    return this.invoke<number>("guiBrowse", { query });
  }

  /**
   * Build search query from a single rule
   * Supports multiple space-separated words and searches for the entire phrase as a substring
   */
  private buildSingleRuleQuery(searchText: string, rule: SearchRule): string {
    const parts: string[] = [];
    const escape = (s: string) => s.replace(/"/g, '\\"');

    // Split by space and trim each word
    const words = searchText.split(/\s+/).filter((word) => word.length > 0);

    if (words.length === 0) {
      return "";
    }

    // If multiple words, treat the entire phrase as a substring match
    // If single word, also use substring match
    const text = escape(searchText);

    // If a field is specified, search inside that field (substring match)
    if (rule.fieldName) {
      parts.push(`${rule.fieldName}:"*${text}*"`);
    } else {
      parts.push(`"*${text}*"`);
    }

    // Add deck filter if specified
    if (rule.deckName) {
      parts.push(`deck:"${escape(rule.deckName)}"`);
    }

    // Add note type filter if specified
    if (rule.noteTypeName) {
      parts.push(`note:"${escape(rule.noteTypeName)}"`);
    }

    return parts.join(" ");
  }

  /**
   * Split content and highlight search text
   */
  private splitAndHighlight(
    content: string,
    search: string
  ): Array<{ text: string; highlighted: boolean }> {
    const parts: Array<{ text: string; highlighted: boolean }> = [];
    let lastIndex = 0;
    const matches = [
      ...content.matchAll(
        new RegExp(search.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"), "gi")
      ),
    ];
    for (const match of matches) {
      if (match.index > lastIndex) {
        parts.push({
          text: content.slice(lastIndex, match.index),
          highlighted: false,
        });
      }
      parts.push({ text: match[0], highlighted: true });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex), highlighted: false });
    }
    return parts;
  }

  /**
   * Build search query from rules (supports multiple rules combined with OR logic)
   */
  buildSearchQuery(searchText: string, rules: SearchRule[]): string {
    if (rules.length === 0) {
      // Fallback: generic substring search
      const escape = (s: string) => s.replace(/"/g, '\\"');
      return `*${escape(searchText)}*`;
    }

    if (rules.length === 1) {
      return this.buildSingleRuleQuery(searchText, rules[0]);
    }

    // Multiple rules: combine with OR logic using parentheses
    // Example: (Front:*text* deck:"Deck1") OR (Back:*text* deck:"Deck2")
    const queries = rules.map((rule) =>
      this.buildSingleRuleQuery(searchText, rule)
    );
    return `(${queries.join(") OR (")})`;
  }

  /**
   * Search cards across multiple rules with results grouped by rule
   * Returns results as an array with metadata about which rule matched
   */
  async searchCards(
    searchText: string,
    rules: SearchRule[]
  ): Promise<Array<CardResult>> {
    try {
      const allResults = new Map<number, CardResult>();

      // Execute search for each rule
      for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex++) {
        const rule = rules[ruleIndex];
        const query = this.buildSingleRuleQuery(searchText, rule);
        console.log("query:", query);
        const cardIds = await this.findCards(query);

        if (cardIds.length === 0) {
          continue;
        }

        const cards = await this.getCardsInfo(cardIds);

        for (const card of cards) {
          // Skip if we already have this card from a previous rule
          if (allResults.has(card.cardId)) {
            continue;
          }

          // Determine target field name
          let targetFieldName: string;
          if (rule.fieldName) {
            targetFieldName = rule.fieldName;
          } else {
            // Find the first field that contains the searchText (case-insensitive)
            const fieldNames = Object.keys(card.fields);
            const foundField = fieldNames.find((fieldName) => {
              const rawField = (card.fields as any)[fieldName];
              let content = "";
              if (typeof rawField === "string") {
                content = rawField;
              } else if (rawField && typeof rawField.value === "string") {
                content = rawField.value;
              } else if (rawField && typeof rawField.text === "string") {
                content = rawField.text;
              } else if (rawField && typeof rawField.plain === "string") {
                content = rawField.plain;
              }
              return content.toLowerCase().includes(searchText.toLowerCase());
            });
            targetFieldName = foundField || fieldNames[0];
          }

          // Fallback if field doesn't exist
          if (!card.fields[targetFieldName]) {
            targetFieldName = Object.keys(card.fields)[0];
          }

          const rawField = (card.fields as any)[targetFieldName];
          let fieldContent = "";

          if (typeof rawField === "string") {
            fieldContent = rawField;
          } else if (rawField && typeof rawField.value === "string") {
            fieldContent = rawField.value;
          } else if (rawField && typeof rawField.text === "string") {
            fieldContent = rawField.text;
          } else if (rawField && typeof rawField.plain === "string") {
            fieldContent = rawField.plain;
          } else {
            fieldContent = "";
          }

          fieldContent = cleanFieldContent(fieldContent);

          const deckDisplayName = card.deckName.replaceAll("::", " / ");
          allResults.set(card.cardId, {
            cardId: card.cardId,
            noteId: card.noteId,
            deckName: deckDisplayName,
            noteType: card.noteType,
            fieldName: targetFieldName,
            fieldContent,
            highlightedContent: this.splitAndHighlight(
              fieldContent,
              searchText
            ),
            matchedRuleIndex: ruleIndex,
          });
        }
      }

      return Array.from(allResults.values());
    } catch (error) {
      console.error("Error searching cards across multiple rules:", error);
      throw error;
    }
  }
}

export default new AnkiConnectService();
