"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Search,
  ChevronDown,
  LogOut,
  User,
  Compass,
  Users,
  Calendar,
  Command,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchUsers, User as SearchUser } from "@/lib/api/users";

export function Navbar() {
  const { user, userProfile, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const profile = userProfile?.profile;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  useEffect(() => {
    if (debouncedSearchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsLoading(false);
      setShowSearchDropdown(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setSearchError("");
      setShowSearchDropdown(true);
      setOffset(0);

      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const idToken = await user.getIdToken();
        const data = await searchUsers(
          debouncedSearchQuery.trim(),
          idToken,
          0,
          10,
        );
        setSearchResults(data.users);
        setHasMore(data.has_more);
      } catch (err) {
        setSearchError("Search failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, user]);

  const loadMoreResults = async () => {
    if (isLoadingMore || !hasMore || !user) return;

    setIsLoadingMore(true);
    const newOffset = offset + 10;

    try {
      const idToken = await user.getIdToken();
      const data = await searchUsers(
        debouncedSearchQuery.trim(),
        idToken,
        newOffset,
        10,
      );
      setSearchResults((prev) => [...prev, ...data.users]);
      setHasMore(data.has_more);
      setOffset(newOffset);
    } catch (err) {
      console.error("Load more results failed", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSearchScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight + 50 &&
      hasMore &&
      !isLoadingMore
    ) {
      loadMoreResults();
    }
  };

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
    { label: "Explore", href: "/explore-feed", icon: Compass },
    { label: "Collab", href: "/collab-feed", icon: Users },
    { label: "Events", href: "/events-feed", icon: Calendar },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-[1440px] mx-auto h-20 px-6 flex items-center justify-between gap-8">
        <div className="flex items-center gap-12">
          <Link
            href="/explore-feed"
            className="flex items-center gap-3 group shrink-0"
          >
            <div className="w-4 h-4 bg-accent rotate-45 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-xl font-black tracking-tighter uppercase font-(family-name:--font-space-grotesk) mt-1">
              TECH CONNECT
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all duration-300
                  ${
                    pathname === item.href
                      ? "text-accent border-b-2 border-accent"
                      : "text-text-secondary hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6 flex-1 justify-end">
          <div
            className="relative w-64 lg:w-68 hidden md:block group transition-all duration-300"
            ref={searchContainerRef}
          >
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-text-secondary group-focus-within:text-accent transition-colors" />
              )}
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() =>
                searchQuery.trim().length >= 2 && setShowSearchDropdown(true)
              }
              className={`w-full bg-surface border border-border pl-10 ${searchQuery ? "pr-4" : "pr-16"} py-2.5 text-xs font-mono text-white focus:outline-none focus:border-accent/50 transition-all placeholder:text-text-secondary/50 rounded-none shadow-inner`}
            />
            {!searchQuery && (
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <div className="flex items-center gap-1 px-1.5 py-0.5 border border-border bg-background rounded text-[9px] font-mono text-text-secondary">
                  <Command className="w-2.5 h-2.5" /> +<span>K</span>
                </div>
              </div>
            )}

            <AnimatePresence>
              {showSearchDropdown && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="absolute top-full left-0 w-full mt-2 border border-border bg-background/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
                >
                  <div
                    ref={scrollRef}
                    onScroll={handleSearchScroll}
                    className="p-2 flex flex-col max-h-[400px] overflow-y-auto hide-scrollbar"
                  >
                    {isLoading && searchResults.length === 0 ? (
                      <div className="p-4 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                        Initializing search...
                      </div>
                    ) : searchError ? (
                      <div className="p-4 text-center text-[10px] font-mono text-red-500 uppercase tracking-widest">
                        {searchError}
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((resultUser) => (
                        <button
                          key={resultUser.firebase_uid}
                          onClick={() => {
                            router.push(`/profile/${resultUser.username}`);
                            setShowSearchDropdown(false);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center gap-4 p-3 hover:bg-white/5 transition-colors text-left border-b border-border/50 last:border-none group/item"
                        >
                          <div className="w-10 h-10 border border-border bg-background shrink-0 flex items-center justify-center overflow-hidden">
                            {resultUser.avatar_url ? (
                              <img
                                src={resultUser.avatar_url}
                                alt={resultUser.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-mono text-accent">
                                {(
                                  resultUser.username?.[0] || "?"
                                ).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white uppercase truncate group-hover/item:text-accent transition-colors">
                              {resultUser.username}
                            </span>
                            <span className="text-[10px] font-mono text-text-secondary truncate">
                              {resultUser.display_name ||
                                resultUser.bio ||
                                "No description"}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      !isLoading && (
                        <div className="p-4 text-center text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                          No users found for &apos;{searchQuery}&apos;
                        </div>
                      )
                    )}
                    {isLoadingMore && (
                      <div className="p-4 flex justify-center">
                        <Loader2 className="w-4 h-4 text-accent animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border p-2 bg-background/50">
                    <div className="flex items-center justify-between text-[8px] font-mono text-text-secondary uppercase tracking-widest px-2">
                      <span>RESULTS: {searchResults.length}</span>
                      <span className="text-accent">QUERIED</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-4 p-2 transition-all cursor-pointer group ${isDropdownOpen ? "bg-white/5" : "hover:bg-white/5"}`}
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
                    {profile?.name?.[0] || profile?.username?.[0] || "U"}
                  </div>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.2, ease: "linear" },
                  }}
                  className="absolute right-0 mt-4 w-full min-w-[200px] border border-border bg-background/80 backdrop-blur-xl shadow-2xl z-50 origin-top-right overflow-hidden shadow-black/80"
                >
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent/40"></div>

                  <div className="p-2 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        if (profile?.username) {
                          router.push(`/profile/${profile?.username}`);
                        } else {
                          router.push("/");
                        }
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
