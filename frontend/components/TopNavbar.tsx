"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Search, 
  ChevronDown, 
  LogOut, 
  User, 
  Compass, 
  Users, 
  Calendar,
  Command
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function TopNavbar() {
  const { user, userProfile, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const profile = userProfile?.profile;

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        } else {
          searchInputRef.current?.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItems = [
    { label: "Explore", href: "/feed", icon: Compass },
    { label: "Collab", href: "/collab", icon: Users },
    { label: "Events", href: "/events", icon: Calendar },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-[1440px] mx-auto h-20 px-6 flex items-center justify-between gap-8">
        
        {/* Left Section: Logo & Nav */}
        <div className="flex items-center gap-12">
          <Link href="/feed" className="flex items-center gap-3 group shrink-0">
            <div className="w-4 h-4 bg-accent rotate-45 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-xl font-black tracking-tighter uppercase font-(family-name:--font-space-grotesk) mt-1">
              C—CANVAS
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all duration-300
                  ${pathname === item.href 
                    ? "text-accent border-b-2 border-accent" 
                    : "text-text-secondary hover:text-white hover:bg-white/5"}
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right Section: Search & Profile */}
        <div className="flex items-center gap-6 flex-1 justify-end">
          
          {/* Search Bar */}
          <div className="relative w-fit hidden md:block group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-text-secondary group-focus-within:text-accent transition-colors" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search "
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border px-10 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-accent/50 transition-all placeholder:text-text-secondary/50 rounded-none"
            />
            {!searchQuery && (
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <div className="flex items-center gap-1 px-1.5 py-0.5 border border-border bg-background rounded text-[10px] font-mono text-text-secondary">
                  <Command className="w-3 h-3" /> + 
                  <span>K</span>
                </div>
              </div>
            )}
          </div>

          {/* Profile Block */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-4 p-2 transition-all cursor-pointer group ${isDropdownOpen ? 'bg-white/5' : 'hover:bg-white/5'}`}
            >
              <div className="flex-col items-end text-right hidden sm:flex">
                <span className="text-[11px] font-black text-white uppercase tracking-tight leading-none">
                  {profile?.name || "ANONYMOUS"}
                </span>
                <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest mt-1">
                  @{profile?.username || "identity"}
                </span>
              </div>
              <div className="w-10 h-10 border border-border bg-background overflow-hidden shrink-0 transition-colors">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-accent/10 text-accent font-bold text-xs font-mono uppercase">
                    {(profile?.name?.[0] || profile?.username?.[0] || "U")}
                  </div>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ 
                    height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.2, ease: "linear" }
                  }}
                  className="absolute right-0 mt-4 w-full min-w-[200px] border border-border bg-background/80 backdrop-blur-xl shadow-2xl z-50 origin-top-right overflow-hidden shadow-black/80"
                >
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent/40"></div>
                  
                  <div className="p-2 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        router.push("/profile");
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-accent hover:text-black transition-all group/item"
                    >
                      <User className="w-4 h-4" />
                      View Identity
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setIsDropdownOpen(false);
                        router.push("/login");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      Terminate Session
                    </button>
                  </div>

                  <div className="border-t border-border p-3 bg-background/50">
                    <div className="flex items-center justify-between text-[8px] font-mono text-text-secondary uppercase tracking-[0.2em] font-bold">
                       <span>STATUS</span>
                       <span className="text-accent animate-pulse">ACTIVE</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}
