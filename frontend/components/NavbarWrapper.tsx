"use client";

import { usePathname } from "next/navigation";
import { TopNavbar } from "./TopNavbar";
import { useAuth } from "@/contexts/AuthContext";

export function NavbarWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profileComplete } = useAuth();

  const showNavbar = user && profileComplete && (
    pathname.startsWith("/feed") || 
    pathname.startsWith("/profile") || 
    pathname.startsWith("/collab") || 
    pathname.startsWith("/events")
  );

  return (
    <>
      {showNavbar && <TopNavbar />}
      {children}
    </>
  );
}
