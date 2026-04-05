"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { LogIn, UserPlus } from "lucide-react";

export default function LandingNavbar() {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-border"
    >
      <div className="max-w-350 mx-auto flex h-16 items-center justify-between px-6 lg:px-12">
        <Link href="/" className="flex items-center shrink-0 gap-1">
          <div className="relative w-10 h-10 sm:w-12 sm:h-12">
            <Image
              src="/icons/icon-transparent.png"
              alt="Tech Connect Logo"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-sm sm:text-xl font-black tracking-tighter uppercase font-(family-name:--font-space-grotesk)">
            TECH CONNECT
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link
            href="#features"
            className="text-xs font-semibold uppercase tracking-widest text-text-secondary hover:text-white transition-colors duration-300"
          >
            Features
          </Link>
          <Link
            href="#community"
            className="text-xs font-semibold uppercase tracking-widest text-text-secondary hover:text-white transition-colors duration-300"
          >
            Community
          </Link>
          <Link
            href="#projects"
            className="text-xs font-semibold uppercase tracking-widest text-text-secondary hover:text-white transition-colors duration-300"
          >
            Projects
          </Link>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {/* Desktop Login */}
          <Link
            href="/login"
            className="hidden md:block text-xs font-semibold uppercase tracking-widest text-text-secondary transition-colors duration-300 hover:text-accent"
          >
            Login
          </Link>

          {/* Mobile Login Icon */}
          <Link
            href="/login"
            className="md:hidden flex items-center justify-center p-2 hover:bg-white/5 transition-colors duration-300"
          >
            <LogIn className="w-5 h-5 text-text-secondary hover:text-white" />
          </Link>

          {/* Desktop Sign Up */}
          <Link
            href="/login"
            className="hidden md:flex items-center justify-center px-6 py-2.5 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors duration-300"
          >
            Sign Up
          </Link>

          {/* Mobile Sign Up Icon */}
          <Link
            href="/login"
            className="md:hidden flex items-center justify-center p-2 bg-white hover:bg-accent transition-colors duration-300"
          >
            <UserPlus className="w-5 h-5 text-black" />
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
