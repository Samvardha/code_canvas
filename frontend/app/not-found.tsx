"use client";

import { MoveLeft, MoveRight } from "lucide-react";
import { Button } from "@/components/Button";
import { motion, Variants } from "framer-motion";

export default function NotFound({ profile = false }: { profile?: boolean } = {}) {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <main className="min-h-screen bg-background relative flex flex-col items-center justify-center p-6 border-b border-border">
      <div className="absolute inset-0 grid-bg pointer-events-none z-0" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto text-center relative z-10 mb-16"
      >
        <motion.div
          variants={item}
          className="flex justify-center items-center gap-4 mb-8"
        >
          <span className="w-12 h-0.5 bg-accent hidden sm:block"></span>
          <span className="text-accent text-xs font-mono uppercase tracking-widest font-bold">
            ERROR 404
          </span>
          <span className="w-12 h-0.5 bg-accent hidden sm:block"></span>
        </motion.div>

        <motion.h1
          variants={item}
          className="text-[4rem] sm:text-5xl lg:text-6xl font-black font-(family-name:--font-space-grotesk) uppercase tracking-tighter text-white mb-8 leading-none"
        >
          {profile ? "PROFILE NOT FOUND" : "NOT FOUND"}
        </motion.h1>

        <motion.p
          variants={item}
          className="text-md sm:text-lg text-text-secondary max-w-2xl mx-auto leading-loose mb-12 tracking-wider"
        >
          {profile 
            ? "The requested profile could not be located in our registry. The developer might not exist or has been removed from the network."
            : "The requested page could not be located in our grid registry. It may have been relocated or completely removed from the network."
          }
        </motion.p>

        <motion.div
          variants={item}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full mx-auto"
        >
          <Button href="/" size="md" variant="primary">
            RETURN TO EXPLORE
            <MoveRight className="w-5 h-5 ml-1" />
          </Button>
          <Button href="/login" size="md" variant="secondary">
            RETURN TO LOGIN
            <MoveRight className="w-5 h-5 ml-1" />
          </Button>
        </motion.div>
      </motion.div>
    </main>
  );
}
