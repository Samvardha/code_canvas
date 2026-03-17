"use client";

import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { validateComment, sanitizeComment } from "@/lib/utils/validation";

interface CommentFormProps {
  onSubmit: (text: string) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommentForm({ onSubmit, placeholder = "Add a comment...", autoFocus = false }: CommentFormProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);

  // Reset validation state on interaction
  useEffect(() => {
    if (!isValid) setIsValid(true);
  }, [text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validation = validateComment(text);
    if (!validation.isValid) {
      setIsValid(false);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(text.trim());
      setText("");
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative group">
      <div className={`relative bg-white/10 border transition-all flex items-center overflow-hidden ${
        isValid 
          ? "border-white/10 group-focus-within:border-accent/50 group-focus-within:ring-1 group-focus-within:ring-accent/20" 
          : "border-red-500/50 ring-1 ring-red-500/20"
      }`}>
        <textarea
          ref={textareaRef}
          rows={1}
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => {
            const sanitized = sanitizeComment(e.target.value);
            setText(sanitized);
          }}
          placeholder={placeholder.toUpperCase()}
          className="flex-1 bg-transparent px-2 sm:px-3 py-2 sm:py-3 pr-24 sm:pr-28 text-xs sm:text-sm font-mono text-white focus:outline-none transition-all resize-none placeholder:text-white/40 placeholder:font-mono placeholder:text-[9px] sm:placeholder:text-xs leading-relaxed overflow-hidden align-middle"
        />
          
          <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2">
            <button
              type="submit"
              className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 font-mono text-[7px] sm:text-[8px] font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer border bg-accent/10 border-accent/20 text-accent hover:bg-accent hover:text-black`}
            >
              {isSubmitting ? (
                <Loader2 className="w-2.5 sm:w-3 h-2.5 sm:h-3 animate-spin" />
              ) : (
                "COMMENT"
              )}
            </button>
          </div>
      </div>
    </form>
  );
}
