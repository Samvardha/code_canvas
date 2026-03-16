"use client";

import { useState, useCallback, useMemo } from "react";
import { aiApi } from "@/lib/api/ai";

export const useSignalsAI = (token: string | null) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSuggest = useCallback(
    async (text: string, loading: boolean, showToast: (m: string) => void) => {
      if (!token || !text.trim() || isGenerating || loading) return;

      setIsGenerating(true);
      setSuggestions([]);
      try {
        const results = await aiApi.suggestCaptions(text, token);
        setSuggestions(results);
      } catch (error: any) {
        console.error("AI Generation failed:", error);
        showToast(error.message || "AI_GENERATION_FAILED");
      } finally {
        setIsGenerating(false);
      }
    },
    [token, isGenerating],
  );

  const resetAI = useCallback(() => {
    setIsGenerating(false);
    setSuggestions([]);
  }, []);

  return useMemo(
    () => ({
      isGenerating,
      suggestions,
      setSuggestions,
      setIsGenerating,
      handleSuggest,
      resetAI,
    }),
    [isGenerating, suggestions, handleSuggest, resetAI],
  );
};

