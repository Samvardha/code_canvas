"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ValidationKey,
  EventMeta,
  formatAlphanumeric,
  formatTextInput,
  formatUrlChars,
  formatAlphaOnly,
} from "../utils";

interface EventFieldsProps {
  eventMeta: EventMeta;
  setEventMeta: React.Dispatch<React.SetStateAction<EventMeta>>;
  showModeDropdown: boolean;
  setShowModeDropdown: (show: boolean) => void;
  validationErrors: ValidationKey[];
  clearError: (id: ValidationKey) => void;
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationKey[]>>;
  editId: string | null;
  modeDropdownRef: React.RefObject<HTMLDivElement | null>;
}

export const EventFields = ({
  eventMeta,
  setEventMeta,
  showModeDropdown,
  setShowModeDropdown,
  validationErrors,
  clearError,
  setValidationErrors,
  editId,
  modeDropdownRef,
}: EventFieldsProps) => {
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
            EVENT_METADATA
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 col-span-full">
              <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                Event_Title
              </label>
              <input
                type="text"
                value={eventMeta.title}
                onFocus={() => clearError("event_title")}
                onChange={(e) => {
                  let val = formatAlphanumeric(e.target.value);
                  val = formatTextInput(val);
                  setEventMeta({
                    ...eventMeta,
                    title: val,
                  });
                  clearError("event_title");
                }}
                className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                  validationErrors.includes("event_title") ? "border-red-500/50" : "border-border"
                }`}
                placeholder="E.G. TECH_SUMMIT_2024"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                RSVP_URL
              </label>
              <input
                type="url"
                value={eventMeta.rsvp_url}
                onFocus={() => clearError("event_rsvp")}
                onChange={(e) => {
                  const val = formatUrlChars(e.target.value);
                  setEventMeta({
                    ...eventMeta,
                    rsvp_url: val,
                  });
                  clearError("event_rsvp");
                }}
                className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                  validationErrors.includes("event_rsvp") ? "border-red-500/50" : "border-border"
                }`}
                placeholder="https://event.link/register"
              />
            </div>

            <div className="relative" ref={modeDropdownRef}>
              <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest block">
                Mode
              </label>
              <button
                type="button"
                onClick={() => !editId && setShowModeDropdown(!showModeDropdown)}
                disabled={!!editId}
                className={`w-full bg-background/30 border p-4 text-sm font-mono text-white flex items-center justify-between hover:border-accent/40 transition-colors mt-4 cursor-pointer ${
                  !!editId ? "opacity-50 cursor-not-allowed border-border/50" : ""
                } border-border`}
              >
                <span className="uppercase">{eventMeta.mode}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showModeDropdown ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showModeDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 z-30 w-full mt-2 bg-[#0A0A0A] border border-border shadow-2xl overflow-hidden"
                  >
                    <div className="max-h-60 overflow-y-auto hide-scrollbar">
                      {["online", "offline"].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setEventMeta({
                              ...eventMeta,
                              mode,
                            });
                            setShowModeDropdown(false);
                            if (mode === "online") {
                              setValidationErrors((prev) =>
                                prev.filter(
                                  (e) =>
                                    e !== "event_address" &&
                                    e !== "event_city" &&
                                    e !== "event_state" &&
                                    e !== "event_pincode",
                                ),
                              );
                            }
                          }}
                          className={`w-full text-left p-4 text-xs font-mono uppercase transition-colors hover:bg-white/5 cursor-pointer ${
                            eventMeta.mode === mode ? "text-accent bg-accent/5" : "text-text-secondary"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                Start_At
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={eventMeta.start_at}
                onFocus={() => clearError("event_start")}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "");
                  if (val.length > 8) val = val.slice(0, 8);
                  let formatted = val;
                  if (val.length > 2) {
                    formatted = val.slice(0, 2) + "/" + val.slice(2);
                  }
                  if (val.length > 4) {
                    formatted = formatted.slice(0, 5) + "/" + val.slice(4);
                  }
                  setEventMeta({
                    ...eventMeta,
                    start_at: formatted,
                  });
                  clearError("event_start");
                }}
                className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                  validationErrors.includes("event_start") ? "border-red-500/50" : "border-border"
                }`}
                placeholder="DD/MM/YYYY"
              />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                End_At
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={eventMeta.end_at}
                onFocus={() => clearError("event_end")}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "");
                  if (val.length > 8) val = val.slice(0, 8);
                  let formatted = val;
                  if (val.length > 2) {
                    formatted = val.slice(0, 2) + "/" + val.slice(2);
                  }
                  if (val.length > 4) {
                    formatted = formatted.slice(0, 5) + "/" + val.slice(4);
                  }
                  setEventMeta({
                    ...eventMeta,
                    end_at: formatted,
                  });
                  clearError("event_end");
                }}
                className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                  validationErrors.includes("event_end") ? "border-red-500/50" : "border-border"
                }`}
                placeholder="DD/MM/YYYY"
              />
            </div>

            {eventMeta.mode === "offline" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 col-span-full">
                <div className="space-y-4">
                  <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                    Venue_Address
                  </label>
                  <input
                    type="text"
                    value={eventMeta.venue.address}
                    onFocus={() => clearError("event_address")}
                    onChange={(e) => {
                      const val = formatTextInput(e.target.value);
                      setEventMeta({
                        ...eventMeta,
                        venue: {
                          ...eventMeta.venue,
                          address: val,
                        },
                      });
                      clearError("event_address");
                    }}
                    className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                      validationErrors.includes("event_address") ? "border-red-500/50" : "border-border"
                    }`}
                    placeholder="STREET_OR_BUILDING"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                    City
                  </label>
                  <input
                    type="text"
                    value={eventMeta.venue.city}
                    onFocus={() => clearError("event_city")}
                    onChange={(e) => {
                      let val = formatAlphaOnly(e.target.value);
                      val = formatTextInput(val);
                      setEventMeta({
                        ...eventMeta,
                        venue: {
                          ...eventMeta.venue,
                          city: val,
                        },
                      });
                      clearError("event_city");
                    }}
                    className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                      validationErrors.includes("event_city") ? "border-red-500/50" : "border-border"
                    }`}
                    placeholder="CITY_NAME"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                    State
                  </label>
                  <input
                    type="text"
                    value={eventMeta.venue.state}
                    onFocus={() => clearError("event_state")}
                    onChange={(e) => {
                      let val = formatAlphaOnly(e.target.value);
                      val = formatTextInput(val);
                      setEventMeta({
                        ...eventMeta,
                        venue: {
                          ...eventMeta.venue,
                          state: val,
                        },
                      });
                      clearError("event_state");
                    }}
                    className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                      validationErrors.includes("event_state") ? "border-red-500/50" : "border-border"
                    }`}
                    placeholder="STATE/PROVINCE"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={eventMeta.venue.pincode}
                    onFocus={() => clearError("event_pincode")}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                      setEventMeta({
                        ...eventMeta,
                        venue: {
                          ...eventMeta.venue,
                          pincode: val,
                        },
                      });
                      clearError("event_pincode");
                    }}
                    className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                      validationErrors.includes("event_pincode") ? "border-red-500/50" : "border-border"
                    }`}
                    placeholder="ZIP/POSTAL_CODE"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
