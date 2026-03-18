"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { ValidationKey, CollabMeta, formatAlphanumeric, formatTextInput } from "../utils";

interface CollabFieldsProps {
  collabMeta: CollabMeta;
  setCollabMeta: React.Dispatch<React.SetStateAction<CollabMeta>>;
  lookingForInput: string;
  setLookingForInput: (val: string) => void;
  requirementsInput: string;
  setRequirementsInput: (val: string) => void;
  addTag: (field: "looking_for" | "requirements") => void;
  removeTag: (field: "looking_for" | "requirements", index: number) => void;
  validationErrors: ValidationKey[];
  clearError: (id: ValidationKey) => void;
}

export const CollabFields = ({
  collabMeta,
  setCollabMeta,
  lookingForInput,
  setLookingForInput,
  requirementsInput,
  setRequirementsInput,
  addTag,
  removeTag,
  validationErrors,
  clearError,
}: CollabFieldsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="space-y-4 pt-4 border-t border-border/50">
        <div className="p-6 bg-white/3 border border-white/10 space-y-6">
          <h3 className="text-[11px] font-mono font-black text-accent uppercase tracking-widest">
            COLLABORATION_METADATA
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 col-span-full">
              <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                Project_Title
              </label>
              <input
                type="text"
                value={collabMeta.title}
                onFocus={() => clearError("collab_title")}
                onChange={(e) => {
                  let val = formatAlphanumeric(e.target.value);
                  val = formatTextInput(val);
                  setCollabMeta({
                    ...collabMeta,
                    title: val,
                  });
                  clearError("collab_title");
                }}
                className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                  validationErrors.includes("collab_title") ? "border-red-500/50" : "border-border"
                }`}
                placeholder="E.G. AI_POWERED_MARKETPLACE"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                Duration
              </label>
              <div className="relative mt-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={collabMeta.duration}
                  onFocus={() => clearError("collab_duration")}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setCollabMeta({
                      ...collabMeta,
                      duration: val,
                    });
                    clearError("collab_duration");
                  }}
                  className={`w-full bg-background/30 border p-4 pr-20 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors ${
                    validationErrors.includes("collab_duration") ? "border-red-500/50" : "border-border"
                  }`}
                  placeholder="0"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-text-secondary/50 pointer-events-none uppercase">
                  MONTHS
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                Looking_For
              </label>
              <div className="space-y-3 mt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={lookingForInput}
                    onFocus={() => clearError("collab_looking_for")}
                    onChange={(e) => {
                      setLookingForInput(e.target.value.replace(/[^a-zA-Z0-9 ]/g, "").replace(/  +/g, " ").toUpperCase());
                      clearError("collab_looking_for");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag("looking_for");
                        clearError("collab_looking_for");
                      }
                    }}
                    className={`flex-1 bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors ${
                      validationErrors.includes("collab_looking_for") ? "border-red-500/50" : "border-border"
                    }`}
                    placeholder="E.G. BACKEND DEV"
                  />
                  <button
                    type="button"
                    onClick={() => addTag("looking_for")}
                    className="bg-white/5 border border-white/10 text-white/50 px-4 hover:bg-white/10 hover:border-white/20 transition-colors cursor-pointer"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {collabMeta.looking_for.map((tag, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-sm"
                    >
                      <span className="text-[11px] font-mono font-bold text-white/70">
                        {tag}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTag("looking_for", idx)}
                        className="text-white/30 hover:text-white transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 col-span-full">
              <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                Requirements
              </label>
              <div className="space-y-3 mt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={requirementsInput}
                    onFocus={() => clearError("collab_requirements")}
                    onChange={(e) => {
                      setRequirementsInput(e.target.value.replace(/[^a-zA-Z0-9 ]/g, "").replace(/  +/g, " ").toUpperCase());
                      clearError("collab_requirements");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag("requirements");
                        clearError("collab_requirements");
                      }
                    }}
                    className={`flex-1 bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors ${
                      validationErrors.includes("collab_requirements") ? "border-red-500/50" : "border-border"
                    }`}
                    placeholder="E.G. REACT NATIVE"
                  />
                  <button
                    type="button"
                    onClick={() => addTag("requirements")}
                    className="bg-white/5 border border-white/10 text-white/50 px-4 hover:bg-white/10 hover:border-white/20 transition-colors cursor-pointer"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {collabMeta.requirements.map((tag, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-sm"
                    >
                      <span className="text-[11px] font-mono font-bold text-white/70">
                        {tag}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTag("requirements", idx)}
                        className="text-white/30 hover:text-white transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
