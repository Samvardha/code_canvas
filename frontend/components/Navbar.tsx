"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useNotifications } from "@/hooks/useNotifications";
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
  Menu,
  X,
  Bell,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

import { searchUsers, User as SearchUser } from "@/lib/api/users";
import { MenuDropdown } from "./MenuDropdown";
import BadgeIcon from "./BadgeIcon";
import dynamic from "next/dynamic";

const ChatDrawer = dynamic(() => import("./ChatDrawer"), { ssr: false });
const NotificationPanel = dynamic(() => import("./NotificationDrawer"), { ssr: false });

export function Navbar() {
  const { user, userProfile, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const searchParams = useSearchParams();
  const isChatOpen = searchParams.get("chat") === "true";
  const openChatWithUserId = searchParams.get("uid");
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const isNotificationsOpen = searchParams.get("notifications") === "true";
  const { unreadCount: notifUnreadCount } = useNotifications();

  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const profile = userProfile?.profile;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const insideDesktop = desktopDropdownRef.current?.contains(target);
      const insideMobile = mobileDropdownRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) {
        setIsDropdownOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
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

  useEffect(() => {
    (window as any).__openChatWith = (uid: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("chat", "true");
      params.set("uid", uid);
      params.delete("notifications");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };
    return () => {
      delete (window as any).__openChatWith;
    };
  }, [searchParams, pathname, router]);

  const setIsChatOpen = (open: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (open) {
      params.set("chat", "true");
      params.delete("notifications");
      params.delete("uid");
    } else {
      params.delete("chat");
      params.delete("uid");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setIsNotificationsOpen = (open: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (open) {
      params.set("notifications", "true");
      params.delete("chat");
      params.delete("uid");
    } else {
      params.delete("notifications");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const navItems = [
    { label: "Explore", href: "/explore-feed", icon: Compass },
    { label: "Collab", href: "/collab-feed", icon: Users },
    { label: "Events", href: "/events-feed", icon: Calendar },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-360 mx-auto h-20 px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
          <Link
            href="/explore-feed"
            className="flex items-center shrink-0 gap-1"
          >
            <div className="relative w-10 h-10 sm:w-12 sm:h-12">
              <Image
                src="/icons/icon-transparent.png"
                alt="Tech Connect Logo"
                fill
                sizes="48px"
                className="object-contain"
              />
            </div>
            <span className="text-sm sm:text-xl font-black tracking-tighter uppercase font-(family-name:--font-space-grotesk)">
              TECH CONNECT
            </span>
          </Link>

          <div className="w-px h-10 bg-border hidden lg:block" />

          <div className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors duration-200
                  ${
                    pathname === item.href
                      ? "text-accent border-b-2 border-accent"
                      : "text-text-secondary hover:text-white hover:bg-white/10"
                  }
                `}
              >
                {/* <item.icon className="w-4 h-4" /> */}
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-6 flex-1 justify-end">
            <BadgeIcon
              icon={Bell}
              onClick={() => {
                setIsNotificationsOpen(true);
              }}
              unreadCount={notifUnreadCount}
              title="Notifications"
            />
            <BadgeIcon
              icon={MessageSquare}
              onClick={() => {
                setIsChatOpen(true);
              }}
              unreadCount={chatUnreadCount}
              title="Messages"
            />

            {/* Desktop Search */}
            <div
              className="relative w-64 lg:w-68 hidden md:block group transition-all duration-300 ml-2"
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
                      className="p-2 flex flex-col max-h-100 overflow-y-auto hide-scrollbar"
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
                            <div className="w-10 h-10 border border-border bg-background shrink-0 flex items-center justify-center overflow-hidden relative">
                              {resultUser.avatar_url ? (
                                <Image
                                  src={resultUser.avatar_url}
                                  alt={resultUser.username}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
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

            {/* Mobile Search Icon - shown on small screens */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden p-1"
            >
              <Search className="w-5 h-5 text-white" />
            </button>

            {/* Mobile Menu Icon - shown on small screens */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Desktop User Menu (with name and username) */}
            <div className="relative hidden lg:block" ref={desktopDropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-4 p-2 transition-all cursor-pointer group ${isDropdownOpen ? "bg-white/5" : "hover:bg-white/5"}`}
              >
                <div className="flex flex-col items-end text-right">
                  <span className="text-[11px] font-black text-white uppercase tracking-tight leading-none">
                    {profile?.name || "ANONYMOUS"}
                  </span>
                  <span className="text-[9px] font-mono text-text-secondary uppercase tracking-widest mt-1">
                    @{profile?.username || "identity"}
                  </span>
                </div>
                <div className="w-10 h-10 border border-border bg-background overflow-hidden shrink-0 transition-colors relative">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="avatar"
                      fill
                      sizes="40px"
                      className="object-cover"
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

              <MenuDropdown
                isOpen={isDropdownOpen}
                footerLeft="STATUS"
                footerRight="ACTIVE"
                items={[
                  {
                    label: "View Identity",
                    icon: User,
                    onClick: () => {
                      if (profile?.username) {
                        router.push(`/profile/${profile?.username}`);
                      } else {
                        router.push("/");
                      }
                      setIsDropdownOpen(false);
                    },
                  },
                  {
                    label: "Terminate Session",
                    icon: LogOut,
                    onClick: async () => {
                      setIsDropdownOpen(false);
                      try {
                        await logout();
                      } catch (error) {
                        console.error("Logout failed:", error);
                      }
                      router.push("/login");
                    },
                    variant: "danger",
                  },
                ]}
                className="w-64"
              />
            </div>

            {/* Mobile User Menu (profile pic only) */}
            <div className="relative lg:hidden" ref={mobileDropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center transition-all cursor-pointer ${isDropdownOpen ? "bg-white/5" : ""}`}
              >
                <div className="w-7 h-7 border border-border bg-background overflow-hidden shrink-0 transition-colors relative">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="avatar"
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent/10 text-accent font-bold text-xs font-mono uppercase">
                      {profile?.name?.[0] || profile?.username?.[0] || "U"}
                    </div>
                  )}
                </div>
              </button>

              <MenuDropdown
                isOpen={isDropdownOpen}
                footerLeft="STATUS"
                footerRight="ACTIVE"
                items={[
                  {
                    label: "View Identity",
                    icon: User,
                    onClick: () => {
                      if (profile?.username) {
                        router.push(`/profile/${profile?.username}`);
                      } else {
                        router.push("/");
                      }
                      setIsDropdownOpen(false);
                    },
                  },
                  {
                    label: "Terminate Session",
                    icon: LogOut,
                    onClick: async () => {
                      setIsDropdownOpen(false);
                      try {
                        await logout();
                      } catch (error) {
                        console.error("Logout failed:", error);
                      }
                      router.push("/login");
                    },
                    variant: "danger",
                  },
                ]}
                className="w-56"
              />
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed top-20 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border"
          >
            <div className="max-w-360 mx-auto px-4 py-4">
              <div className="relative w-full group" ref={searchContainerRef}>
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
                    searchQuery.trim().length >= 2 &&
                    setShowSearchDropdown(true)
                  }
                  className={`w-full bg-surface border border-border pl-10 ${searchQuery ? "pr-4" : "pr-4"} py-2.5 text-xs font-mono text-white focus:outline-none focus:border-accent/50 transition-all placeholder:text-text-secondary/50 rounded-none shadow-inner`}
                />

                <AnimatePresence>
                  {showSearchDropdown && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="absolute top-full left-0 right-0 mt-2 border border-border bg-background/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div
                        ref={scrollRef}
                        onScroll={handleSearchScroll}
                        className="p-2 flex flex-col max-h-75 overflow-y-auto hide-scrollbar"
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
                                setIsSearchOpen(false);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-border/50 last:border-none group/item"
                            >
                              <div className="w-8 h-8 border border-border bg-background shrink-0 flex items-center justify-center overflow-hidden relative">
                                {resultUser.avatar_url ? (
                                  <Image
                                    src={resultUser.avatar_url}
                                    alt={resultUser.username}
                                    fill
                                    sizes="32px"
                                    className="object-cover"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu - shown below navbar when hamburger is clicked */}
      <div ref={mobileMenuRef}>
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed top-20 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border"
            >
              <div className="max-w-360 mx-auto px-4 py-4 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                    flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-300
                    ${
                      pathname === item.href
                        ? "text-accent bg-accent/10 border border-accent/50"
                        : "text-text-secondary"
                    }
                  `}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        openWithUserId={openChatWithUserId}
        onSelectUser={(uid) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("chat", "true");
          params.set("uid", uid);
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        onBackToList={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("chat", "true");
          params.delete("uid");
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        onUnreadCountChange={setChatUnreadCount}
      />

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </>
  );
}