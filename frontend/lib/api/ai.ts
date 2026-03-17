import { baseUrl, getHeaders, handleResponse } from "./client";

export interface SuggestionResponse {
  suggestions: string[];
}

export const aiApi = {
  /**
   * Fetches caption suggestions for a given draft.
   */
  async suggestCaptions(draft: string, token: string): Promise<string[]> {
    const response = await fetch(`${baseUrl}/ai/suggest-caption`, {
      method: "POST",
      headers: getHeaders({ token, isJson: true }),
      body: JSON.stringify({ draft }),
    });

    const data = await handleResponse<SuggestionResponse>(
      response,
      "Failed to fetch AI suggestions"
    );
    return data.suggestions;
  },
};