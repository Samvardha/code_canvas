"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { useAuth } from "@/contexts/AuthContext";

export function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profileComplete } = useAuth();

  const showNavbar =
    user &&
    profileComplete &&
    (pathname.startsWith("/explore-feed") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/collab-feed") ||
      pathname.startsWith("/events-feed") ||
      pathname.startsWith("/posts"));

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
}
