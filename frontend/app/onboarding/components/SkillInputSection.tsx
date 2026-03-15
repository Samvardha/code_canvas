"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface SkillInputSectionProps {
  skills: string[];
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
}

export function SkillInputSection({
  skills,
  onAddSkill,
  onRemoveSkill,
}: SkillInputSectionProps) {
  const [skillInput, setSkillInput] = useState("");

  const handleAdd = () => {
    if (skillInput.trim()) {
      onAddSkill(skillInput.trim().toUpperCase());
      setSkillInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
        Skills <span className="text-accent">*</span>
      </label>
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder="Add skills (React, Python, etc.)"
          value={skillInput}
          onChange={(e) => {
            const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
            setSkillInput(val);
          }}
          onKeyDown={handleKeyDown}
          className="w-full bg-background border border-border px-4 py-3 pr-12 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!skillInput.trim()}
          className="absolute right-2 p-1.5 bg-border hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <AnimatePresence>
          {skills.map((skill) => (
            <motion.span
              key={skill}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-accent/10 border border-accent/30 text-accent px-3 py-1.5 text-[10px] font-mono font-bold flex items-center gap-2"
            >
              {skill}
              <button
                type="button"
                onClick={() => onRemoveSkill(skill)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
