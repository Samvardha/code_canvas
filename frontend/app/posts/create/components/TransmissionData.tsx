"use client";

import React from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ValidationKey, formatTextInput } from "../utils";

interface TransmissionDataProps {
  text: string;
  setText: (text: string) => void;
  handleSuggest: () => void;
  isGenerating: boolean;
  loading: boolean;
  suggestions: string[];
  setSuggestions: (suggestions: string[]) => void;
  applySuggestion: (suggestion: string) => void;
  validationErrors: ValidationKey[];
  clearError: (id: ValidationKey) => void;
}

export const TransmissionData = ({
  text,
  setText,
  handleSuggest,
  isGenerating,
  loading,
  suggestions,
  setSuggestions,
  applySuggestion,
  validationErrors,
  clearError,
}: TransmissionDataProps) => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
          TRANSMISSION_DATA
        </label>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={loading || isGenerating || !text.trim()}
          className={`flex gap-2 items-center px-3 py-1.5 border group cursor-pointer transition-all ${
            isGenerating
              ? "border-accent bg-accent/10 text-accent"
              : "border-white/10 bg-white/5 text-text-secondary hover:text-white hover:border-accent/40 disabled:opacity-30 disabled:cursor-not-allowed"
          }`}
        >
          {isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 group-hover:text-accent transition-colors" />
          )}
          <span
            className={`text-[10px] font-mono font-bold tracking-widest uppercase transition-colors ${
              isGenerating ? "" : "group-hover:text-accent"
            }`}
          >
            {isGenerating ? "PROCESSING..." : "WRITE_WITH_AI"}
          </span>
        </button>
      </div>
      <textarea
        value={text}
        onFocus={() => clearError("text")}
        onChange={(e) => {
          const val = formatTextInput(e.target.value);
          setText(val);
          clearError("text");
        }}
        placeholder="DESCRIBE_THE_SIGNAL"
        rows={3}
        className={`w-full bg-background/30 border p-5 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none resize-none transition-colors mt-4 ${
          validationErrors.includes("text") ? "border-red-500/50" : "border-border"
        }`}
        disabled={loading || isGenerating}
      />

      {/* AI Suggestions Box */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="flex flex-col gap-2 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-[11px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                AI_REWORK_OPTIONS
              </span>
              <button
                type="button"
                onClick={() => setSuggestions([])}
                className="text-text-secondary hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4 py-4">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="group relative flex flex-col gap-3 text-left bg-black/40 border border-white/5 p-5 hover:border-accent/40 transition-all overflow-hidden cursor-pointer"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-border/50 group-hover:bg-accent transition-colors" />
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[11px] font-mono font-black text-text-secondary group-hover:text-accent uppercase tracking-widest transition-colors pl-2">
                      OPTION_{(idx + 1).toString().padStart(2, "0")}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] font-mono font-bold text-accent uppercase tracking-widest transition-opacity pr-2">
                      CLICK_TO_APPLY
                    </span>
                  </div>
                  <p className="text-[13px] text-text-secondary group-hover:text-white font-mono leading-relaxed transition-colors pl-2 pr-2">
                    {s}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
