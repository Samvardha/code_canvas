"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
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
      {showNavbar && <Navbar />}
      {children}
    </>
  );
}
